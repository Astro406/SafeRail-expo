import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  LocalStorageService,
  RailGuardApiService,
  storageService as defaultStorage,
  railGuardApiService as defaultRailGuardApi,
} from '../services';
import { AlertSeverity, AppAlert, RailGuardAlertModel } from '../types';

interface AlertsContextValue {
  alerts: RailGuardAlertModel[];
  systemAlerts: AppAlert[];
  unreviewedCount: number;
  isLoading: boolean;
  refreshAlerts: () => Promise<void>;
  reviewAlert: (alertId: string | number, status: 'verified' | 'false_alarm', notes?: string) => Promise<void>;
  addAlert: (params: {
    type: string;
    title: string;
    message: string;
    severity: AlertSeverity;
    userId?: string;
    relatedTestId?: string;
  }) => Promise<void>;
  clearAlerts: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextValue | undefined>(undefined);

export const AlertsProvider: React.FC<{
  children: React.ReactNode;
  storage?: LocalStorageService;
  railGuardApi?: RailGuardApiService;
}> = ({
  children,
  storage = defaultStorage,
  railGuardApi = defaultRailGuardApi,
}) => {
  const [systemAlerts, setSystemAlerts] = useState<AppAlert[]>(storage.getSavedAlerts());
  const [visionAlerts, setVisionAlerts] = useState<RailGuardAlertModel[]>([
    {
      id: 'RG-1049',
      eventUid: 'EV-1049-CONV-A',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      cameraId: 'CAM-PL1-CONV-01',
      camera_id: 'CAM-PL1-CONV-01',
      stationId: 'NDLS',
      station_id: 'NDLS-PLATFORM-01',
      trackId: 104,
      objectClass: 'weapon',
      object_class: 'weapon',
      eventDuration: 2.8,
      reason: 'Prohibited Metallic Weapon Contour Detected in Luggage X-Ray Flow',
      snapshotUrl: '',
      snapshot_url: '',
      reviewStatus: 'unreviewed',
      review_status: 'unreviewed',
      confidence: 0.945,
      threat_level: 'CRITICAL',
      bbox: [0.24, 0.35, 0.58, 0.68],
      disclaimer: 'RailGuard AI Confirmatory Luggage Vision Protocol',
    } as any,
    {
      id: 'RG-1048',
      eventUid: 'EV-1048-CONV-B',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      cameraId: 'CAM-PL1-CONV-02',
      camera_id: 'CAM-PL1-CONV-02',
      stationId: 'NDLS',
      station_id: 'NDLS-PLATFORM-01',
      trackId: 102,
      objectClass: 'flammable_container',
      object_class: 'flammable_container',
      eventDuration: 3.4,
      reason: 'Unregistered Pressurized Volatile Canister Detected in Scanner',
      snapshotUrl: '',
      snapshot_url: '',
      reviewStatus: 'unreviewed',
      review_status: 'unreviewed',
      confidence: 0.882,
      threat_level: 'HIGH',
      bbox: [0.3, 0.4, 0.65, 0.72],
      disclaimer: 'RailGuard AI Confirmatory Luggage Vision Protocol',
    } as any,
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshAlerts = async () => {
    setIsLoading(true);
    try {
      const live = await railGuardApi.fetchRecentAlerts({ limit: 30 });
      if (live && live.length > 0) {
        const enriched = live.map((item) => ({
          ...item,
          camera_id: item.camera_id || item.cameraId,
          station_id: (item as any).station_id || (item as any).stationId || 'NDLS',
          object_class: item.object_class || item.objectClass,
          snapshot_url: item.snapshot_url || item.snapshotUrl,
          review_status: item.review_status || item.reviewStatus,
          confidence: item.confidence ?? 0.92,
          threat_level: item.threat_level || 'HIGH',
        }));
        setVisionAlerts(enriched);
      }
    } catch (e) {
      // In offline / demo mode keep cached / synthetic alerts
    } finally {
      setIsLoading(false);
    }
  };

  const reviewAlert = async (
    alertId: string | number,
    status: 'verified' | 'false_alarm',
    notes?: string
  ) => {
    try {
      await railGuardApi.submitReview({
        alertId: String(alertId),
        reviewStatus: status,
        notes,
      });
    } catch (e) {
      // Offline fallback: update local state
    }
    setVisionAlerts((prev) =>
      prev.map((a) =>
        String(a.id) === String(alertId)
          ? { ...a, reviewStatus: status, review_status: status }
          : a
      )
    );
  };

  const addAlert = async (params: {
    type: string;
    title: string;
    message: string;
    severity: AlertSeverity;
    userId?: string;
    relatedTestId?: string;
  }) => {
    const alert: AppAlert = {
      id: `ALERT-${uuidv4().substring(0, 8).toUpperCase()}`,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      relatedTestId: params.relatedTestId,
    };

    setSystemAlerts((prev) => [alert, ...prev].slice(0, 100));
    await storage.saveAlert(alert);
  };

  const clearAlerts = async () => {
    setSystemAlerts([]);
    await storage.clearAlerts();
  };

  const unreviewedCount = visionAlerts.filter(
    (a) => a.reviewStatus === 'unreviewed' || a.review_status === 'unreviewed'
  ).length;

  return (
    <AlertsContext.Provider
      value={{
        alerts: visionAlerts,
        systemAlerts,
        unreviewedCount,
        isLoading,
        refreshAlerts,
        reviewAlert,
        addAlert,
        clearAlerts,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = (): AlertsContextValue => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
};
