export interface SensorChannelData {
  value: number;
  unit: string;
  label?: string;
}

export interface SensorReading {
  deviceId: string;
  timestamp: string; // ISO string
  sequence: number;
  mode: 'hardware' | 'demo';
  sensors: Record<string, SensorChannelData>;
  status: string;
  rawJson?: Record<string, any>;
  missingChannels?: string[];

  // Computed helper fields
  sensor1Value?: number;
  sensor2Value?: number;
  sensor3Value?: number;
  mq2Value?: number;
  mq4Value?: number;
  mq7Value?: number;
  mq2?: number;
  mq3?: number;
  mq135?: number;
  hasMissingTelemetry?: boolean;
  isTelemetryComplete?: boolean;

  [key: string]: any;
}

export interface ScreeningVerdictResult {
  verdict: 'SAFE' | 'ELEVATED' | 'HAZARD';
  confidence: number;
  assessment: string;
  modelType: string;
}

export interface TestRecord {
  testId: string;
  userId: string;
  deviceId: string;
  mode: 'hardware' | 'demo';
  startedAt: string; // ISO string
  completedAt: string; // ISO string
  completionStatus: 'completed' | 'incomplete' | 'interrupted' | 'demo_completed';
  sensorReadings: Record<string, any>[];
  screeningAssistanceStatus: string;
  screeningAssistanceDetails: string;
  metrics: Record<string, any>;
  syncedToFirestore: boolean;
  createdAt: string; // ISO string
  notes?: string;

  // Convenience Aliases for UI & reporting
  id?: string;
  timestamp?: string;
  durationSeconds?: number;
  peakMq2?: number;
  peakMq3?: number;
  peakMq135?: number;
  readings?: SensorReading[];
  result?: ScreeningVerdictResult;
}

export interface PredictionResponse {
  deviceId: string;
  sequence: number;
  prediction: 'anomaly' | 'nominal';
  label: string; // 'anomaly_synthetic' | 'normal_synthetic'
  anomalyScore: number;
  normalScore: number;
  confidence: number;
  reviewRequired: boolean;
  modelVersion: string;
  inferenceTimestamp: string;
  inputFeatures: Record<string, number>;
  userId?: string;
  isAnomaly: boolean;
}

export type AlertSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface AppAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string; // ISO string
  userId?: string;
  relatedTestId?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  stationCode: string;
  createdAt: string;
  isDemoUser: boolean;
  // Aliases for screen displays
  name?: string;
  badgeId?: string;
  station?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  rssi: number;
  isConnectable: boolean;
  lastSeen: string;
  serviceUuids: string[];
  displayName: string;
  signalStrength: 'Strong' | 'Good' | 'Fair' | 'Weak';
}

export interface RailGuardAlertModel {
  id: string | number;
  eventUid: string;
  timestamp: string;
  cameraId: string;
  trackId: number;
  objectClass: string;
  eventDuration: number;
  reason: string;
  snapshotUrl: string;
  clipUrl?: string | null;
  reviewStatus: 'unreviewed' | 'verified' | 'false_alarm';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  clearedTimestamp?: string | null;
  createdAt?: string | null;
  disclaimer: string;

  // Snake_case aliases matching Render API response
  camera_id?: string;
  station_id?: string;
  object_class?: string;
  snapshot_url?: string;
  review_status?: 'unreviewed' | 'verified' | 'false_alarm';
  confidence?: number;
  threat_level?: string;
  bbox?: number[];
}

export enum ScreeningStatus {
  normalBaseline = 'normalBaseline',
  anomalyFlagged = 'anomalyFlagged',
  inconclusiveData = 'inconclusiveData',
  testInterrupted = 'testInterrupted',
  demoSimulation = 'demoSimulation',
}

export interface ScreeningAnalysisResult {
  status: ScreeningStatus;
  title: string;
  description: string;
  statusColor: string;
  recommendation: string;
  metrics: Record<string, any>;
  requiresSecondaryReview: boolean;
  backendPrediction?: PredictionResponse | null;
}

export type TelemetrySyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offlineQueued'
  | 'error';

export interface TelemetrySyncState {
  status: TelemetrySyncStatus;
  queuedCount: number;
  totalSyncedCount: number;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  isSyncing?: boolean;
  queueLength?: number;
  error?: string | null;
}

export type BleStatus =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting';
