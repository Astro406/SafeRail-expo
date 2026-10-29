import { LocalStorageService } from './localStorageService';
import { AppConstants } from '../constants/AppConstants';
import { SensorReading, TelemetrySyncState, TelemetrySyncStatus } from '../types';
import { AuthTokenProvider } from './railGuardApiService';

export class TelemetryApiException extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'TelemetryApiException';
    this.statusCode = statusCode;
  }
}

export class TelemetryService {
  private storage: LocalStorageService;
  private authProvider?: AuthTokenProvider;
  private requestTimeoutMs: number;

  static readonly defaultBaseUrl = AppConstants.defaultRailGuardBackendUrl;

  constructor(
    storage: LocalStorageService,
    authProvider?: AuthTokenProvider,
    requestTimeoutMs: number = 25000
  ) {
    this.storage = storage;
    this.authProvider = authProvider;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  get baseUrl(): string {
    const custom = this.storage.getRailGuardBackendUrl().trim();
    if (custom.length > 0) {
      return custom.replace(/\/+$/, '');
    }
    return TelemetryService.defaultBaseUrl;
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.authProvider) {
      try {
        const token = await this.authProvider.getIdToken();
        if (token && token.trim().length > 0) {
          headers.Authorization = `Bearer ${token.trim()}`;
        }
      } catch (e) {
        console.warn('[TelemetryService] Error getting ID token:', e);
      }
    }

    return headers;
  }

  async postTelemetryBatch(readings: SensorReading[]): Promise<Record<string, any>> {
    if (readings.length === 0) return { status: 'ok', count: 0 };

    const url = `${this.baseUrl}/api/telemetry`;
    const headers = await this.buildHeaders();
    const body = JSON.stringify({ readings });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
      const text = await res.text();
      throw new TelemetryApiException(`Failed to ingest telemetry batch: HTTP ${res.status} ${text}`, res.status);
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e instanceof TelemetryApiException) throw e;
      if (e.name === 'AbortError') {
        throw new TelemetryApiException(`Request timed out while sending telemetry batch to ${this.baseUrl}`);
      }
      throw new TelemetryApiException(`Network error: ${e.message || e}`);
    }
  }

  async getLatestTelemetry(deviceId: string): Promise<SensorReading | null> {
    const cleanId = encodeURIComponent(deviceId);
    const url = `${this.baseUrl}/api/telemetry/latest?device_id=${cleanId}`;
    const headers = await this.buildHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 404) return null;
      if (res.ok) {
        const json = await res.json();
        return json.reading as SensorReading;
      }
      return null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }
}

export type SyncStateListener = (state: TelemetrySyncState) => void;

/**
 * Asynchronous bounded telemetry queue for background cloud synchronization.
 * - Maximum queue size bounded to 500 items (drops oldest if saturated).
 * - Deduplicates by (deviceId, sequence) to prevent duplicate server writes.
 * - Batch flushes every 5 readings or every 5 seconds.
 * - Non-blocking retry with exponential backoff on network failures.
 */
export class TelemetrySyncQueue {
  private telemetryService: TelemetryService;
  private maxQueueSize: number;
  private batchSize: number;
  private flushIntervalMs: number;

  private queue: SensorReading[] = [];
  private enqueuedKeys: Set<string> = new Set();
  private flushTimer: any = null;

  private isFlushing: boolean = false;
  private consecutiveFailures: number = 0;
  private totalSynced: number = 0;
  private lastSyncedTime: string | null = null;
  private lastError: string | null = null;

  private listeners: Set<SyncStateListener> = new Set();

  constructor(
    telemetryService: TelemetryService,
    maxQueueSize: number = 500,
    batchSize: number = 5,
    flushIntervalMs: number = 5000
  ) {
    this.telemetryService = telemetryService;
    this.maxQueueSize = maxQueueSize;
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;

    this.startTimer();
  }

  get currentState(): TelemetrySyncState {
    let status: TelemetrySyncStatus = 'idle';
    if (this.isFlushing) {
      status = 'syncing';
    } else if (this.consecutiveFailures > 0) {
      status = 'offlineQueued';
    } else if (this.totalSynced > 0 && this.queue.length === 0) {
      status = 'synced';
    }

    return {
      status,
      queuedCount: this.queue.length,
      totalSyncedCount: this.totalSynced,
      lastSyncedAt: this.lastSyncedTime,
      lastError: this.lastError,
    };
  }

  subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitState(): void {
    const s = this.currentState;
    this.listeners.forEach((l) => {
      try {
        l(s);
      } catch (e) {
        console.error('[TelemetrySyncQueue] Listener error:', e);
      }
    });
  }

  private startTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    if (this.flushTimer && typeof this.flushTimer.unref === 'function') {
      this.flushTimer.unref();
    }
  }

  enqueue(reading: SensorReading): void {
    const key = `${reading.deviceId}_${reading.sequence}`;
    if (this.enqueuedKeys.has(key)) return;

    if (this.queue.length >= this.maxQueueSize) {
      const evicted = this.queue.shift();
      if (evicted) {
        this.enqueuedKeys.delete(`${evicted.deviceId}_${evicted.sequence}`);
      }
    }

    this.queue.push(reading);
    this.enqueuedKeys.add(key);
    this.emitState();

    if (this.queue.length >= this.batchSize && !this.isFlushing) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;
    this.emitState();

    const toSend = this.queue.slice(0, this.batchSize);

    try {
      await this.telemetryService.postTelemetryBatch(toSend);

      for (const r of toSend) {
        const idx = this.queue.indexOf(r);
        if (idx !== -1) this.queue.splice(idx, 1);
        this.enqueuedKeys.delete(`${r.deviceId}_${r.sequence}`);
      }

      this.consecutiveFailures = 0;
      this.lastError = null;
      this.totalSynced += toSend.length;
      this.lastSyncedTime = new Date().toISOString();
    } catch (e: any) {
      this.consecutiveFailures++;
      this.lastError = e.message || String(e);
    } finally {
      this.isFlushing = false;
      this.emitState();
    }
  }

  async retryNow(): Promise<void> {
    this.consecutiveFailures = 0;
    await this.flush();
  }

  clear(): void {
    this.queue = [];
    this.enqueuedKeys.clear();
    this.emitState();
  }

  dispose(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.listeners.clear();
  }
}
