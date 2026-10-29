import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useBle } from '@/context/BleContext';
import { useTest } from '@/context/TestContext';
import { useAlerts } from '@/context/AlertsContext';
import { useSettings } from '@/context/SettingsContext';
import { AppBrandLogo } from '@/components/AppBrandLogo';
import { CustomButton } from '@/components/CustomButton';
import { StatusBadge } from '@/components/StatusBadge';
import { AppColors } from '@/theme/colors';
import { AppConstants } from '@/constants/AppConstants';
import { formatDate, formatTime } from '@/utils/dateFormatter';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isConnected, connectedDevice, isDemoMode, toggleDemoMode } = useBle();
  const { isTestActive, currentDuration, latestRecord, latestReading } = useTest();
  const { unreviewedCount, alerts, refreshAlerts, isLoading: alertsLoading } = useAlerts();
  const { settings } = useSettings();

  useEffect(() => {
    refreshAlerts();
  }, []);

  const handleStartOrResume = () => {
    router.push('/live-monitoring');
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of the handheld screening terminal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={alertsLoading}
            onRefresh={refreshAlerts}
            tintColor={AppColors.primaryCyan}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <AppBrandLogo size="sm" showSubtitle={false} />
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconButton}
              onPress={() => router.push('/alerts')}
            >
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={22}
                color={unreviewedCount > 0 ? AppColors.statusDanger : AppColors.textPrimary}
              />
              {unreviewedCount > 0 && (
                <View style={styles.badgeIndicator}>
                  <Text style={styles.badgeIndicatorText}>{unreviewedCount}</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={styles.iconButton}
              onPress={() => router.push('/settings')}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
                color={AppColors.textPrimary}
              />
            </Pressable>

            <Pressable style={styles.iconButton} onPress={handleLogout}>
              <MaterialCommunityIcons
                name="logout-variant"
                size={22}
                color={AppColors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* Officer Identity Card */}
        <View style={styles.officerCard}>
          <View style={styles.officerAvatar}>
            <MaterialCommunityIcons
              name="shield-account"
              size={24}
              color={AppColors.primaryCyan}
            />
          </View>
          <View style={styles.officerDetails}>
            <Text style={styles.officerName}>{user?.name || 'Security Officer'}</Text>
            <View style={styles.officerMetaRow}>
              <Text style={styles.officerBadge}>ID: {user?.badgeId || 'RPF-DEMO'}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.officerStation}>{user?.station || 'Platform Screening'}</Text>
            </View>
          </View>
        </View>

        {/* Status Ribbon (BLE, Sync, Demo) */}
        <View style={styles.statusRibbon}>
          <Pressable onPress={() => router.push('/device-connection')}>
            <StatusBadge
              size="sm"
              label={isConnected ? 'ESP32 Linked' : 'Node Disconnected'}
              variant={isConnected ? 'safe' : 'neutral'}
              iconName={isConnected ? 'bluetooth-connect' : 'bluetooth-off'}
            />
          </Pressable>

          <Pressable onPress={() => router.push('/alerts')}>
            <StatusBadge
              size="sm"
              label={unreviewedCount > 0 ? `${unreviewedCount} Vision Alerts` : 'Vision Guard OK'}
              variant={unreviewedCount > 0 ? 'warning' : 'info'}
              iconName="cctv"
            />
          </Pressable>

          <Pressable onPress={toggleDemoMode}>
            <StatusBadge
              size="sm"
              label={isDemoMode ? 'Demo Mode' : 'Hardware Stream'}
              variant={isDemoMode ? 'warning' : 'cyan'}
              iconName={isDemoMode ? 'flask-outline' : 'chip'}
            />
          </Pressable>
        </View>

        {/* Primary Call to Action */}
        <View style={styles.ctaContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              isTestActive && styles.ctaActiveBorder,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleStartOrResume}
          >
            <LinearGradient
              colors={
                isTestActive
                  ? ['#FFB300', '#FF8F00']
                  : [AppColors.primaryCyan, AppColors.primaryBlue]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <View style={styles.ctaIconCircle}>
                <MaterialCommunityIcons
                  name={isTestActive ? 'gauge-full' : 'qrcode-scan'}
                  size={28}
                  color="#0A0F1D"
                />
              </View>
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaTitle}>
                  {isTestActive
                    ? `ACTIVE SCREENING IN PROGRESS (${Math.floor(currentDuration / 60)}:${(currentDuration % 60).toString().padStart(2, '0')})`
                    : 'START SCREENING SESSION'}
                </Text>
                <Text style={styles.ctaSubtitle}>
                  {isTestActive
                    ? 'Tap to return to live sensor gauges & chart'
                    : 'Analyze chemical vapors, alcohol & baggage threats'}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={26}
                color="#0A0F1D"
              />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Hardware Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons
                name="chip"
                size={20}
                color={AppColors.primaryCyan}
              />
              <Text style={styles.cardTitle}>Handheld Hardware Node</Text>
            </View>
            <Pressable onPress={() => router.push('/device-connection')}>
              <Text style={styles.actionLink}>
                {isConnected ? 'Manage' : 'Connect'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.hardwareGrid}>
            <View style={styles.hardwareItem}>
              <Text style={styles.hwLabel}>NODE IDENTIFIER</Text>
              <Text style={styles.hwValue}>
                {connectedDevice ? connectedDevice.name : isDemoMode ? 'SIM-ESP32-NODE' : 'No Node Linked'}
              </Text>
            </View>
            <View style={styles.hardwareItem}>
              <Text style={styles.hwLabel}>TELEMETRY LINK</Text>
              <View style={styles.hwStatusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isConnected ? AppColors.statusSafe : AppColors.textMuted },
                  ]}
                />
                <Text style={styles.hwValue}>
                  {isConnected ? 'BLE 2.4GHz Active' : 'Disconnected'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Live Multi-Channel Sensor Snapshot */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons
                name="smoke-detector-outline"
                size={20}
                color={AppColors.primaryCyan}
              />
              <Text style={styles.cardTitle}>Sensor Channels (Live PPM)</Text>
            </View>
            <Text style={styles.sensorStatusBadge}>
              {latestReading ? 'STREAMING' : 'IDLE'}
            </Text>
          </View>

          <View style={styles.sensorMetricsRow}>
            {/* MQ-2 */}
            <View style={styles.sensorMetricBox}>
              <Text style={styles.sensorMetricCode}>MQ-2</Text>
              <Text style={styles.sensorMetricName}>Combustible Gas</Text>
              <Text
                style={[
                  styles.sensorMetricValue,
                  {
                    color:
                      (latestReading?.mq2 ?? 0) >= 700
                        ? AppColors.statusDanger
                        : (latestReading?.mq2 ?? 0) >= 400
                        ? AppColors.statusWarning
                        : AppColors.primaryCyan,
                  },
                ]}
              >
                {latestReading && latestReading.mq2 !== undefined ? Math.round(latestReading.mq2) : '--'}
              </Text>
              <Text style={styles.sensorMetricUnit}>PPM</Text>
            </View>

            {/* MQ-3 */}
            <View style={styles.sensorMetricBox}>
              <Text style={styles.sensorMetricCode}>MQ-3</Text>
              <Text style={styles.sensorMetricName}>Alcohol / Vapor</Text>
              <Text
                style={[
                  styles.sensorMetricValue,
                  {
                    color:
                      (latestReading?.mq3 ?? 0) >= 650
                        ? AppColors.statusDanger
                        : (latestReading?.mq3 ?? 0) >= 350
                        ? AppColors.statusWarning
                        : AppColors.statusWarning,
                  },
                ]}
              >
                {latestReading && latestReading.mq3 !== undefined ? Math.round(latestReading.mq3) : '--'}
              </Text>
              <Text style={styles.sensorMetricUnit}>PPM</Text>
            </View>

            {/* MQ-135 */}
            <View style={styles.sensorMetricBox}>
              <Text style={styles.sensorMetricCode}>MQ-135</Text>
              <Text style={styles.sensorMetricName}>Air Quality/NH3</Text>
              <Text
                style={[
                  styles.sensorMetricValue,
                  {
                    color:
                      (latestReading?.mq135 ?? 0) >= 750
                        ? AppColors.statusDanger
                        : (latestReading?.mq135 ?? 0) >= 450
                        ? AppColors.statusWarning
                        : '#818cf8',
                  },
                ]}
              >
                {latestReading && latestReading.mq135 !== undefined ? Math.round(latestReading.mq135) : '--'}
              </Text>
              <Text style={styles.sensorMetricUnit}>PPM</Text>
            </View>
          </View>
        </View>

        {/* RailGuard Vision Integration Card */}
        <Pressable
          style={styles.card}
          onPress={() => router.push('/alerts')}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons
                name="cctv"
                size={20}
                color={AppColors.accentTeal}
              />
              <Text style={styles.cardTitle}>RailGuard AI Vision Cloud</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={AppColors.textSecondary}
            />
          </View>

          <Text style={styles.visionDescription}>
            Synchronized with Render vision analytics server. Automatic real-time detection of prohibited items, weapons, and baggage anomalies.
          </Text>

          <View style={styles.visionStatsRow}>
            <View style={styles.visionStatItem}>
              <Text style={styles.visionStatNumber}>{alerts.length}</Text>
              <Text style={styles.visionStatLabel}>Total Detections</Text>
            </View>
            <View style={styles.visionStatItem}>
              <Text
                style={[
                  styles.visionStatNumber,
                  { color: unreviewedCount > 0 ? AppColors.statusWarning : AppColors.statusSafe },
                ]}
              >
                {unreviewedCount}
              </Text>
              <Text style={styles.visionStatLabel}>Pending Review</Text>
            </View>
            <View style={styles.visionStatItem}>
              <Text style={[styles.visionStatNumber, { color: AppColors.primaryCyan }]}>
                {settings.railGuardApiUrl.includes('render') ? 'Cloud' : 'Local'}
              </Text>
              <Text style={styles.visionStatLabel}>Target Server</Text>
            </View>
          </View>
        </Pressable>

        {/* Recent Screening Logs Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialCommunityIcons
                name="history"
                size={20}
                color={AppColors.primaryCyan}
              />
              <Text style={styles.cardTitle}>Recent Screening Record</Text>
            </View>
            <Pressable onPress={() => router.push('/test-history/index')}>
              <Text style={styles.actionLink}>All Logs</Text>
            </Pressable>
          </View>

          {latestRecord ? (
            <Pressable
              style={styles.recordPreview}
              onPress={() => router.push(`/test-history/${latestRecord.id || latestRecord.testId}`)}
            >
              <View style={styles.recordHeader}>
                <Text style={styles.recordId}>
                  SESSION #{(latestRecord.id || latestRecord.testId || 'RECORD').substring(0, 8).toUpperCase()}
                </Text>
                <StatusBadge
                  size="sm"
                  label={latestRecord.result?.verdict || 'SAFE'}
                  variant={
                    latestRecord.result?.verdict === 'HAZARD'
                      ? 'danger'
                      : latestRecord.result?.verdict === 'ELEVATED'
                      ? 'warning'
                      : 'safe'
                  }
                />
              </View>

              <View style={styles.recordBody}>
                <Text style={styles.recordTime}>
                  {formatDate(latestRecord.timestamp || latestRecord.startedAt || new Date())} • {formatTime(latestRecord.timestamp || latestRecord.startedAt || new Date())} ({latestRecord.durationSeconds ?? 30}s)
                </Text>
                <Text style={styles.recordPeaks}>
                  Peaks: MQ-2 {Math.round(latestRecord.peakMq2 ?? 0)} | MQ-3 {Math.round(latestRecord.peakMq3 ?? 0)} | MQ-135 {Math.round(latestRecord.peakMq135 ?? 0)}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.emptyRecord}>
              <Text style={styles.emptyRecordText}>
                No screening records yet. Launch a session to begin logging.
              </Text>
            </View>
          )}
        </View>

        {/* Regulatory Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <MaterialCommunityIcons
            name="alert-octagon-outline"
            size={18}
            color={AppColors.textMuted}
          />
          <Text style={styles.disclaimerText}>
            {AppConstants.statutoryDisclaimer}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceCard,
    borderWidth: 1,
    borderColor: AppColors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: AppColors.statusDanger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeIndicatorText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  officerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.surfaceBorder,
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  officerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officerDetails: {
    flex: 1,
  },
  officerName: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  officerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  officerBadge: {
    fontSize: 12,
    color: AppColors.primaryCyan,
    fontWeight: '600',
  },
  metaDivider: {
    color: AppColors.textMuted,
    fontSize: 12,
  },
  officerStation: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  statusRibbon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  ctaContainer: {
    marginBottom: 16,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  ctaActiveBorder: {
    borderColor: AppColors.statusWarning,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  ctaIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 15, 29, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0A0F1D',
    letterSpacing: 0.5,
  },
  ctaSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(10, 15, 29, 0.85)',
    marginTop: 2,
  },
  card: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: AppColors.surfaceBorder,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  actionLink: {
    fontSize: 13,
    color: AppColors.primaryCyan,
    fontWeight: '600',
  },
  hardwareGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 12,
  },
  hardwareItem: {
    flex: 1,
  },
  hwLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hwValue: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  hwStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sensorStatusBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: AppColors.primaryCyan,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sensorMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sensorMetricBox: {
    flex: 1,
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(38, 58, 99, 0.5)',
  },
  sensorMetricCode: {
    fontSize: 13,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  sensorMetricName: {
    fontSize: 9,
    fontWeight: '600',
    color: AppColors.textMuted,
    textAlign: 'center',
    marginVertical: 2,
  },
  sensorMetricValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  sensorMetricUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  visionDescription: {
    fontSize: 12,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  visionStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 10,
  },
  visionStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  visionStatNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  visionStatLabel: {
    fontSize: 10,
    color: AppColors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  recordPreview: {
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordId: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primaryCyan,
  },
  recordBody: {
    gap: 2,
  },
  recordTime: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  recordPeaks: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  emptyRecord: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyRecordText: {
    fontSize: 12,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: AppColors.textMuted,
    lineHeight: 16,
  },
});
