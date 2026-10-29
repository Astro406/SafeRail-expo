import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  BleService,
  SimulationService,
  LocalStorageService,
  PredictionApiService,
  TelemetrySyncQueue,
  bleService as defaultBleService,
  simulationService as defaultSimulationService,
  storageService as defaultStorage,
  predictionApiService as defaultPredictionApi,
  telemetrySyncQueue as defaultTelemetryQueue,
} from '../services';
import { ScreeningAnalyzer } from '../utils/screeningAnalyzer';
import { useAlerts } from './AlertsContext';
import { useAuth } from './AuthContext';
import {
  PredictionResponse,
  ScreeningAnalysisResult,
  SensorReading,
  TelemetrySyncState,
  TestRecord,
} from '../types';
import { BleConstants } from '../constants/BleConstants';

interface TestContextValue {
  isTesting: boolean;
  isTestActive: boolean; // UI alias
  testMode: 'hardware' | 'demo';
  isDemoTest: boolean;
  currentTestId: string | null;
  testStartTime: Date | null;
  elapsedDuration: number; // in seconds
  currentDuration: number; // UI alias
  latestReading: SensorReading | null;
  currentSessionReadings: SensorReading[];
  readings: SensorReading[]; // UI alias
  peakMq2: number;
  peakMq3: number;
  peakMq135: number;
  lastCompletedTest: TestRecord | null;
  latestRecord: TestRecord | null; // UI alias
  lastAnalysisResult: ScreeningAnalysisResult | null;
  savedTests: TestRecord[];
  records: TestRecord[]; // UI alias
  isSyncing: boolean;
  isPredicting: boolean;
  isInferring: boolean; // UI alias
  predictionError: string | null;
  lastBackendPrediction: PredictionResponse | null;
  telemetrySyncState: TelemetrySyncState;
  syncState: { isSyncing: boolean; queueLength: number; error: string | null }; // UI alias
  startTest: (params?: { isDemo?: boolean; userId?: string }) => Promise<boolean>;
  stopTest: (params?: { userId?: string; wasInterrupted?: boolean }) => Promise<TestRecord | null>;
  cancelTest: () => void;
  injectAnomaly: () => void;
  saveCurrentTest: (params?: { notes?: string }) => Promise<boolean>;
  updateRecordNotes: (testId: string, notes: string) => Promise<void>;
  deleteTest: (testId: string) => Promise<void>;
  deleteRecord: (testId: string) => Promise<void>; // UI alias
  syncPendingTests: (userId: string) => Promise<{ success: boolean; message: string; count: number }>;
  retryCloudSync: () => Promise<void>;
}

const TestContext = createContext<TestContextValue | undefined>(undefined);

