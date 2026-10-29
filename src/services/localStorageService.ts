import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConstants } from '../constants/AppConstants';
import { BleConstants } from '../constants/BleConstants';
import { AppAlert, TestRecord, UserProfile } from '../types';

export class LocalStorageService {
  private static instance: LocalStorageService | null = null;
  private cache: Map<string, string> = new Map();
  private isLoaded: boolean = false;

  constructor() {
    this.init();
  }

  static async getInstance(): Promise<LocalStorageService> {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
      await LocalStorageService.instance.init();
    }
    return LocalStorageService.instance;
  }

  private async init(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);
      pairs.forEach(([key, value]) => {
        if (value !== null) {
          this.cache.set(key, value);
        }
      });
      this.isLoaded = true;
    } catch (e) {
      console.warn('[LocalStorageService] Error loading cache:', e);
      this.isLoaded = true;
    }
  }

  // --- Demo Mode Setting ---
  get isDemoModeEnabled(): boolean {
    const val = this.cache.get(AppConstants.keyDemoMode);
    return val === 'true';
  }

  async setDemoMode(value: boolean): Promise<void> {
    const str = String(value);
    this.cache.set(AppConstants.keyDemoMode, str);
    await AsyncStorage.setItem(AppConstants.keyDemoMode, str);
  }

  // --- Demo Scenario ('nominal' or 'anomaly') ---
  get demoScenario(): string {
    return this.cache.get(AppConstants.keyDemoScenario) || 'nominal';
  }

  async setDemoScenario(scenario: string): Promise<void> {
    this.cache.set(AppConstants.keyDemoScenario, scenario);
    await AsyncStorage.setItem(AppConstants.keyDemoScenario, scenario);
  }

  // --- Custom BLE UUIDs ---
  get serviceUuid(): string {
    return this.cache.get(AppConstants.keyServiceUuid) || BleConstants.defaultServiceUuid;
  }

  async setServiceUuid(uuid: string): Promise<void> {
    this.cache.set(AppConstants.keyServiceUuid, uuid);
    await AsyncStorage.setItem(AppConstants.keyServiceUuid, uuid);
  }

  get dataCharUuid(): string {
    return this.cache.get(AppConstants.keyDataCharUuid) || BleConstants.defaultDataCharacteristicUuid;
  }

  async setDataCharUuid(uuid: string): Promise<void> {
    this.cache.set(AppConstants.keyDataCharUuid, uuid);
    await AsyncStorage.setItem(AppConstants.keyDataCharUuid, uuid);
  }

  get cmdCharUuid(): string {
    return this.cache.get(AppConstants.keyCmdCharUuid) || BleConstants.defaultCommandCharacteristicUuid;
  }

  async setCmdCharUuid(uuid: string): Promise<void> {
    this.cache.set(AppConstants.keyCmdCharUuid, uuid);
    await AsyncStorage.setItem(AppConstants.keyCmdCharUuid, uuid);
  }

  get staleTimeoutSeconds(): number {
    const val = this.cache.get(AppConstants.keyStaleTimeoutSec);
    return val ? parseInt(val, 10) : 4;
  }

  async setStaleTimeoutSeconds(seconds: number): Promise<void> {
    const str = String(seconds);
    this.cache.set(AppConstants.keyStaleTimeoutSec, str);
    await AsyncStorage.setItem(AppConstants.keyStaleTimeoutSec, str);
  }

  // --- Python Backend Server URL ---
  getBackendUrl(): string {
    return this.cache.get(AppConstants.keyBackendUrl) || AppConstants.defaultBackendUrl;
  }

  async setBackendUrl(url: string): Promise<void> {
    const trimmed = url.trim();
    this.cache.set(AppConstants.keyBackendUrl, trimmed);
    await AsyncStorage.setItem(AppConstants.keyBackendUrl, trimmed);
  }

  // --- RailGuard Vision Production Server URL ---
  getRailGuardBackendUrl(): string {
    return this.cache.get(AppConstants.keyRailGuardBackendUrl) || AppConstants.defaultRailGuardBackendUrl;
  }

  async setRailGuardBackendUrl(url: string): Promise<void> {
    const trimmed = url.trim();
    this.cache.set(AppConstants.keyRailGuardBackendUrl, trimmed);
    await AsyncStorage.setItem(AppConstants.keyRailGuardBackendUrl, trimmed);
  }

  // --- Offline Tests Persistence ---
  getSavedTests(): TestRecord[] {
    const raw = this.cache.get(AppConstants.keySavedTests);
    if (!raw) return [];
    try {
      const list = JSON.parse(raw) as TestRecord[];
      return list.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    } catch {
      return [];
    }
  }

  async saveTest(record: TestRecord): Promise<void> {
    const current = this.getSavedTests();
    const index = current.findIndex((t) => t.testId === record.testId);
    if (index >= 0) {
      current[index] = record;
    } else {
      current.unshift(record);
    }
    const encoded = JSON.stringify(current);
    this.cache.set(AppConstants.keySavedTests, encoded);
    await AsyncStorage.setItem(AppConstants.keySavedTests, encoded);
  }

  async updateTestSyncStatus(testId: string, synced: boolean): Promise<void> {
    const current = this.getSavedTests();
    const index = current.findIndex((t) => t.testId === testId);
    if (index >= 0) {
      current[index] = { ...current[index], syncedToFirestore: synced };
      const encoded = JSON.stringify(current);
      this.cache.set(AppConstants.keySavedTests, encoded);
      await AsyncStorage.setItem(AppConstants.keySavedTests, encoded);
    }
  }

  async deleteTest(testId: string): Promise<void> {
    const current = this.getSavedTests().filter((t) => t.testId !== testId);
    const encoded = JSON.stringify(current);
    this.cache.set(AppConstants.keySavedTests, encoded);
    await AsyncStorage.setItem(AppConstants.keySavedTests, encoded);
  }

  // --- Offline Alerts Persistence ---
  getSavedAlerts(): AppAlert[] {
    const raw = this.cache.get(AppConstants.keySavedAlerts);
    if (!raw) return [];
    try {
      const list = JSON.parse(raw) as AppAlert[];
      return list.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }

  async saveAlert(alert: AppAlert): Promise<void> {
    const current = this.getSavedAlerts();
    current.unshift(alert);
    if (current.length > 100) {
      current.splice(100);
    }
    const encoded = JSON.stringify(current);
    this.cache.set(AppConstants.keySavedAlerts, encoded);
    await AsyncStorage.setItem(AppConstants.keySavedAlerts, encoded);
  }

  async clearAlerts(): Promise<void> {
    this.cache.delete(AppConstants.keySavedAlerts);
    await AsyncStorage.removeItem(AppConstants.keySavedAlerts);
  }

  // --- User Profile Caching ---
  getCachedUser(): UserProfile | null {
    const raw = this.cache.get(AppConstants.keyCachedUser);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  async cacheUser(user: UserProfile | null): Promise<void> {
    if (user === null) {
      this.cache.delete(AppConstants.keyCachedUser);
      await AsyncStorage.removeItem(AppConstants.keyCachedUser);
    } else {
      const encoded = JSON.stringify(user);
      this.cache.set(AppConstants.keyCachedUser, encoded);
      await AsyncStorage.setItem(AppConstants.keyCachedUser, encoded);
    }
  }
}
