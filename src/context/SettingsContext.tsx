import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  LocalStorageService,
  BleService,
  SimulationService,
  storageService as defaultStorage,
  bleService as defaultBleService,
  simulationService as defaultSimulationService,
} from '../services';
import { AppConstants } from '../constants/AppConstants';
import { BleConstants } from '../constants/BleConstants';

export interface AppSettingsData {
  predictionApiUrl: string;
  railGuardApiUrl: string;
  bleServiceUuid: string;
}

interface SettingsContextValue {
  isDemoModeEnabled: boolean;
  demoScenario: 'nominal' | 'anomaly';
  serviceUuid: string;
  dataCharUuid: string;
  cmdCharUuid: string;
  staleTimeoutSeconds: number;
  backendUrl: string;
  railGuardBackendUrl: string;
  isFirebaseConfigured: boolean;
  settings: AppSettingsData;
  updateSettings: (params: Partial<AppSettingsData>) => Promise<void>;
  resetSettings: () => Promise<void>;
  setDemoMode: (val: boolean) => Promise<void>;
  setDemoScenario: (val: 'nominal' | 'anomaly') => Promise<void>;
  setBackendUrl: (val: string) => Promise<void>;
  setRailGuardBackendUrl: (val: string) => Promise<void>;
  updateBleUuids: (uuids: { serviceUuid: string; dataCharUuid: string; cmdCharUuid: string }) => Promise<void>;
  setStaleTimeout: (val: number) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{
  children: React.ReactNode;
  storage?: LocalStorageService;
  bleService?: BleService;
  simulationService?: SimulationService;
}> = ({
  children,
  storage = defaultStorage,
  bleService = defaultBleService,
  simulationService = defaultSimulationService,
}) => {
  const [isDemoModeEnabled, setIsDemoModeEnabledState] = useState<boolean>(storage.isDemoModeEnabled);
  const [demoScenario, setDemoScenarioState] = useState<'nominal' | 'anomaly'>(
    storage.demoScenario as 'nominal' | 'anomaly'
  );
  const [serviceUuid, setServiceUuidState] = useState<string>(storage.serviceUuid);
  const [dataCharUuid, setDataCharUuidState] = useState<string>(storage.dataCharUuid);
  const [cmdCharUuid, setCmdCharUuidState] = useState<string>(storage.cmdCharUuid);
  const [staleTimeoutSeconds, setStaleTimeoutSecondsState] = useState<number>(storage.staleTimeoutSeconds);
  const [backendUrl, setBackendUrlState] = useState<string>(storage.getBackendUrl());
  const [railGuardBackendUrl, setRailGuardBackendUrlState] = useState<string>(storage.getRailGuardBackendUrl());

  useEffect(() => {
    bleService.configureUuids({ serviceUuid, dataCharUuid, cmdCharUuid });
    simulationService.setScenario(demoScenario);
  }, []);

  const setDemoMode = async (val: boolean) => {
    setIsDemoModeEnabledState(val);
    await storage.setDemoMode(val);
  };

  const setDemoScenario = async (val: 'nominal' | 'anomaly') => {
    setDemoScenarioState(val);
    simulationService.setScenario(val);
    await storage.setDemoScenario(val);
  };

  const setBackendUrl = async (url: string) => {
    const trimmed = url.trim();
    setBackendUrlState(trimmed);
    await storage.setBackendUrl(trimmed);
  };

  const setRailGuardBackendUrl = async (url: string) => {
    const trimmed = url.trim();
    setRailGuardBackendUrlState(trimmed);
    await storage.setRailGuardBackendUrl(trimmed);
  };

  const updateBleUuids = async (uuids: { serviceUuid: string; dataCharUuid: string; cmdCharUuid: string }) => {
    const s = uuids.serviceUuid.trim();
    const d = uuids.dataCharUuid.trim();
    const c = uuids.cmdCharUuid.trim();
    setServiceUuidState(s);
    setDataCharUuidState(d);
    setCmdCharUuidState(c);
    await storage.setServiceUuid(s);
    await storage.setDataCharUuid(d);
    await storage.setCmdCharUuid(c);
    bleService.configureUuids({ serviceUuid: s, dataCharUuid: d, cmdCharUuid: c });
  };

  const setStaleTimeout = async (seconds: number) => {
    setStaleTimeoutSecondsState(seconds);
    await storage.setStaleTimeoutSeconds(seconds);
  };

  const updateSettings = async (params: Partial<AppSettingsData>) => {
    if (params.predictionApiUrl !== undefined) {
      await setBackendUrl(params.predictionApiUrl);
    }
    if (params.railGuardApiUrl !== undefined) {
      await setRailGuardBackendUrl(params.railGuardApiUrl);
    }
    if (params.bleServiceUuid !== undefined) {
      await updateBleUuids({
        serviceUuid: params.bleServiceUuid,
        dataCharUuid,
        cmdCharUuid,
      });
    }
  };

  const resetSettings = async () => {
    await setBackendUrl(AppConstants.defaultBackendUrl);
    await setRailGuardBackendUrl(AppConstants.defaultRailGuardBackendUrl);
    await updateBleUuids({
      serviceUuid: BleConstants.defaultServiceUuid,
      dataCharUuid: BleConstants.defaultDataCharacteristicUuid,
      cmdCharUuid: BleConstants.defaultCommandCharacteristicUuid,
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        isDemoModeEnabled,
        demoScenario,
        serviceUuid,
        dataCharUuid,
        cmdCharUuid,
        staleTimeoutSeconds,
        backendUrl,
        railGuardBackendUrl,
        isFirebaseConfigured: false,
        settings: {
          predictionApiUrl: backendUrl,
          railGuardApiUrl: railGuardBackendUrl,
          bleServiceUuid: serviceUuid,
        },
        updateSettings,
        resetSettings,
        setDemoMode,
        setDemoScenario,
        setBackendUrl,
        setRailGuardBackendUrl,
        updateBleUuids,
        setStaleTimeout,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
