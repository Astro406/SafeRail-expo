import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBle } from '@/context/BleContext';
import { CustomButton } from '@/components/CustomButton';
import { StatusBadge } from '@/components/StatusBadge';
import { AppColors } from '@/theme/colors';
import { BleConstants } from '@/constants/BleConstants';

export default function DeviceConnectionScreen() {
  const router = useRouter();
  const {
    isScanning,
    isConnected,
    devices,
    connectedDevice,
    error,
    startScan,
    stopScan,
    connectToDevice,
    disconnect,
    clearError,
    isDemoMode,
    toggleDemoMode,
  } = useBle();

  const handleToggleScan = async () => {
    if (isScanning) {
      await stopScan();
    } else {
      clearError();
      await startScan();
    }
  };

  const handleConnect = async (device: any) => {
    try {
      await connectToDevice(device);
      Alert.alert(
        'Node Connected',
        `Successfully linked to ${device.name}. Telemetry streaming is now active.`,
        [{ text: 'Start Screening', onPress: () => router.push('/live-monitoring') }, { text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Connection Failed', err.message || 'Unable to establish BLE link with sensor node.');
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Node',
      'Terminate telemetry link with the active screening node?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: async () => {
          await disconnect();
        }},
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Current Connection Banner */}
      <View style={[styles.card, isConnected && styles.cardConnected]}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isConnected
                    ? 'rgba(0, 230, 118, 0.15)'
                    : 'rgba(148, 163, 184, 0.12)',
                  borderColor: isConnected ? AppColors.statusSafe : AppColors.surfaceBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isConnected ? 'bluetooth-connect' : 'bluetooth-off'}
                size={24}
                color={isConnected ? AppColors.statusSafe : AppColors.textSecondary}
              />
            </View>
            <View>
              <Text style={styles.connectionTitle}>
                {isConnected ? 'ESP32 Node Linked' : 'No Node Connected'}
              </Text>
              <Text style={styles.connectionSub}>
                {isConnected
                  ? `${connectedDevice?.name} (${connectedDevice?.id})`
                  : 'Screening node must be within 10 meters'}
              </Text>
            </View>
          </View>
          <StatusBadge
            size="sm"
            label={isConnected ? 'Active' : 'Offline'}
            variant={isConnected ? 'safe' : 'neutral'}
          />
        </View>

        {isConnected && (
          <View style={styles.connectedActions}>
            <CustomButton
              title="Disconnect Active Node"
              onPress={handleDisconnect}
              variant="outline"
              size="sm"
              leftIcon={
                <MaterialCommunityIcons
                  name="bluetooth-off"
                  size={16}
                  color={AppColors.primaryCyan}
                />
              }
            />
            <CustomButton
              title="Launch Screening Session"
              onPress={() => router.push('/live-monitoring')}
              variant="primary"
              size="sm"
              leftIcon={
                <MaterialCommunityIcons name="play-circle-outline" size={16} color="#0A0F1D" />
              }
            />
          </View>
        )}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={18}
            color={AppColors.statusDanger}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Scanner Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Nearby Screening Nodes</Text>
            <Text style={styles.cardSubtitle}>
              Scan for Bluetooth Low Energy ESP32 screening terminals
            </Text>
          </View>
          <CustomButton
            title={isScanning ? 'Stop' : 'Scan'}
            onPress={handleToggleScan}
            variant={isScanning ? 'warning' : 'primary'}
            size="sm"
            loading={isScanning}
            leftIcon={
              !isScanning ? (
                <MaterialCommunityIcons name="radar" size={16} color="#0A0F1D" />
              ) : undefined
            }
          />
        </View>

        {/* Scan Status Animation / Message */}
        {isScanning && (
          <View style={styles.scanningBanner}>
            <ActivityIndicator size="small" color={AppColors.primaryCyan} />
            <Text style={styles.scanningText}>
              Broadcasting BLE discovery beacon...
            </Text>
          </View>
        )}

        {/* Discovered Peripherals List */}
        <View style={styles.deviceList}>
          {devices.length > 0 ? (
            devices.map((device) => {
              const isThisConnected = connectedDevice?.id === device.id;
              return (
                <View key={device.id} style={styles.deviceRow}>
                  <View style={styles.deviceLeft}>
                    <MaterialCommunityIcons
                      name="chip"
                      size={22}
                      color={isThisConnected ? AppColors.statusSafe : AppColors.primaryCyan}
                    />
                    <View>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <View style={styles.deviceMetaRow}>
                        <Text style={styles.deviceId}>{device.id}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.deviceRssi}>{device.rssi} dBm</Text>
                      </View>
                    </View>
                  </View>

                  {isThisConnected ? (
                    <StatusBadge size="sm" label="Connected" variant="safe" />
                  ) : (
                    <CustomButton
                      title="Link"
                      onPress={() => handleConnect(device)}
                      variant="secondary"
                      size="sm"
                      style={styles.connectButton}
                    />
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyDevices}>
              <MaterialCommunityIcons
                name="bluetooth-audio"
                size={36}
                color={AppColors.textMuted}
              />
              <Text style={styles.emptyDevicesText}>
                {isScanning
                  ? 'Searching for screening nodes...'
                  : 'No peripheral nodes discovered. Tap "Scan" to query nearby devices.'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Expo Go Demo Hardware Simulator Mode */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <MaterialCommunityIcons
              name="flask-outline"
              size={20}
              color={AppColors.statusWarning}
            />
            <Text style={styles.cardTitle}>Expo Go Hardware Simulator</Text>
          </View>
          <StatusBadge
            size="sm"
            label={isDemoMode ? 'SIMULATOR ON' : 'SIMULATOR OFF'}
            variant={isDemoMode ? 'warning' : 'neutral'}
          />
        </View>
        <Text style={styles.simDescription}>
          Expo Go runs on mobile devices without requiring prebuilt native C++ BLE drivers. When simulator mode is active, synthetic telemetry matching real ESP32 JSON chunk framing (nominal baseline + periodic elevated anomaly spikes) is streamed live for demonstration and jury testing.
        </Text>
        <CustomButton
          title={isDemoMode ? 'Disable Simulator (Real BLE Mode)' : 'Activate Simulator Mode'}
          onPress={toggleDemoMode}
          variant="secondary"
          size="sm"
          style={styles.simButton}
        />
      </View>

      {/* Hardware Configuration Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hardware Protocol Specification</Text>
        <View style={styles.specTable}>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Service UUID</Text>
            <Text style={styles.specVal}>{BleConstants.serviceUuid}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Telemetry TX UUID</Text>
            <Text style={styles.specVal}>{BleConstants.txCharUuid}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Sample Rate</Text>
            <Text style={styles.specVal}>1.0 Hz (1 sample / sec)</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Payload Framing</Text>
            <Text style={styles.specVal}>JSON with Newline '\n' Delimiter</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: AppColors.surfaceBorder,
    padding: 14,
  },
  cardConnected: {
    borderColor: 'rgba(0, 230, 118, 0.4)',
    backgroundColor: '#122238',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  connectionSub: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
    maxWidth: 200,
  },
  connectedActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.surfaceBorder,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 61, 87, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 87, 0.4)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: AppColors.statusDanger,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F1829',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  scanningText: {
    fontSize: 12,
    color: AppColors.primaryCyan,
    fontWeight: '600',
  },
  deviceList: {
    marginTop: 8,
    gap: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(38, 58, 99, 0.4)',
  },
  deviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  deviceId: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  metaDot: {
    fontSize: 10,
    color: AppColors.textMuted,
  },
  deviceRssi: {
    fontSize: 11,
    color: AppColors.primaryCyan,
    fontWeight: '600',
  },
  connectButton: {
    minWidth: 70,
  },
  emptyDevices: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyDevicesText: {
    fontSize: 12,
    color: AppColors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  simDescription: {
    fontSize: 12,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginVertical: 8,
  },
  simButton: {
    marginTop: 6,
  },
  specTable: {
    marginTop: 10,
    backgroundColor: '#0F1829',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specKey: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  specVal: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.primaryCyan,
  },
});
