import { LocalStorageService } from './localStorageService';
import { PredictionResponse } from '../types';

export class BackendPredictionException extends Error {
  statusCode: number;
  details?: string;

  constructor(message: string, statusCode: number = 0, details?: string) {
    super(message);
    this.name = 'BackendPredictionException';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class PredictionApiService {
  private storage: LocalStorageService;

  constructor(storage: LocalStorageService) {
    this.storage = storage;
  }

  get baseUrl(): string {
    return this.storage.getBackendUrl();
  }

  static async checkHealth(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${url.trim().replace(/\/+$/, '')}/health`, {
        signal: controller.signal,
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Queries GET /health endpoint to verify server status and model readiness
   */
  async checkHealth(options?: { overrideUrl?: string }): Promise<{
    success: boolean;
    status?: string;
    model_loaded?: boolean;
    model_version?: string;
    model_name?: string;
    message?: string;
  }> {
    const targetUrl = (options?.overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const url = `${targetUrl}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const decoded = await response.json();
        return {
          success: true,
          status: decoded.status,
          model_loaded: decoded.model_loaded === true,
          model_version: decoded.model_version || '1.0.0',
          model_name: decoded.model_name || 'RandomForestClassifier',
        };
      } else {
        const text = await response.text();
        return {
          success: false,
          message: `Server responded with HTTP ${response.status}: ${text}`,
        };
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        return {
          success: false,
          message: `Connection timed out connecting to ${targetUrl}`,
        };
      }
      return {
        success: false,
        message: `Failed to connect to backend: ${e.message || e}`,
      };
    }
  }

  /**
   * Sends sensor telemetry readings to POST /predict on the Python backend.
   * Protected with the user's Firebase ID token.
   */
  async predict(params: {
    deviceId: string;
    sequence: number;
    timestamp: Date | string;
    mq2: number;
    mq4: number;
    mq7: number;
    idToken: string;
    overrideUrl?: string;
  }): Promise<PredictionResponse> {
    const { deviceId, sequence, timestamp, mq2, mq4, mq7, idToken, overrideUrl } = params;
    const targetUrl = (overrideUrl || this.baseUrl).trim().replace(/\/+$/, '');
    const url = `${targetUrl}/predict`;

    const isoTimestamp = timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();

    const payload = {
      deviceId,
      sequence,
      timestamp: isoTimestamp,
      sensors: {
        mq2_raw: parseFloat(mq2.toFixed(1)),
        mq4_raw: parseFloat(mq4.toFixed(1)),
        mq7_raw: parseFloat(mq7.toFixed(1)),
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseText = await response.text();

      if (response.ok) {
        const decoded = JSON.parse(responseText);
        return {
          deviceId: decoded.deviceId || 'UNKNOWN-DEVICE',
          sequence: decoded.sequence ?? 0,
          prediction: decoded.prediction || 'nominal',
          label: decoded.label || 'normal_synthetic',
          anomalyScore: typeof decoded.anomalyScore === 'number' ? decoded.anomalyScore : 0.0,
          normalScore: typeof decoded.normalScore === 'number' ? decoded.normalScore : 1.0,
          confidence: typeof decoded.confidence === 'number' ? decoded.confidence : 0.0,
          reviewRequired: decoded.reviewRequired === true,
          modelVersion: decoded.modelVersion || '1.0.0',
          inferenceTimestamp: decoded.inferenceTimestamp || new Date().toISOString(),
          inputFeatures: decoded.inputFeatures || {},
          userId: decoded.userId,
          isAnomaly: decoded.prediction === 'anomaly' || decoded.reviewRequired === true,
        };
      }

      if (response.status === 401) {
        throw new BackendPredictionException(
          'Authentication failed: Invalid or expired Firebase ID token.',
          401,
          responseText
        );
      }

      if (response.status === 422) {
        throw new BackendPredictionException(
          `Telemetry validation rejected by server: ${responseText}`,
          422,
          responseText
        );
      }

      if (response.status === 503) {
        throw new BackendPredictionException(
          'Prediction service unavailable: Model not loaded on server.',
          503,
          responseText
        );
      }

      throw new BackendPredictionException(
        `Backend server error (${response.status}): ${responseText}`,
        response.status,
        responseText
      );
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e instanceof BackendPredictionException) {
        throw e;
      }
      if (e.name === 'AbortError') {
        throw new BackendPredictionException(
          'Prediction request timed out. Python backend did not respond within 5 seconds.',
          408
        );
      }
      throw new BackendPredictionException(
        `Unable to reach Python backend at ${targetUrl}: ${e.message || e}`,
        0
      );
    }
  }
}
