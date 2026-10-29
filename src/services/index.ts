import { LocalStorageService } from './localStorageService';
import { BleService } from './bleService';
import { SimulationService } from './simulationService';
import { PredictionApiService } from './predictionApiService';
import { RailGuardApiService } from './railGuardApiService';
import { TelemetryService, TelemetrySyncQueue } from './telemetryService';
import { AuthService } from './authService';

export const storageService = new LocalStorageService();
export const bleService = new BleService();
export const simulationService = new SimulationService();
export const predictionApiService = new PredictionApiService(storageService);
export const railGuardApiService = new RailGuardApiService(storageService);
export const telemetryService = new TelemetryService(storageService);
export const telemetrySyncQueue = new TelemetrySyncQueue(telemetryService);
export const authService = new AuthService(storageService);

export * from './localStorageService';
export * from './bleService';
export { SimulationService, SimulationReadingListener } from './simulationService';
export * from './predictionApiService';
export * from './railGuardApiService';
export * from './telemetryService';
export * from './authService';
