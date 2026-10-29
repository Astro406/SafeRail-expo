import { AppColors } from '../theme/colors';
import {
  PredictionResponse,
  ScreeningAnalysisResult,
  ScreeningStatus,
} from '../types';

export class ScreeningAnalyzer {
  /**
   * Evaluates received sensor telemetry sessions.
   * Combines multi-channel telemetry aggregation with authoritative Python FastAPI ML inference results.
   */
  static analyze(params: {
    readings: Record<string, any>[];
    isDemo: boolean;
    wasInterrupted?: boolean;
    backendPrediction?: PredictionResponse | null;
  }): ScreeningAnalysisResult {
    const { readings, isDemo, wasInterrupted = false, backendPrediction } = params;

    if (wasInterrupted) {
      return {
        status: ScreeningStatus.testInterrupted,
        title: 'Test Interrupted',
        description:
          'Sampling was prematurely interrupted due to manual cancel or hardware disconnect.',
        statusColor: AppColors.statusWarning,
        recommendation:
          'Ensure device is securely paired and re-initiate screening scan.',
        metrics: { sampleCount: 0 },
        requiresSecondaryReview: false,
      };
    }

    if (!readings || readings.length === 0) {
      return {
        status: ScreeningStatus.inconclusiveData,
        title: 'Inconclusive Data',
        description:
          'No sensor telemetry packets were received during the test interval.',
        statusColor: AppColors.statusWarning,
        recommendation:
          'Check sensor probe connection and firmware status on ESP32.',
        metrics: { sampleCount: 0 },
        requiresSecondaryReview: false,
      };
    }

    if (readings.length < 3) {
      return {
        status: ScreeningStatus.inconclusiveData,
        title: 'Incomplete Sampling',
        description: `Insufficient telemetry packets (${readings.length} samples) to establish baseline.`,
        statusColor: AppColors.statusWarning,
        recommendation:
          'Maintain sensor probe exposure for at least 5-10 seconds.',
        metrics: { sampleCount: readings.length },
        requiresSecondaryReview: false,
      };
    }

    // Extract sensor values across channels
    const s1Values: number[] = [];
    const s2Values: number[] = [];
    const mq2Values: number[] = [];
    const mq4Values: number[] = [];
    const mq7Values: number[] = [];

    for (const r of readings) {
      const sensors = (r.sensors as Record<string, any>) || {};

      // Channel 1 / MQ-2
      let val1: number | undefined;
      if (sensors.mq2_raw !== undefined) {
        val1 = typeof sensors.mq2_raw === 'object' ? Number(sensors.mq2_raw.value) : Number(sensors.mq2_raw);
      } else if (sensors.mq2 !== undefined) {
        val1 = typeof sensors.mq2 === 'object' ? Number(sensors.mq2.value) : Number(sensors.mq2);
      } else if (sensors.sensor_1 !== undefined) {
        val1 = typeof sensors.sensor_1 === 'object' ? Number(sensors.sensor_1.value) : Number(sensors.sensor_1);
      }
      if (val1 !== undefined && !isNaN(val1)) {
        s1Values.push(val1);
        mq2Values.push(val1);
      }

      // Channel 2 / MQ-4 / MQ-3
      let val2: number | undefined;
      if (sensors.mq4_raw !== undefined) {
        val2 = typeof sensors.mq4_raw === 'object' ? Number(sensors.mq4_raw.value) : Number(sensors.mq4_raw);
      } else if (sensors.mq4 !== undefined) {
        val2 = typeof sensors.mq4 === 'object' ? Number(sensors.mq4.value) : Number(sensors.mq4);
      } else if (sensors.mq3 !== undefined) {
        val2 = typeof sensors.mq3 === 'object' ? Number(sensors.mq3.value) : Number(sensors.mq3);
      } else if (sensors.sensor_2 !== undefined) {
        val2 = typeof sensors.sensor_2 === 'object' ? Number(sensors.sensor_2.value) : Number(sensors.sensor_2);
      }
      if (val2 !== undefined && !isNaN(val2)) {
        s2Values.push(val2);
        mq4Values.push(val2);
      }

      // Channel 3 / MQ-7 / MQ-135
      let val3: number | undefined;
      if (sensors.mq7_raw !== undefined) {
        val3 = typeof sensors.mq7_raw === 'object' ? Number(sensors.mq7_raw.value) : Number(sensors.mq7_raw);
      } else if (sensors.mq7 !== undefined) {
        val3 = typeof sensors.mq7 === 'object' ? Number(sensors.mq7.value) : Number(sensors.mq7);
      } else if (sensors.mq135 !== undefined) {
        val3 = typeof sensors.mq135 === 'object' ? Number(sensors.mq135.value) : Number(sensors.mq135);
      } else if (isDemo && val1 !== undefined) {
        // Fallback permitted only in legacy demo mode
        val3 = val1 * 0.45;
      }
      if (val3 !== undefined && !isNaN(val3)) {
        mq7Values.push(val3);
      }
    }

    const s1Max = s1Values.length > 0 ? Math.max(...s1Values) : 0.0;
    const s1Avg = s1Values.length > 0 ? s1Values.reduce((a, b) => a + b, 0) / s1Values.length : 0.0;
    const s2Max = s2Values.length > 0 ? Math.max(...s2Values) : 0.0;
    const s2Avg = s2Values.length > 0 ? s2Values.reduce((a, b) => a + b, 0) / s2Values.length : 0.0;

    const mq2Peak = mq2Values.length > 0 ? Math.max(...mq2Values) : (isDemo ? s1Max : 0.0);
    const mq4Peak = mq4Values.length > 0 ? Math.max(...mq4Values) : (isDemo ? s2Max : 0.0);
    const mq7Peak = mq7Values.length > 0 ? Math.max(...mq7Values) : (isDemo ? s1Max * 0.45 : 0.0);

    let anomalyDetected: boolean;
    let modelName: string;
    let mlPredictionLabel: string;
    let mlAnomalyProbPercent: number;
    let mlConfidence: number;

    if (backendPrediction) {
      // Authoritative inference from Python FastAPI Backend
      anomalyDetected = backendPrediction.isAnomaly;
      modelName = `Python FastAPI Backend (RandomForest v${backendPrediction.modelVersion})`;
      mlPredictionLabel = backendPrediction.label;
      mlAnomalyProbPercent = parseFloat((backendPrediction.anomalyScore * 100).toFixed(1));
      mlConfidence = parseFloat(backendPrediction.confidence.toFixed(1));
    } else {
      // Offline fallback threshold guard when backend is unreachable
      const s1ThresholdExceeded = s1Max > 280.0;
      const s2ThresholdExceeded = s2Max > 140.0;
      anomalyDetected = s1ThresholdExceeded || s2ThresholdExceeded;
      modelName = 'Prediction service unavailable (Safety threshold only)';
      mlPredictionLabel = 'prediction_service_unavailable';
      mlAnomalyProbPercent = anomalyDetected ? 95.0 : 0.0;
      mlConfidence = 0.0;
    }

    const metrics: Record<string, any> = {
      sampleCount: readings.length,
      sensor_1_max: parseFloat(s1Max.toFixed(1)),
      sensor_1_avg: parseFloat(s1Avg.toFixed(1)),
      sensor_2_max: parseFloat(s2Max.toFixed(1)),
      sensor_2_avg: parseFloat(s2Avg.toFixed(1)),
      mq2_peak: parseFloat(mq2Peak.toFixed(1)),
      mq4_peak: parseFloat(mq4Peak.toFixed(1)),
      mq7_peak: parseFloat(mq7Peak.toFixed(1)),
      ml_model: modelName,
      ml_prediction: mlPredictionLabel,
      ml_anomaly_prob: mlAnomalyProbPercent,
      ml_confidence: mlConfidence,
      ...(backendPrediction ? { backend_inference_ts: backendPrediction.inferenceTimestamp } : {}),
    };

    if (isDemo) {
      if (anomalyDetected) {
        return {
          status: ScreeningStatus.demoSimulation,
          title: 'Demo Simulation — Anomaly Scenario',
          description: `Backend AI identified anomalous pattern (${mlAnomalyProbPercent}% anomaly probability, Peak S1: ${s1Max.toFixed(1)}, S2: ${s2Max.toFixed(1)}).`,
          statusColor: AppColors.statusWarning,
          recommendation:
            'Demonstration mode only. In field operations, secondary review would be requested.',
          metrics,
          requiresSecondaryReview: true,
          backendPrediction,
        };
      } else {
        return {
          status: ScreeningStatus.demoSimulation,
          title: 'Demo Simulation — Nominal Baseline',
          description: `Backend AI verified nominal ambient baseline (${mlConfidence}% baseline confidence).`,
          statusColor: AppColors.statusSafe,
          recommendation:
            'Demonstration mode. System telemetry pipeline operating nominally.',
          metrics,
          requiresSecondaryReview: false,
          backendPrediction,
        };
      }
    }

    if (anomalyDetected) {
      const desc = backendPrediction
        ? `Python Backend AI flagged sensor deviation from baseline with ${mlAnomalyProbPercent}% anomaly probability (Peak S1: ${s1Max.toFixed(1)}, Peak S2: ${s2Max.toFixed(1)}).`
        : `Prediction service unavailable. Calibrated threshold exceeded (Peak S1: ${s1Max.toFixed(1)}, Peak S2: ${s2Max.toFixed(1)}). Secondary review recommended.`;
      return {
        status: ScreeningStatus.anomalyFlagged,
        title: backendPrediction
          ? 'Anomaly Flagged — Secondary Review Required'
          : 'Threshold Exceeded — Prediction Service Offline',
        description: desc,
        statusColor: AppColors.statusDanger,
        recommendation:
          'Conduct standard baggage inspection or secondary screening protocol in accordance with railway safety guidelines. Do not conclude substance identity without laboratory spectrometry.',
        metrics,
        requiresSecondaryReview: true,
        backendPrediction,
      };
    }

    const desc = backendPrediction
      ? `Python Backend AI confirmed ambient baseline with ${mlConfidence}% confidence throughout sampling interval.`
      : 'Prediction service unavailable. Telemetry values remained below safety thresholds during sampling.';
    return {
      status: ScreeningStatus.normalBaseline,
      title: backendPrediction
        ? 'Baseline Nominal — No Anomaly Detected'
        : 'Thresholds Nominal — Prediction Service Offline',
      description: desc,
      statusColor: AppColors.statusSafe,
      recommendation:
        'Screening completed. Baggage/sample cleared under current prototype screening parameters.',
      metrics,
      requiresSecondaryReview: false,
      backendPrediction,
    };
  }
}
