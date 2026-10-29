import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAlerts } from '@/context/AlertsContext';
import { useTest } from '@/context/TestContext';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyStateView } from '@/components/EmptyStateView';
import { AppColors } from '@/theme/colors';
import { formatDate, formatTime } from '@/utils/dateFormatter';
import { RailGuardAlertModel } from '@/types';

type TabType = 'VISION' | 'SENSORS';
type VisionFilter = 'ALL' | 'UNREVIEWED' | 'VERIFIED' | 'FALSE_ALARM';

export default function AlertsScreen() {
  const router = useRouter();
  const { alerts, isLoading, refreshAlerts } = useAlerts();
  const { records } = useTest();

  const [activeTab, setActiveTab] = useState<TabType>('VISION');
  const [visionFilter, setVisionFilter] = useState<VisionFilter>('ALL');

  const filteredVisionAlerts = alerts.filter((alert) => {
    if (visionFilter === 'UNREVIEWED') return alert.review_status === 'unreviewed';
    if (visionFilter === 'VERIFIED') return alert.review_status === 'verified';
    if (visionFilter === 'FALSE_ALARM') return alert.review_status === 'false_alarm';
    return true;
  });

  // Extract elevated/hazard sensor events from past test sessions
  const sensorEvents = records.filter(
    (r) => r.result?.verdict === 'HAZARD' || r.result?.verdict === 'ELEVATED'
  );

  const renderVisionItem = ({ item }: { item: RailGuardAlertModel }) => {
    const isUnreviewed = (item.review_status || item.reviewStatus) === 'unreviewed';
    const isVerified = (item.review_status || item.reviewStatus) === 'verified';
    const objectClass = item.object_class || item.objectClass || 'OBJECT';
    const confidence = item.confidence ?? 0.92;

    const threatColor =
      item.threat_level === 'CRITICAL' || item.threat_level === 'HIGH'
        ? AppColors.statusDanger
        : item.threat_level === 'MEDIUM'
        ? AppColors.statusWarning
        : AppColors.statusInfo;

    return (
      <Pressable
        style={styles.alertCard}
        onPress={() => router.push(`/alerts/${String(item.id)}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.threatIconBox, { borderColor: threatColor }]}>
              <MaterialCommunityIcons
                name="cctv"
                size={20}
                color={threatColor}
              />
            </View>
            <View>
              <Text style={styles.threatTitle}>{objectClass.toUpperCase()}</Text>
              <Text style={styles.cameraText}>
                Camera: {item.camera_id || item.cameraId} • Station: {item.station_id || 'NDLS'}
              </Text>
            </View>
          </View>

          <StatusBadge
            size="sm"
            label={isUnreviewed ? 'Unreviewed' : isVerified ? 'Verified' : 'False Alarm'}
            variant={isUnreviewed ? 'warning' : isVerified ? 'danger' : 'neutral'}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.snapshotPlaceholder}>
            {item.snapshot_url || item.snapshotUrl ? (
              <Image
                source={{ uri: item.snapshot_url || item.snapshotUrl }}
                style={styles.snapshotImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noSnapshot}>
                <MaterialCommunityIcons name="image-outline" size={28} color={AppColors.textMuted} />
                <Text style={styles.noSnapshotText}>Vision Snapshot Available</Text>
              </View>
            )}
          </View>

          <View style={styles.alertMetaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Confidence:</Text>
              <Text style={[styles.metaVal, { color: threatColor }]}>
                {(confidence * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Threat Level:</Text>
              <Text style={[styles.metaVal, { color: threatColor }]}>
                {item.threat_level || 'ELEVATED'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Timestamp:</Text>
              <Text style={styles.metaVal}>
                {formatDate(item.timestamp)} {formatTime(item.timestamp)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.tapPrompt}>Tap to review image & verify hazard</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={AppColors.primaryCyan} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'VISION' && styles.tabBtnActive]}
          onPress={() => setActiveTab('VISION')}
        >
          <MaterialCommunityIcons
            name="cctv"
            size={18}
            color={activeTab === 'VISION' ? AppColors.primaryCyan : AppColors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'VISION' && styles.tabTextActive]}>
            Luggage Vision ({alerts.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === 'SENSORS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('SENSORS')}
        >
          <MaterialCommunityIcons
            name="smoke-detector-alert"
            size={18}
            color={activeTab === 'SENSORS' ? AppColors.primaryCyan : AppColors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'SENSORS' && styles.tabTextActive]}>
            Sensor Events ({sensorEvents.length})
          </Text>
        </Pressable>
      </View>

      {/* Vision Sub-filters */}
      {activeTab === 'VISION' && (
        <View style={styles.subFilterRow}>
          {(['ALL', 'UNREVIEWED', 'VERIFIED', 'FALSE_ALARM'] as VisionFilter[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.subFilterChip, visionFilter === f && styles.subFilterActive]}
              onPress={() => setVisionFilter(f)}
            >
              <Text
                style={[
                  styles.subFilterText,
                  visionFilter === f && styles.subFilterTextActive,
                ]}
              >
                {f.replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Main Content */}
      {activeTab === 'VISION' ? (
        <FlatList
          data={filteredVisionAlerts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderVisionItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshAlerts}
              tintColor={AppColors.primaryCyan}
            />
          }
          ListEmptyComponent={
            <EmptyStateView
              title="No Vision Alerts"
              description="No luggage vision threats reported from the RailGuard AI camera surveillance feed."
              iconName="cctv"
              actionTitle="Refresh Feed"
              onAction={refreshAlerts}
            />
          }
        />
      ) : (
        <FlatList
          data={sensorEvents}
          keyExtractor={(item) => item.id || item.testId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const recordId = item.id || item.testId || 'RECORD';
            const verdict = item.result?.verdict || 'ELEVATED';
            const timestamp = item.timestamp || item.startedAt || new Date().toISOString();
            const peak2 = item.peakMq2 ?? 0;
            const peak3 = item.peakMq3 ?? 0;
            const peak135 = item.peakMq135 ?? 0;

            return (
              <Pressable
                style={styles.sensorEventCard}
                onPress={() => router.push(`/test-history/${recordId}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <MaterialCommunityIcons
                      name="alert-octagon"
                      size={22}
                      color={
                        verdict === 'HAZARD'
                          ? AppColors.statusDanger
                          : AppColors.statusWarning
                      }
                    />
                    <View>
                      <Text style={styles.threatTitle}>
                        {verdict} TRIGGERED
                      </Text>
                      <Text style={styles.cameraText}>
                        Session #{recordId.substring(0, 8).toUpperCase()} • {formatDate(timestamp)} {formatTime(timestamp)}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge
                    size="sm"
                    label={verdict}
                    variant={verdict === 'HAZARD' ? 'danger' : 'warning'}
                  />
                </View>
                <Text style={styles.assessmentMessage}>{item.result?.assessment || 'Threshold exceeded'}</Text>
                <Text style={styles.peaksSummary}>
                  Peak Levels: MQ-2 {Math.round(peak2)} | MQ-3 {Math.round(peak3)} | MQ-135 {Math.round(peak135)} PPM
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyStateView
              title="No Sensor Threshold Events"
              description="All screening sessions currently registered nominal safety levels."
              iconName="check-decagram-outline"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.surfaceBorder,
    gap: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.primaryCyan,
  },
  subFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  subFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: AppColors.surfaceCard,
    borderWidth: 1,
    borderColor: AppColors.surfaceBorder,
  },
  subFilterActive: {
    borderColor: AppColors.primaryCyan,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  subFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textSecondary,
    letterSpacing: 0.4,
  },
  subFilterTextActive: {
    color: AppColors.primaryCyan,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  alertCard: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: AppColors.surfaceBorder,
    padding: 14,
  },
  sensorEventCard: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: AppColors.surfaceBorder,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  threatIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0F1A2C',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threatTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: AppColors.textPrimary,
    letterSpacing: 0.3,
  },
  cameraText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#0F1829',
    borderRadius: 8,
    padding: 10,
  },
  snapshotPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 6,
    backgroundColor: '#16233B',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snapshotImg: {
    width: '100%',
    height: '100%',
  },
  noSnapshot: {
    alignItems: 'center',
    gap: 4,
  },
  noSnapshotText: {
    fontSize: 8,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  alertMetaCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38, 58, 99, 0.4)',
  },
  tapPrompt: {
    fontSize: 11,
    color: AppColors.primaryCyan,
    fontWeight: '600',
  },
  assessmentMessage: {
    fontSize: 12,
    color: AppColors.textPrimary,
    lineHeight: 16,
    marginVertical: 6,
  },
  peaksSummary: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
});
