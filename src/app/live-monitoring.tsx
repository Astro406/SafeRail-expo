import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTest } from '@/context/TestContext';
import { useBle } from '@/context/BleContext';
import { CustomButton } from '@/components/CustomButton';
import { StatusBadge } from '@/components/StatusBadge';
import { SensorGaugeCard } from '@/components/SensorGaugeCard';
import { RealtimeSensorChart } from '@/components/RealtimeSensorChart';
import { AppColors } from '@/theme/colors';
import { formatDuration } from '@/utils/dateFormatter';

export default function LiveMonitoringScreen() {
  const router = useRouter();
  const { isConnected, connectedDevice, isDemoMode } = useBle();
  const {
    isTestActive,
    currentDuration,
    readings,
    latestReading,
    peakMq2,
    peakMq3,
    peakMq135,
    isInferring,
    syncState,
    startTest,
    stopTest,
    cancelTest,
    injectAnomaly,
  } = useTest();

  const handleStartTest = () => {
    startTest();
  };

  const handleStopAndEvaluate = async () => {
    if (readings.length === 0) {
      Alert.alert(
        'Insufficient Data',
        'Cannot evaluate screening session with 0 sensor readings. Ensure device is streaming telemetry.'
      );
      return;
    }

    try {
      const record = await stopTest();
      if (record) {
        router.replace('/test-result');
      }
    } catch (err: any) {
      Alert.alert('Inference Error', err.message || 'Failed to complete screening analysis.');
    }
  };

  const handleAbort = () => {
    Alert.alert(
      'Abort Screening Session',
      'Discard current session and clear sampled sensor telemetry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard Session', style: 'destructive', onPress: () => cancelTest() },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Session Header Card */}
      <View style={styles.card}>
        <View style={styles.sessionHeaderRow}>
          <View style={styles.timerBlock}>
            <Text style={styles.timerLabel}>SESSION DURATION</Text>
            <View style={styles.timerValueRow}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={22}
                color={isTestActive ? AppColors.statusWarning : AppColors.textMuted}
              />
              <Text
                style={[
                  styles.timerText,
                  isTestActive && styles.timerTextActive,
                ]}
              >
                {formatDuration(currentDuration)}
              </Text>
              <Text style={styles.sampleCount}>({readings.length} samples)</Text>
            </View>
          </View>

          <View style={styles.headerRightBadges}>
            <StatusBadge
              size="sm"
              label={isTestActive ? 'RECORDING' : 'STANDBY'}
              variant={isTestActive ? 'warning' : 'neutral'}
              iconName={isTestActive ? 'record-rec' : 'pause'}
            />
            <StatusBadge
              size="sm"
              label={isConnected ? (connectedDevice?.name || 'ESP32 Linked') : 'Hardware Offline'}
              variant={isConnected ? 'safe' : 'danger'}
              iconName={isConnected ? 'bluetooth-connect' : 'bluetooth-off'}
            />
          </View>
        </View>

        {/* Cloud Sync State */}
        <View style={styles.syncRow}>
          <View style={styles.syncLeft}>
            <MaterialCommunityIcons
              name={
                syncState.isSyncing
                  ? 'cloud-sync'
                  : syncState.queueLength > 0
                  ? 'cloud-upload'
                  : 'cloud-check'
              }
              size={16}
              color={
                syncState.isSyncing
                  ? AppColors.primaryCyan
                  : syncState.error
                  ? AppColors.statusDanger
                  : AppColors.statusSafe
              }
            />
            <Text style={styles.syncText}>
              {syncState.isSyncing
                ? 'Syncing telemetry to backend queue...'
                : syncState.queueLength > 0
                ? `${syncState.queueLength} packets awaiting cloud sync`
                : 'Telemetry synchronized with cloud'}
            </Text>
          </View>

          {isDemoMode && (
            <CustomButton
              title="Test Anomaly Spike"
              onPress={injectAnomaly}
              variant="outline"
              size="sm"
              style={styles.anomalyBtn}
              textStyle={{ fontSize: 11 }}
            />
          )}
        </View>
      </View>

      {/* Real-time Multi-Channel Chart */}
      <View style={styles.chartSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Sensor Telemetry Waveform</Text>
          <Text style={styles.sectionSub}>1.0 Hz Multi-Gas Stream</Text>
        </View>
        <RealtimeSensorChart readings={readings} height={190} />
      </View>

      {/* 3-Sensor Gauge Cards */}
      <View style={styles.gaugesContainer}>
        <Text style={styles.sectionTitle}>Active Sensor Channels</Text>

        <SensorGaugeCard
          channelName="Combustible Hydrocarbons, LPG & Smoke"
          sensorCode="MQ-2"
          currentValue={latestReading?.mq2 ?? 0}
          peakValue={peakMq2}
          warningThreshold={400}
          hazardThreshold={700}
        />

        <SensorGaugeCard
          channelName="Ethanol, Alcohol Vapors & Volatiles"
          sensorCode="MQ-3"
          currentValue={latestReading?.mq3 ?? 0}
          peakValue={peakMq3}
          warningThreshold={350}
          hazardThreshold={650}
        />

        <SensorGaugeCard
          channelName="Air Quality, NH3, Benzene & Toxic Vapors"
          sensorCode="MQ-135"
          currentValue={latestReading?.mq135 ?? 0}
          peakValue={peakMq135}
          warningThreshold={450}
          hazardThreshold={750}
        />
      </View>

      {/* Screening Action Controls */}
      <View style={styles.controlsCard}>
        {isTestActive ? (
          <View style={styles.activeControlsCol}>
            <CustomButton
              title="Complete Screening & Run AI Evaluation"
              onPress={handleStopAndEvaluate}
              loading={isInferring}
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={
                <MaterialCommunityIcons
                  name="shield-check"
                  size={22}
                  color="#0A0F1D"
                />
              }
            />

            <CustomButton
              title="Abort & Discard Session"
              onPress={handleAbort}
              disabled={isInferring}
              variant="ghost"
              size="sm"
              fullWidth
              textStyle={{ color: AppColors.statusDanger }}
            />
          </View>
        ) : (
          <CustomButton
            title="Start Screening Session"
            onPress={handleStartTest}
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={
              <MaterialCommunityIcons
                name="play-circle"
                size={22}
                color="#0A0F1D"
              />
            }
          />
        )}
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
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timerBlock: {
    flex: 1,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '900',
    color: AppColors.textPrimary,
    letterSpacing: 1,
  },
  timerTextActive: {
    color: AppColors.statusWarning,
  },
  sampleCount: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: '600',
  },
  headerRightBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38, 58, 99, 0.4)',
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  syncText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  anomalyBtn: {
    height: 30,
    paddingHorizontal: 8,
  },
  chartSection: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 11,
    color: AppColors.primaryCyan,
    fontWeight: '600',
  },
  gaugesContainer: {
    gap: 8,
  },
  controlsCard: {
    marginTop: 6,
  },
  activeControlsCol: {
    gap: 8,
  },
});
