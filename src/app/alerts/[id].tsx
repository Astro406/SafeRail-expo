import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAlerts } from '@/context/AlertsContext';
import { CustomButton } from '@/components/CustomButton';
import { CustomTextField } from '@/components/CustomTextField';
import { StatusBadge } from '@/components/StatusBadge';
import { AppColors } from '@/theme/colors';
import { formatDate, formatTime } from '@/utils/dateFormatter';

export default function AlertDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { alerts, reviewAlert } = useAlerts();

  const alertItem = alerts.find((a) => a.id === id);

  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!alertItem) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="alert-remove-outline"
          size={56}
          color={AppColors.textMuted}
        />
        <Text style={styles.emptyTitle}>Alert Not Found</Text>
        <Text style={styles.emptySub}>
          The specified surveillance alert could not be retrieved from active memory.
        </Text>
        <CustomButton
          title="Back to Alerts"
          onPress={() => router.back()}
          variant="primary"
          style={styles.emptyBtn}
        />
      </View>
    );
  }

  const isUnreviewed = alertItem.review_status === 'unreviewed';
  const isVerified = alertItem.review_status === 'verified';

  const handleReview = async (status: 'verified' | 'false_alarm') => {
    setIsSubmitting(true);
    try {
      await reviewAlert(alertItem.id, status, reviewNotes.trim() || undefined);
      Alert.alert(
        'Review Submitted',
        status === 'verified'
          ? 'Alert marked as VERIFIED HAZARD. Protocol alert dispatched.'
          : 'Alert marked as FALSE ALARM.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Review Error', err.message || 'Could not update review status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const objectClass = alertItem.object_class || alertItem.objectClass || 'OBJECT';
  const confidence = alertItem.confidence ?? 0.92;
  const cameraId = alertItem.camera_id || alertItem.cameraId || 'CAM-01';
  const stationId = alertItem.station_id || 'NDLS';
  const snapshotUrl = alertItem.snapshot_url || alertItem.snapshotUrl;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Alert Header */}
      <View style={styles.card}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.alertClass}>{objectClass.toUpperCase()}</Text>
            <Text style={styles.alertSub}>
              Camera {cameraId} • Station {stationId}
            </Text>
          </View>
          <StatusBadge
            size="md"
            label={isUnreviewed ? 'Unreviewed' : isVerified ? 'Verified' : 'False Alarm'}
            variant={isUnreviewed ? 'warning' : isVerified ? 'danger' : 'neutral'}
          />
        </View>

        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>AI Model Confidence:</Text>
          <Text style={styles.confidenceVal}>
            {(confidence * 100).toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Snapshot Preview Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vision Snapshot & Detection Box</Text>
        <View style={styles.imageContainer}>
          {snapshotUrl ? (
            <Image
              source={{ uri: snapshotUrl }}
              style={styles.snapshotImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.simulatedSnapshot}>
              <MaterialCommunityIcons name="cctv" size={48} color={AppColors.primaryCyan} />
              <Text style={styles.simText}>Luggage Conveyor Snapshot</Text>
              <View style={styles.simBox}>
                <Text style={styles.simBoxText}>
                  [{objectClass.toUpperCase()}: {(confidence * 100).toFixed(0)}%]
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Detection Metadata */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detection Telemetry</Text>
        <View style={styles.metaTable}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Alert ID</Text>
            <Text style={styles.metaVal}>{alertItem.id}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Timestamp</Text>
            <Text style={styles.metaVal}>
              {formatDate(alertItem.timestamp)} {formatTime(alertItem.timestamp)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Threat Level</Text>
            <Text style={[styles.metaVal, { color: AppColors.statusDanger, fontWeight: '800' }]}>
              {alertItem.threat_level || 'CRITICAL'}
            </Text>
          </View>
          {alertItem.bbox && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Bounding Box</Text>
              <Text style={styles.metaVal}>
                [{alertItem.bbox.map((b) => b.toFixed(2)).join(', ')}]
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Officer Review Form or Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Security Officer Review</Text>

        {isUnreviewed ? (
          <View style={styles.reviewForm}>
            <CustomTextField
              placeholder="Enter verification notes or physical search observation..."
              value={reviewNotes}
              onChangeText={setReviewNotes}
              multiline
              numberOfLines={2}
              style={styles.notesInput}
            />

            <View style={styles.reviewButtonsRow}>
              <CustomButton
                title="Mark Verified Hazard"
                onPress={() => handleReview('verified')}
                loading={isSubmitting}
                variant="danger"
                size="md"
                style={styles.halfBtn}
                leftIcon={<MaterialCommunityIcons name="alert-octagon" size={18} color="#FFFFFF" />}
              />

              <CustomButton
                title="Dismiss False Alarm"
                onPress={() => handleReview('false_alarm')}
                loading={isSubmitting}
                variant="secondary"
                size="md"
                style={styles.halfBtn}
                leftIcon={<MaterialCommunityIcons name="close-circle-outline" size={18} color={AppColors.textSecondary} />}
              />
            </View>
          </View>
        ) : (
          <View style={styles.reviewedNotice}>
            <MaterialCommunityIcons
              name={isVerified ? 'shield-alert' : 'check-circle-outline'}
              size={24}
              color={isVerified ? AppColors.statusDanger : AppColors.statusSafe}
            />
            <View style={styles.reviewedTextCol}>
              <Text style={styles.reviewedTitle}>
                {isVerified ? 'VERIFIED SECURITY HAZARD' : 'DISMISSED AS FALSE ALARM'}
              </Text>
              <Text style={styles.reviewedSub}>
                Reviewed on {formatDate(alertItem.timestamp)}
              </Text>
            </View>
          </View>
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertClass: {
    fontSize: 18,
    fontWeight: '900',
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
  },
  alertSub: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38, 58, 99, 0.4)',
  },
  confidenceLabel: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  confidenceVal: {
    fontSize: 13,
    fontWeight: '800',
    color: AppColors.primaryCyan,
  },
  imageContainer: {
    height: 200,
    borderRadius: 8,
    backgroundColor: '#0F1829',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snapshotImage: {
    width: '100%',
    height: '100%',
  },
  simulatedSnapshot: {
    alignItems: 'center',
    gap: 8,
  },
  simText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  simBox: {
    borderWidth: 2,
    borderColor: AppColors.statusDanger,
    backgroundColor: 'rgba(255, 61, 87, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  simBoxText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.statusDanger,
  },
  metaTable: {
    backgroundColor: '#0F1829',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaKey: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  reviewForm: {
    gap: 10,
  },
  notesInput: {
    marginBottom: 0,
  },
  reviewButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
  },
  reviewedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F1829',
    borderRadius: 8,
    padding: 12,
  },
  reviewedTextCol: {
    flex: 1,
  },
  reviewedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  reviewedSub: {
    fontSize: 11,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyBtn: {
    marginTop: 12,
  },
});
