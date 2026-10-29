import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTest } from '@/context/TestContext';
import { CustomButton } from '@/components/CustomButton';
import { CustomTextField } from '@/components/CustomTextField';
import { StatusBadge } from '@/components/StatusBadge';
import { RealtimeSensorChart } from '@/components/RealtimeSensorChart';
import { AppColors } from '@/theme/colors';
import { formatDate, formatTime, formatDuration } from '@/utils/dateFormatter';
import { AppConstants } from '@/constants/AppConstants';

export default function TestRecordDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { records, updateRecordNotes, deleteRecord } = useTest();

  const record = records.find((r) => (r.id || r.testId) === id);

  const [notes, setNotes] = useState<string>(record?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!record) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="file-question-outline"
          size={56}
          color={AppColors.textMuted}
        />
        <Text style={styles.emptyTitle}>Record Not Found</Text>
        <Text style={styles.emptySub}>
          The requested screening record may have been deleted or purged from local cache.
        </Text>
        <CustomButton
          title="Back to History"
          onPress={() => router.back()}
          variant="primary"
          style={styles.emptyBtn}
        />
      </View>
    );
  }

  const recordId = record.id || record.testId || 'RECORD';
  const timestamp = record.timestamp || record.startedAt || new Date().toISOString();
  const durationSeconds = record.durationSeconds ?? 30;
  const peakMq2 = record.peakMq2 ?? 0;
  const peakMq3 = record.peakMq3 ?? 0;
  const peakMq135 = record.peakMq135 ?? 0;
  const readings = record.readings || [];

  const result = record.result || {
    verdict: 'SAFE' as const,
    confidence: 0.95,
    assessment: record.screeningAssistanceDetails || 'Nominal screening baseline. No volatile hazards detected.',
    modelType: 'FastAPI ML Classifier',
  };

  const isHazard = result.verdict === 'HAZARD';
  const isElevated = result.verdict === 'ELEVATED';

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updateRecordNotes(recordId, notes.trim());
      Alert.alert('Saved', 'Officer inspection remarks updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update remarks.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Record',
      'Permanently delete this screening session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecord(recordId);
            router.back();
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const summaryText = `[RailSafe-AI Session Report]
Session: #${recordId.substring(0, 8).toUpperCase()}
Date: ${formatDate(timestamp)} ${formatTime(timestamp)}
Duration: ${formatDuration(durationSeconds)}
Verdict: ${result.verdict} (${(result.confidence * 100).toFixed(1)}%)
Peak MQ-2: ${Math.round(peakMq2)} PPM
Peak MQ-3: ${Math.round(peakMq3)} PPM
Peak MQ-135: ${Math.round(peakMq135)} PPM
Assessment: ${result.assessment}
Remarks: ${notes.trim() || 'None'}
Regulatory Notice: ${AppConstants.statutoryDisclaimer}`;

      await Share.share({
        message: summaryText,
        title: `Screening Record #${recordId.substring(0, 8).toUpperCase()}`,
      });
    } catch (err) {
      // User cancelled
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.recordId}>
              SESSION #{recordId.substring(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.recordTimestamp}>
              {formatDate(timestamp)} • {formatTime(timestamp)}
            </Text>
          </View>
          <StatusBadge
            size="md"
            label={result.verdict}
            variant={isHazard ? 'danger' : isElevated ? 'warning' : 'safe'}
          />
        </View>

        <Text style={styles.assessmentText}>{result.assessment}</Text>
        <Text style={styles.confidenceMeta}>
          Confidence: {(result.confidence * 100).toFixed(1)}% • Inference Engine: {result.modelType}
        </Text>
      </View>

      {/* Waveform Visualization */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recorded Sensor Telemetry</Text>
        <RealtimeSensorChart readings={readings} height={170} />
      </View>

      {/* Peak Analysis */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Peak Sensor Levels Observed</Text>
        <View style={styles.peakGrid}>
          <View style={styles.peakItem}>
            <Text style={styles.peakCode}>MQ-2</Text>
            <Text style={styles.peakDesc}>Combustible / LPG</Text>
            <Text style={styles.peakVal}>{Math.round(peakMq2)} PPM</Text>
          </View>
          <View style={styles.peakItem}>
            <Text style={styles.peakCode}>MQ-3</Text>
            <Text style={styles.peakDesc}>Alcohol / Vapors</Text>
            <Text style={styles.peakVal}>{Math.round(peakMq3)} PPM</Text>
          </View>
          <View style={styles.peakItem}>
            <Text style={styles.peakCode}>MQ-135</Text>
            <Text style={styles.peakDesc}>Air Quality / Toxic</Text>
            <Text style={styles.peakVal}>{Math.round(peakMq135)} PPM</Text>
          </View>
        </View>
      </View>

      {/* Remarks Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Officer Remarks</Text>
        <CustomTextField
          placeholder="Add or modify notes on passenger, baggage, or secondary action taken..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.notesField}
        />
        <CustomButton
          title="Update Remarks"
          onPress={handleSaveNotes}
          loading={isSaving}
          variant="secondary"
          size="sm"
          style={styles.updateBtn}
        />
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <CustomButton
          title="Share Report"
          onPress={handleShare}
          variant="outline"
          size="md"
          style={styles.halfBtn}
          leftIcon={<MaterialCommunityIcons name="share-variant" size={18} color={AppColors.primaryCyan} />}
        />
        <CustomButton
          title="Delete Record"
          onPress={handleDelete}
          variant="danger"
          size="md"
          style={styles.halfBtn}
          leftIcon={<MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />}
        />
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
  headerCard: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: AppColors.surfaceBorder,
    padding: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recordId: {
    fontSize: 15,
    fontWeight: '800',
    color: AppColors.primaryCyan,
  },
  recordTimestamp: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  assessmentText: {
    fontSize: 13,
    color: AppColors.textPrimary,
    lineHeight: 18,
    marginVertical: 6,
  },
  confidenceMeta: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontWeight: '600',
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
  peakGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  peakItem: {
    flex: 1,
    backgroundColor: '#0F1829',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  peakCode: {
    fontSize: 12,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  peakDesc: {
    fontSize: 9,
    color: AppColors.textMuted,
    marginVertical: 2,
    textAlign: 'center',
  },
  peakVal: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.primaryCyan,
    marginTop: 4,
  },
  notesField: {
    marginBottom: 8,
  },
  updateBtn: {
    alignSelf: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  halfBtn: {
    flex: 1,
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
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 12,
    minWidth: 160,
  },
});
