import React, { createContext, useContext, useEffect, useState } from 'react';
import { BleService, bleService as defaultBleService, storageService } from '../services';
import { BleStatus, DeviceInfo, SensorReading } from '../types';

interface BleContextValue {
  status: BleStatus;
  isConnected: boolean;
  isScanning: boolean;
  isConnecting: boolean;
  hasStaleData: boolean;
  lastDataReceivedAt: Date | null;
  connectedDeviceName?: string;
  connectedDevice: DeviceInfo | null;
  discoveredDevices: DeviceInfo[];
  devices: DeviceInfo[]; // alias
  errorMessage: string | null;
  error: string | null; // alias
  isPermissionDenied: boolean;
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  clearError: () => void;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (deviceId: string) => Promise<boolean>;
  connectToDevice: (device: DeviceInfo | { id: string; name?: string }) => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendCommand: (cmd: string) => Promise<boolean>;
  onReading: (listener: (reading: SensorReading) => void) => () => void;
}

const BleContext = createContext<BleContextValue | undefined>(undefined);

export const BleProvider: React.FC<{
  children: React.ReactNode;
  bleService?: BleService;
}> = ({ children, bleService = defaultBleService }) => {
  const [status, setStatus] = useState<BleStatus>(bleService.status);
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceInfo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [lastDataReceivedAt, setLastDataReceivedAt] = useState<Date | null>(bleService.lastDataReceivedAt);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(storageService.isDemoModeEnabled);

  useEffect(() => {
    const unsubStatus = bleService.onStatusChange((s) => setStatus(s));
    const unsubDevices = bleService.onDevicesChange((devs) => setDiscoveredDevices(devs));
    const unsubReading = bleService.onReading(() => {
      setLastDataReceivedAt(bleService.lastDataReceivedAt);
    });

    return () => {
      unsubStatus();
      unsubDevices();
      unsubReading();
    };
  }, [bleService]);

  const toggleDemoMode = () => {
    const nextVal = !isDemoMode;
    setIsDemoMode(nextVal);
    storageService.setDemoMode(nextVal);
  };

  const clearError = () => {
    setErrorMessage(null);
    setIsPermissionDenied(false);
  };

  const startScan = async (): Promise<void> => {
    clearError();
    try {
      await bleService.startScan();
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
      if (String(e).toLowerCase().includes('permission')) {
        setIsPermissionDenied(true);
      }
    }
  };

  const stopScan = async (): Promise<void> => {
    await bleService.stopScan();
  };

  const connect = async (deviceId: string): Promise<boolean> => {
    clearError();
    try {
      await bleService.connect(deviceId);
      return true;
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
      return false;
    }
  };

  const connectToDevice = async (device: DeviceInfo | { id: string; name?: string }): Promise<boolean> => {
    return connect(device.id);
  };

  const disconnect = async (): Promise<void> => {
    await bleService.disconnect();
  };

  const sendCommand = async (cmd: string): Promise<boolean> => {
    return await bleService.sendCommand(cmd);
  };

  return (
    <BleContext.Provider
      value={{
        status,
        isConnected: bleService.isConnected,
        isScanning: status === 'scanning',
        isConnecting: status === 'connecting',
        hasStaleData: bleService.hasStaleData,
        lastDataReceivedAt,
        connectedDeviceName: bleService.connectedDeviceName,
        connectedDevice: bleService.connectedDevice,
        discoveredDevices,
        devices: discoveredDevices,
        errorMessage,
        error: errorMessage,
        isPermissionDenied,
        isDemoMode,
        toggleDemoMode,
        clearError,
        startScan,
        stopScan,
        connect,
        connectToDevice,
        disconnect,
        sendCommand,
        onReading: (listener) => bleService.onReading(listener),
      }}
    >
      {children}
    </BleContext.Provider>
  );
};

export const useBle = (): BleContextValue => {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within a BleProvider');
  }
  return context;
};
