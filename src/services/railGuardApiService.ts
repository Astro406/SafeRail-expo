import { LocalStorageService } from './localStorageService';
import { AppConstants } from '../constants/AppConstants';
import { RailGuardAlertModel } from '../types';

export class RailGuardApiException extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'RailGuardApiException';
    this.statusCode = statusCode;
  }
}

export class RailGuardTimeoutException extends RailGuardApiException {
  constructor(message: string) {
    super(message);
    this.name = 'RailGuardTimeoutException';
  }
}

export class RailGuardAuthException extends RailGuardApiException {
  constructor(message: string, statusCode: number = 401) {
    super(message, statusCode);
    this.name = 'RailGuardAuthException';
  }
}

export class RailGuardForbiddenException extends RailGuardApiException {
  constructor(message: string, statusCode: number = 403) {
    super(message, statusCode);
    this.name = 'RailGuardForbiddenException';
  }
}

export class RailGuardServerException extends RailGuardApiException {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
    this.name = 'RailGuardServerException';
  }
}

export class RailGuardNetworkException extends RailGuardApiException {
  constructor(message: string) {
    super(message);
    this.name = 'RailGuardNetworkException';
  }
}

export class RailGuardFormatException extends RailGuardApiException {
  constructor(message: string) {
    super(message);
    this.name = 'RailGuardFormatException';
  }
}

export interface AuthTokenProvider {
  getIdToken: () => Promise<string | null>;
}

export class RailGuardApiService {
  private storage: LocalStorageService;
  private authProvider?: AuthTokenProvider;
  private requestTimeoutMs: number;

  static readonly defaultBaseUrl = AppConstants.defaultRailGuardBackendUrl;