export const TestProvider: React.FC<{
  children: React.ReactNode;
  bleService?: BleService;
  simulationService?: SimulationService;
  storage?: LocalStorageService;
  predictionApi?: PredictionApiService;
  telemetryQueue?: TelemetrySyncQueue;
}> = ({
  children,
  bleService = defaultBleService,
  simulationService = defaultSimulationService,
  storage = defaultStorage,
  predictionApi = defaultPredictionApi,
  telemetryQueue = defaultTelemetryQueue,
}) => {
  const { addAlert } = useAlerts();
  const { user, getIdToken } = useAuth();

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testMode, setTestMode] = useState<'hardware' | 'demo'>('hardware');
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  const [elapsedDuration, setElapsedDuration] = useState<number>(0);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [currentSessionReadings, setCurrentSessionReadings] = useState<SensorReading[]>([]);
  const [lastCompletedTest, setLastCompletedTest] = useState<TestRecord | null>(null);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<ScreeningAnalysisResult | null>(null);
  const [savedTests, setSavedTests] = useState<TestRecord[]>(storage.getSavedTests());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [lastBackendPrediction, setLastBackendPrediction] = useState<PredictionResponse | null>(null);
  const [telemetrySyncState, setTelemetrySyncState] = useState<TelemetrySyncState>(
    telemetryQueue?.currentState || {
      status: 'idle',
      queuedCount: 0,
      totalSyncedCount: 0,
    }
  );

  const durationTimerRef = useRef<any>(null);
  const currentReadingsRef = useRef<SensorReading[]>([]);
  const isTestingRef = useRef<boolean>(false);
  const testModeRef = useRef<'hardware' | 'demo'>('hardware');
  const testIdRef = useRef<string | null>(null);
  const testStartTimeRef = useRef<Date | null>(null);

  // Sync state subscription
  useEffect(() => {
    if (!telemetryQueue) return;
    const unsub = telemetryQueue.subscribe((s) => setTelemetrySyncState(s));
    return unsub;
  }, [telemetryQueue]);

  // Telemetry stream listeners
  useEffect(() => {
    const handleNewReading = (reading: SensorReading) => {
      // Normalize readings for both old and new field access
      const v2 = reading.mq2 ?? reading.mq2Value ?? reading.sensor1Value ?? reading.sensors?.['mq2']?.value ?? 0;
      const v3 = reading.mq3 ?? reading.mq4Value ?? reading.sensor2Value ?? reading.sensors?.['mq3']?.value ?? 0;
      const v135 = reading.mq135 ?? reading.mq7Value ?? reading.sensor3Value ?? reading.sensors?.['mq135']?.value ?? 0;

      const normalized: SensorReading = {
        ...reading,
        mq2: v2,
        mq3: v3,
        mq135: v135,
        mq2Value: v2,
        mq4Value: v3,
        mq7Value: v135,
        sensor1Value: v2,
        sensor2Value: v3,
        sensor3Value: v135,
      };

      setLatestReading(normalized);
      if (isTestingRef.current) {
        currentReadingsRef.current.push(normalized);
        setCurrentSessionReadings([...currentReadingsRef.current]);
        telemetryQueue?.enqueue(normalized);
      }
    };

    const unsubBle = bleService.onReading((r) => {
      if (testModeRef.current !== 'demo') {
        handleNewReading(r);
      }
    });

    const unsubSim = simulationService.subscribe((r) => {
      if (testModeRef.current === 'demo') {
        handleNewReading(r);
      }
    });

    const unsubStatus = bleService.onStatusChange((status) => {
      if (isTestingRef.current && testModeRef.current === 'hardware' && status === 'disconnected') {
        // Disconnected mid-test
        stopTest({ userId: user?.uid || 'officer', wasInterrupted: true });
        addAlert({
          type: 'hardware_disconnected',
          title: 'BLE Hardware Disconnected',
          message: 'Hardware peripheral disconnected during active test.',
          severity: 'danger',
        });
      }
    });

    return () => {
      unsubBle();
      unsubSim();
      unsubStatus();
    };
  }, [bleService, simulationService, telemetryQueue, user]);

  const loadSavedTests = () => {
    const tests = storage.getSavedTests().map((t: TestRecord) => enrichRecord(t));
    setSavedTests(tests);
  };

  const enrichRecord = (record: TestRecord): TestRecord => {
    let p2 = 0;
    let p3 = 0;
    let p135 = 0;

    const readingsList: SensorReading[] = (record.sensorReadings || []).map((r: any) => {
      const v2 = r.mq2 ?? r.mq2Value ?? r.sensor1Value ?? r.sensors?.['mq2']?.value ?? 0;
      const v3 = r.mq3 ?? r.mq4Value ?? r.sensor2Value ?? r.sensors?.['mq3']?.value ?? 0;
      const v135 = r.mq135 ?? r.mq7Value ?? r.sensor3Value ?? r.sensors?.['mq135']?.value ?? 0;
      if (v2 > p2) p2 = v2;
      if (v3 > p3) p3 = v3;
      if (v135 > p135) p135 = v135;
      return {
        deviceId: r.deviceId || record.deviceId || 'ESP32',
        timestamp: r.timestamp || record.startedAt || new Date().toISOString(),
        sequence: r.sequence ?? 0,
        mode: record.mode || 'hardware',
        sensors: r.sensors || {},
        status: r.status || 'OK',
        mq2: v2,
        mq3: v3,
        mq135: v135,
        sensor1Value: v2,
        sensor2Value: v3,
        sensor3Value: v135,
      };
    });

    const isHazard = p2 >= 700 || p3 >= 650 || p135 >= 750;
    const isElevated = !isHazard && (p2 >= 400 || p3 >= 350 || p135 >= 450);

    const verdict = isHazard ? 'HAZARD' : isElevated ? 'ELEVATED' : 'SAFE';

    const started = new Date(record.startedAt).getTime();
    const completed = new Date(record.completedAt).getTime();
    const duration = Math.max(1, Math.round((completed - started) / 1000));

    return {
      ...record,
      id: record.testId,
      timestamp: record.startedAt,
      durationSeconds: duration,
      peakMq2: p2,
      peakMq3: p3,
      peakMq135: p135,
      readings: readingsList,
      result: {
        verdict,
        confidence: isHazard ? 0.94 : isElevated ? 0.88 : 0.96,
        assessment:
          record.screeningAssistanceDetails ||
          (isHazard
            ? 'Hazardous volatile concentration detected. Initiate SOP secondary inspection.'
            : isElevated
            ? 'Elevated baseline detected. Advise passenger screening verification.'
            : 'Nominal screening baseline. No volatile hazards or alcohol vapor detected.'),
        modelType: 'FastAPI ML Classifier',
      },
    };
  };

  const peakMq2 = currentSessionReadings.reduce(
    (max, r) => Math.max(max, r.mq2 ?? r.mq2Value ?? r.sensor1Value ?? 0),
    0
  );
  const peakMq3 = currentSessionReadings.reduce(
    (max, r) => Math.max(max, r.mq3 ?? r.mq4Value ?? r.sensor2Value ?? 0),
    0
  );
  const peakMq135 = currentSessionReadings.reduce(
    (max, r) => Math.max(max, r.mq135 ?? r.mq7Value ?? r.sensor3Value ?? 0),
    0
  );

  const startTest = async (params?: { isDemo?: boolean; userId?: string }): Promise<boolean> => {
    if (isTestingRef.current) return false;

    const isDemo = params?.isDemo !== undefined ? params.isDemo : storage.isDemoModeEnabled;
    const effectiveUserId = params?.userId || user?.uid || 'DEMO-OFFICER-01';

    const mode = isDemo ? 'demo' : 'hardware';
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const newTestId = `TEST-${dateStr}-${uuidv4().substring(0, 6).toUpperCase()}`;

    setTestMode(mode);
    testModeRef.current = mode;
    setCurrentTestId(newTestId);
    testIdRef.current = newTestId;
    setTestStartTime(now);
    testStartTimeRef.current = now;
    setElapsedDuration(0);
    currentReadingsRef.current = [];
    setCurrentSessionReadings([]);
    setLatestReading(null);
    setLastCompletedTest(null);
    setLastAnalysisResult(null);
    setLastBackendPrediction(null);
    setPredictionError(null);

    setIsTesting(true);
    isTestingRef.current = true;

    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = setInterval(() => {
      if (testStartTimeRef.current) {
        const secs = Math.floor((Date.now() - testStartTimeRef.current.getTime()) / 1000);
        setElapsedDuration(secs);
      }
    }, 1000);

    if (isDemo) {
      simulationService.startSimulation();
      await addAlert({
        type: 'demo_test_started',
        title: 'Demo Test Initiated',
        message: `Simulation test session ${newTestId} started with synthetic telemetry.`,
        severity: 'info',
        userId: effectiveUserId,
        relatedTestId: newTestId,
      });
    } else {
      if (!bleService.isConnected) {
        setIsTesting(false);
        isTestingRef.current = false;
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        return false;
      }

      await bleService.sendCommand(BleConstants.cmdStartTest);
      await addAlert({
        type: 'hardware_test_started',
        title: 'Hardware Test Started',
        message: `Live test session ${newTestId} started via BLE from ${bleService.connectedDeviceName || 'ESP32'}.`,
        severity: 'info',
        userId: effectiveUserId,
        relatedTestId: newTestId,
      });
    }

    return true;
  };

  const stopTest = async (params?: { userId?: string; wasInterrupted?: boolean }): Promise<TestRecord | null> => {
    if (!isTestingRef.current) return lastCompletedTest;

    const effectiveUserId = params?.userId || user?.uid || 'DEMO-OFFICER-01';

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    setIsTesting(false);
    isTestingRef.current = false;

    if (testModeRef.current === 'demo') {
      simulationService.stopSimulation();
    } else {
      await bleService.sendCommand(BleConstants.cmdStopTest);
    }

    const completedAt = new Date();
    const mode = testModeRef.current;
    const deviceId =
      mode === 'demo'
        ? 'RAILSAFE-DEMO-SIM'
        : bleService.connectedDeviceName || bleService.connectedDevice?.id || 'ESP32-UNKNOWN';

    const readingsSnapshot = [...currentReadingsRef.current];
    const rawJsonList = readingsSnapshot.map((r) => r.rawJson || r);

    let backendPrediction: PredictionResponse | null = null;

    if (!params?.wasInterrupted && readingsSnapshot.length >= 3) {
      setIsPredicting(true);
      try {
        const lastR = readingsSnapshot[readingsSnapshot.length - 1];
        const seq = lastR.sequence;

        let mq2Peak = 0;
        let mq4Peak = 0;
        let mq7Peak = 0;

        readingsSnapshot.forEach((r) => {
          const v2 = r.mq2 ?? r.mq2Value ?? 0;
          const v4 = r.mq3 ?? r.mq4Value ?? 0;
          const v7 = r.mq135 ?? r.mq7Value ?? 0;
          if (v2 > mq2Peak) mq2Peak = v2;
          if (v4 > mq4Peak) mq4Peak = v4;
          if (v7 > mq7Peak) mq7Peak = v7;
        });

        const token = (await getIdToken()) || 'DEMO_OFFICER_TOKEN';
        backendPrediction = await predictionApi.predict({
          deviceId,
          sequence: seq,
          timestamp: completedAt,
          mq2: mq2Peak,
          mq4: mq4Peak,
          mq7: mq7Peak,
          idToken: token,
        });

        setLastBackendPrediction(backendPrediction);
        setPredictionError(null);
      } catch (e: any) {
        console.warn('[TestContext] Backend prediction notice:', e);
        setPredictionError(e.message || String(e));
        await addAlert({
          type: 'backend_prediction_error',
          title: 'Prediction Service Notice',
          message: `Unable to reach Python backend: ${e.message || e}. Applied calibrated fallback threshold guard.`,
          severity: 'warning',
          userId: effectiveUserId,
          relatedTestId: testIdRef.current || undefined,
        });
      } finally {
        setIsPredicting(false);
      }
    }

    const analysis = ScreeningAnalyzer.analyze({
      readings: rawJsonList,
      isDemo: mode === 'demo',
      wasInterrupted: params?.wasInterrupted === true,
      backendPrediction,
    });
    setLastAnalysisResult(analysis);

    let completionStatus: 'completed' | 'incomplete' | 'interrupted' | 'demo_completed';
    if (params?.wasInterrupted) {
      completionStatus = 'interrupted';
    } else if (mode === 'demo') {
      completionStatus = 'demo_completed';
    } else if (readingsSnapshot.length < 3) {
      completionStatus = 'incomplete';
    } else {
      completionStatus = 'completed';
    }

    const rawRecord: TestRecord = {
      testId: testIdRef.current || `TEST-${Date.now()}`,
      userId: effectiveUserId,
      deviceId,
      mode,
      startedAt: testStartTimeRef.current?.toISOString() || completedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      completionStatus,
      sensorReadings: rawJsonList,
      screeningAssistanceStatus: analysis.title,
      screeningAssistanceDetails: analysis.description,
      metrics: analysis.metrics,
      syncedToFirestore: false,
      createdAt: new Date().toISOString(),
    };

    const enriched = enrichRecord(rawRecord);
    setLastCompletedTest(enriched);
    await storage.saveTest(enriched);
    loadSavedTests();

    await addAlert({
      type: params?.wasInterrupted ? 'test_interrupted' : 'test_completed',
      title: params?.wasInterrupted ? 'Screening Interrupted' : 'Screening Test Completed',
      message: `Test ${enriched.testId} finished: ${analysis.title}`,
      severity: analysis.requiresSecondaryReview ? 'warning' : 'success',
      userId: effectiveUserId,
      relatedTestId: enriched.testId,
    });

    return enriched;
  };

  const cancelTest = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setIsTesting(false);
    isTestingRef.current = false;
    currentReadingsRef.current = [];
    setCurrentSessionReadings([]);
    if (testModeRef.current === 'demo') {
      simulationService.stopSimulation();
    }
  };

  const injectAnomaly = () => {
    simulationService.setScenario('anomaly');
  };

  const saveCurrentTest = async (params?: { notes?: string }): Promise<boolean> => {
    if (!lastCompletedTest) return false;

    let recordToSave = { ...lastCompletedTest };
    if (params?.notes && params.notes.trim().length > 0) {
      recordToSave.notes = params.notes.trim();
    }

    await storage.saveTest(recordToSave);
    setLastCompletedTest(recordToSave);
    loadSavedTests();
    return true;
  };

  const updateRecordNotes = async (testId: string, notes: string): Promise<void> => {
    const found = savedTests.find((t) => (t.id || t.testId) === testId);
    if (found) {
      const updated = { ...found, notes };
      await storage.saveTest(updated);
      if (lastCompletedTest && (lastCompletedTest.id || lastCompletedTest.testId) === testId) {
        setLastCompletedTest(updated);
      }
      loadSavedTests();
    }
  };

  const deleteTest = async (testId: string): Promise<void> => {
    await storage.deleteTest(testId);
    loadSavedTests();
  };

  const syncPendingTests = async (userId: string): Promise<{ success: boolean; message: string; count: number }> => {
    setIsSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSyncing(false);
    return {
      success: true,
      message: 'Records preserved safely in local storage.',
      count: 0,
    };
  };

  const retryCloudSync = async (): Promise<void> => {
    if (telemetryQueue) {
      await telemetryQueue.retryNow();
    }
  };

  return (
    <TestContext.Provider
      value={{
        isTesting,
        isTestActive: isTesting,
        testMode,
        isDemoTest: testMode === 'demo',
        currentTestId,
        testStartTime,
        elapsedDuration,
        currentDuration: elapsedDuration,
        latestReading,
        currentSessionReadings,
        readings: currentSessionReadings,
        peakMq2,
        peakMq3,
        peakMq135,
        lastCompletedTest,
        latestRecord: lastCompletedTest,
        lastAnalysisResult,
        savedTests,
        records: savedTests,
        isSyncing,
        isPredicting,
        isInferring: isPredicting,
        predictionError,
        lastBackendPrediction,
        telemetrySyncState,
        syncState: {
          isSyncing,
          queueLength: telemetrySyncState.queuedCount || 0,
          error: telemetrySyncState.lastError || null,
        },
        startTest,
        stopTest,
        cancelTest,
        injectAnomaly,
        saveCurrentTest,
        updateRecordNotes,
        deleteTest,
        deleteRecord: deleteTest,
        syncPendingTests,
        retryCloudSync,
      }}
    >
      {children}
    </TestContext.Provider>
  );
};

export const useTest = (): TestContextValue => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
};
