import { ScreeningAnalyzer } from '../src/utils/screeningAnalyzer';
import { ScreeningStatus, PredictionResponse } from '../src/types';

describe('ScreeningAnalyzer Rules and Ethical Heuristics Test', () => {
  const nominalReadings = [
    { sensors: { mq2: { value: 120 }, mq3: { value: 80 }, mq135: { value: 95 } } },
    { sensors: { mq2: { value: 125 }, mq3: { value: 82 }, mq135: { value: 98 } } },
    { sensors: { mq2: { value: 122 }, mq3: { value: 81 }, mq135: { value: 96 } } },
    { sensors: { mq2: { value: 128 }, mq3: { value: 85 }, mq135: { value: 100 } } },
  ];

  test('classifies nominal baseline readings as normalBaseline with no secondary review required', () => {
    const result = ScreeningAnalyzer.analyze({
      readings: nominalReadings,
      isDemo: false,
    });

    expect(result.status).toBe(ScreeningStatus.normalBaseline);
    expect(result.requiresSecondaryReview).toBe(false);
    expect(result.title).toContain('Nominal');
  });

  test('flags anomaly when MQ-2 combustible level exceeds critical threshold', () => {
    const spikeReadings = [
      ...nominalReadings,
      { sensors: { mq2: { value: 820 }, mq3: { value: 90 }, mq135: { value: 110 } } },
    ];

    const result = ScreeningAnalyzer.analyze({
      readings: spikeReadings,
      isDemo: false,
    });

    expect(result.status).toBe(ScreeningStatus.anomalyFlagged);
    expect(result.requiresSecondaryReview).toBe(true);
    expect(result.description).toContain('threshold exceeded');
  });

  test('flags anomaly when MQ-3 alcohol / vapor level exceeds critical threshold', () => {
    const alcoholReadings = [
      ...nominalReadings,
      { sensors: { mq2: { value: 130 }, mq3: { value: 720 }, mq135: { value: 110 } } },
    ];

    const result = ScreeningAnalyzer.analyze({
      readings: alcoholReadings,
      isDemo: false,
    });

    expect(result.status).toBe(ScreeningStatus.anomalyFlagged);
    expect(result.requiresSecondaryReview).toBe(true);
  });

  test('returns testInterrupted when interrupted flag is true', () => {
    const result = ScreeningAnalyzer.analyze({
      readings: nominalReadings.slice(0, 2),
      isDemo: false,
      wasInterrupted: true,
    });

    expect(result.status).toBe(ScreeningStatus.testInterrupted);
    expect(result.requiresSecondaryReview).toBe(false);
  });

  test('returns inconclusiveData when readings count is less than minimum sample size (3)', () => {
    const result = ScreeningAnalyzer.analyze({
      readings: [nominalReadings[0]],
      isDemo: false,
    });

    expect(result.status).toBe(ScreeningStatus.inconclusiveData);
    expect(result.requiresSecondaryReview).toBe(false);
  });

  test('incorporates backend ML prediction response when available', () => {
    const mockPrediction: PredictionResponse = {
      deviceId: 'RAILSAFE-ESP32-01',
      sequence: 10,
      prediction: 'anomaly',
      label: 'anomaly_synthetic',
      anomalyScore: 0.94,
      normalScore: 0.06,
      confidence: 0.94,
      reviewRequired: true,
      modelVersion: '1.0.0',
      inferenceTimestamp: new Date().toISOString(),
      inputFeatures: {},
      isAnomaly: true,
    };

    const result = ScreeningAnalyzer.analyze({
      readings: nominalReadings,
      isDemo: false,
      backendPrediction: mockPrediction,
    });

    expect(result.status).toBe(ScreeningStatus.anomalyFlagged);
    expect(result.backendPrediction).toBe(mockPrediction);
    expect(result.requiresSecondaryReview).toBe(true);
  });
});