  static async checkHealth(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${url.trim().replace(/\/+$/, '')}/ready`, {
        signal: controller.signal,
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  constructor(
    storage: LocalStorageService,
    authProvider?: AuthTokenProvider,
    requestTimeoutMs: number = 35000
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
    return RailGuardApiService.defaultBaseUrl;
  }

  private async buildHeaders(tokenOverride?: string): Promise<Record<string, string>> {
    let effectiveToken = tokenOverride;
    if (!effectiveToken && this.authProvider) {
      effectiveToken = (await this.authProvider.getIdToken()) || undefined;
    }

    if (!effectiveToken || effectiveToken.trim().length === 0) {
      throw new RailGuardAuthException(
        'User is not signed in. Please sign in with Firebase to access operator endpoints.',
        401
      );
    }

    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${effectiveToken.trim()}`,
    };
  }

  /**
   * Check backend liveness and storage status: GET /health
   */
  async checkHealth(options?: { overrideUrl?: string }): Promise<{
    success: boolean;
    status?: string;
    version?: string;
    persistence?: string;
    disclaimer?: string;
    message?: string;
  }> {
    const target = (options?.overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const url = `${target}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const decoded = await res.json();
        return {
          success: true,
          status: decoded.status,
          version: decoded.version,
          persistence: decoded.persistence || 'Firebase Realtime Database',
          disclaimer: decoded.disclaimer,
        };
      }
      const text = await res.text();
      return {
        success: false,
        message: `HTTP ${res.status}: ${text}`,
      };
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        return { success: false, message: `Connection timed out to ${target} (server waking up?)` };
      }
      return { success: false, message: `Socket/Network error: ${e.message || e}` };
    }
  }

  /**
   * Check database and dependency readiness: GET /ready
   */
  async checkReadiness(options?: { overrideUrl?: string }): Promise<{
    ready: boolean;
    rtdb_connected?: boolean;
    firestore_connected?: boolean;
    project_id?: string;
    database_url?: string;
    alerts_path?: string;
    collection?: string;
    message?: string;
    error?: string;
    status_code?: number;
  }> {
    const target = (options?.overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const url = `${target}/ready`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const decoded = await res.json();
        const isRtdb = decoded.rtdb_connected === true;
        const isFirestore = decoded.firestore_connected === true;
        return {
          ready: true,
          rtdb_connected: isRtdb,
          firestore_connected: isFirestore || isRtdb,
          project_id: decoded.project_id,
          database_url: decoded.database_url,
          alerts_path: decoded.alerts_path,
          collection: decoded.collection || decoded.alerts_path,
        };
      }
      const text = await res.text();
      return {
        ready: false,
        status_code: res.status,
        message: text,
      };
    } catch (e: any) {
      clearTimeout(timeoutId);
      return { ready: false, error: e.message || String(e) };
    }
  }

  async fetchRecentAlerts(options?: {
    limit?: number;
    unreviewedOnly?: boolean;
    status?: string | null;
  }): Promise<RailGuardAlertModel[]> {
    return this.getAlerts(options);
  }

  async submitReview(params: {
    alertId: string | number;
    reviewStatus: 'verified' | 'false_alarm';
    notes?: string;
  }): Promise<RailGuardAlertModel> {
    return this.reviewAlert(params.alertId, params.reviewStatus);
  }

  async getAlerts(options?: {
    limit?: number;
    unreviewedOnly?: boolean;
    status?: string | null;
    overrideUrl?: string;
    customTimeoutMs?: number;
  }): Promise<RailGuardAlertModel[]> {
    const { limit = 50, unreviewedOnly = false, status, overrideUrl, customTimeoutMs } = options || {};
    const target = (overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');

    const queryParams = new URLSearchParams();
    queryParams.append('limit', String(limit));
    if (unreviewedOnly) queryParams.append('unreviewed_only', 'true');
    if (status && status.toLowerCase() !== 'all') {
      queryParams.append('status', status);
    }

    const url = `${target}/api/alerts?${queryParams.toString()}`;
    const headers = await this.buildHeaders();
    const effectiveTimeout = customTimeoutMs || this.requestTimeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        try {
          const list = await res.json();
          if (Array.isArray(list)) {
            return list.map((item: any) => this.mapToAlertModel(item));
          }
          return [];
        } catch (e: any) {
          throw new RailGuardFormatException(`Malformed response parsing alerts: ${e.message}`);
        }
      } else if (res.status === 401) {
        throw new RailGuardAuthException(
          'Session expired or unauthorized (HTTP 401). Please sign in again.',
          401
        );
      } else if (res.status === 403) {
        throw new RailGuardForbiddenException(
          'Forbidden (HTTP 403). You do not have permission to view alerts.',
          403
        );
      } else if (res.status >= 500) {
        throw new RailGuardServerException(
          `Backend server error (HTTP ${res.status}). Service may be waking up or experiencing issues.`,
          res.status
        );
      } else {
        throw new RailGuardApiException(`Failed to load alerts: HTTP ${res.status}`, res.status);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e instanceof RailGuardApiException) throw e;
      if (e.name === 'AbortError') {
        throw new RailGuardTimeoutException(
          `Connection timed out (${Math.round(effectiveTimeout / 1000)}s). Render server may be waking up from idle. Please tap Retry.`
        );
      }
      throw new RailGuardNetworkException(`Network error connecting to backend: ${e.message || e}`);
    }
  }

  /**
   * Retrieve single alert details: GET /api/alerts/{id}
   */
  async getAlertDetail(alertId: string | number, options?: { overrideUrl?: string }): Promise<RailGuardAlertModel> {
    const target = (options?.overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const url = `${target}/api/alerts/${alertId}`;
    const headers = await this.buildHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const decoded = await res.json();
        return this.mapToAlertModel(decoded);
      } else if (res.status === 401) {
        throw new RailGuardAuthException('Session expired or unauthorized (HTTP 401). Please sign in again.');
      } else if (res.status === 403) {
        throw new RailGuardForbiddenException('Forbidden (HTTP 403). You do not have permission to view this alert.');
      } else if (res.status === 404) {
        throw new RailGuardApiException('Alert not found (HTTP 404).', 404);
      } else if (res.status >= 500) {
        throw new RailGuardServerException(`Backend server error (HTTP ${res.status}).`);
      } else {
        throw new RailGuardApiException(`Failed to load alert details: HTTP ${res.status}`, res.status);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e instanceof RailGuardApiException) throw e;
      if (e.name === 'AbortError') {
        throw new RailGuardTimeoutException('Connection timed out loading alert details.');
      }
      throw new RailGuardNetworkException(`Network error: ${e.message || e}`);
    }
  }

  /**
   * Submit operator review: PATCH /api/alerts/{id}/review
   */
  async reviewAlert(
    alertId: string | number,
    reviewStatus: 'verified' | 'false_alarm',
    options?: { overrideUrl?: string }
  ): Promise<RailGuardAlertModel> {
    if (reviewStatus !== 'verified' && reviewStatus !== 'false_alarm') {
      throw new Error(`Invalid reviewStatus '${reviewStatus}'. Must be either 'verified' or 'false_alarm'.`);
    }

    const target = (options?.overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const url = `${target}/api/alerts/${alertId}/review`;
    const headers = await this.buildHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ review_status: reviewStatus }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const decoded = await res.json();
        return this.mapToAlertModel(decoded);
      } else if (res.status === 401) {
        throw new RailGuardAuthException('Session expired or unauthorized (HTTP 401). Please sign in again.');
      } else if (res.status === 403) {
        throw new RailGuardForbiddenException('Forbidden (HTTP 403). You do not have permission to submit reviews.');
      } else if (res.status === 404) {
        throw new RailGuardApiException('Alert not found (HTTP 404).', 404);
      } else if (res.status >= 500) {
        throw new RailGuardServerException(`Backend server error (HTTP ${res.status}).`);
      } else {
        throw new RailGuardApiException(`Failed to update review status: HTTP ${res.status}`, res.status);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e instanceof RailGuardApiException) throw e;
      if (e.name === 'AbortError') {
        throw new RailGuardTimeoutException('Connection timed out submitting review. Please retry.');
      }
      throw new RailGuardNetworkException(`Network error submitting review: ${e.message || e}`);
    }
  }

  /**
   * Formats direct URL to fetch snapshot JPEG image with authorization query parameter
   */
  async getSnapshotUrl(alertId: string | number, options?: { overrideUrl?: string }): Promise<string> {
    const target = (options?.overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const token = await this.authProvider?.getIdToken();
    if (!token || token.trim().length === 0) {
      throw new RailGuardAuthException('User is not signed in. Cannot generate evidence URL.');
    }
    return `${target}/api/alerts/${alertId}/snapshot?token=${encodeURIComponent(token.trim())}`;
  }

  /**
   * Fetches raw snapshot JPEG and returns as base64 data URI for React Native Image component
   */
  async fetchSnapshotBase64(alertId: string | number, options?: { overrideUrl?: string }): Promise<string> {
    const target = (options?.overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const url = `${target}/api/alerts/${alertId}/snapshot`;
    const headers = await this.buildHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else if (res.status === 401) {
        throw new RailGuardAuthException('Unauthorized (HTTP 401): Session expired.');
      } else if (res.status === 404) {
        throw new RailGuardApiException('Snapshot not found (HTTP 404).', 404);
      } else {
        throw new RailGuardApiException(`Failed to load snapshot: HTTP ${res.status}`, res.status);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e instanceof RailGuardApiException) throw e;
      if (e.name === 'AbortError') {
        throw new RailGuardTimeoutException('Connection timed out loading snapshot image.');
      }
      throw new RailGuardNetworkException(`Network error loading snapshot: ${e.message || e}`);
    }
  }

  /**
   * Retrieve running false alarm rate: GET /api/alerts/stats/false-alarm-rate
   */
  async getFalseAlarmRate(options?: { overrideUrl?: string }): Promise<{
    false_alarm_rate: number | null;
    total_reviewed: number;
    false_alarms: number;
  }> {
    const target = (options?.overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const url = `${target}/api/alerts/stats/false-alarm-rate`;

    try {
      const headers = await this.buildHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
      return { false_alarm_rate: null, total_reviewed: 0, false_alarms: 0 };
    } catch {
      return { false_alarm_rate: null, total_reviewed: 0, false_alarms: 0 };
    }
  }

  private mapToAlertModel(json: Record<string, any>): RailGuardAlertModel {
    const rawId = json.id ?? json.event_uid ?? 0;
    const uid = json.event_uid ? String(json.event_uid) : String(rawId);

    return {
      id: rawId,
      eventUid: uid,
      timestamp: json.timestamp ? new Date(json.timestamp).toISOString() : new Date().toISOString(),
      cameraId: json.camera_id ? String(json.camera_id) : 'CAM-01',
      trackId: typeof json.track_id === 'number' ? json.track_id : parseInt(String(json.track_id || 0), 10),
      objectClass: json.object_class ? String(json.object_class) : 'luggage',
      eventDuration: typeof json.event_duration === 'number' ? json.event_duration : parseFloat(String(json.event_duration || 0)),
      reason: json.reason ? String(json.reason) : 'Unattended object condition',
      snapshotUrl: json.snapshot_url ? String(json.snapshot_url) : `/api/alerts/${uid}/snapshot`,
      clipUrl: json.clip_url ? String(json.clip_url) : null,
      reviewStatus: (json.review_status === 'verified' || json.review_status === 'false_alarm')
        ? json.review_status
        : 'unreviewed',
      reviewedBy: json.reviewed_by ? String(json.reviewed_by) : null,
      reviewedAt: json.reviewed_at ? new Date(json.reviewed_at).toISOString() : null,
      clearedTimestamp: json.cleared_timestamp ? new Date(json.cleared_timestamp).toISOString() : null,
      createdAt: json.created_at ? new Date(json.created_at).toISOString() : null,
      disclaimer:
        json.disclaimer ||
        'FOR HUMAN REVIEW ONLY — Does not detect explosives or narcotics. Verify physical context.',
    };
  }
}
