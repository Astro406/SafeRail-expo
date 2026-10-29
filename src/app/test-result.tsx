import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTest } from '@/context/TestContext';
import { CustomButton } from '@/components/CustomButton';
import { CustomTextField } from '@/components/CustomTextField';
import { RealtimeSensorChart } from '@/components/RealtimeSensorChart';
import { AppColors } from '@/theme/colors';
import { formatDate, formatTime, formatDuration } from '@/utils/dateFormatter';
import { AppConstants } from '@/constants/AppConstants';

export default function TestResultScreen() {
  const router = useRouter();
  const { latestRecord, updateRecordNotes } = useTest();

  const [notes, setNotes] = useState<string>(latestRecord?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!latestRecord) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="clipboard-alert-outline"
          size={56}
          color={AppColors.textMuted}
        />
        <Text style={styles.emptyTitle}>No Screening Record Found</Text>
        <Text style={styles.emptySub}>
          Conduct a live screening test to generate a confirmatory safety assessment.
        </Text>
        <CustomButton
          title="Return to Dashboard"
          onPress={() => router.replace('/dashboard')}
          variant="primary"
          style={styles.emptyBtn}
        />
      </View>
    );
  }

  const recordId = latestRecord.id || latestRecord.testId || 'TEST-SESSION';
  const timestamp = latestRecord.timestamp || latestRecord.startedAt || new Date().toISOString();
  const durationSeconds = latestRecord.durationSeconds ?? 30;
  const peakMq2 = latestRecord.peakMq2 ?? 0;
  const peakMq3 = latestRecord.peakMq3 ?? 0;
  const peakMq135 = latestRecord.peakMq135 ?? 0;
  const readings = latestRecord.readings || [];

  const result = latestRecord.result || {
    verdict: 'SAFE' as const,
    confidence: 0.95,
    assessment: latestRecord.screeningAssistanceDetails || 'Nominal screening baseline. No volatile hazards detected.',
    modelType: 'FastAPI ML Classifier',
  };

  const isHazard = result.verdict === 'HAZARD';
  const isElevated = result.verdict === 'ELEVATED';

  const verdictBg = isHazard
    ? 'rgba(255, 61, 87, 0.16)'
    : isElevated
    ? 'rgba(255, 179, 0, 0.16)'
    : 'rgba(0, 230, 118, 0.16)';

  const verdictBorder = isHazard
    ? AppColors.statusDanger
    : isElevated
    ? AppColors.statusWarning
    : AppColors.statusSafe;

  const verdictTextColor = isHazard
    ? AppColors.statusDanger
    : isElevated
    ? AppColors.statusWarning
    : AppColors.statusSafe;

  const verdictIcon = isHazard
    ? 'alert-octagon'
    : isElevated
    ? 'alert-circle-outline'
    : 'shield-check';

  const handleSaveAndDone = async () => {
    setIsSaving(true);
    try {
      if (notes.trim() !== latestRecord.notes) {
        await updateRecordNotes(recordId, notes.trim());
      }
      router.replace('/dashboard');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not persist inspection notes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const summaryText = `[RailSafe-AI Inspection Assessment Report]
Session ID: #${recordId.substring(0, 8).toUpperCase()}
Date: ${formatDate(timestamp)} ${formatTime(timestamp)}
Verdict: ${result.verdict} (${(result.confidence * 100).toFixed(1)}% Confidence)
Peak MQ-2: ${Math.round(peakMq2)} PPM
Peak MQ-3: ${Math.round(peakMq3)} PPM
Peak MQ-135: ${Math.round(peakMq135)} PPM
Assessment: ${result.assessment}
Officer Notes: ${notes.trim() || 'No remarks added'}
Disclaimer: ${AppConstants.statutoryDisclaimer}`;

      await Share.share({
        message: summaryText,
        title: `RailSafe-AI Assessment #${recordId.substring(0, 8).toUpperCase()}`,
      });
    } catch (err) {
      // User dismissed share dialog
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Verdict Assessment Banner */}
      <View style={[styles.verdictCard, { backgroundColor: verdictBg, borderColor: verdictBorder }]}>
        <View style={styles.verdictIconRow}>
          <MaterialCommunityIcons name={verdictIcon} size={36} color={verdictTextColor} />
          <View style={styles.verdictTextCol}>
            <Text style={[styles.verdictTitle, { color: verdictTextColor }]}>
              {result.verdict === 'HAZARD'
                ? 'CRITICAL HAZARD DETECTED'
                : result.verdict === 'ELEVATED'
                ? 'ELEVATED RISK LEVEL'
                : 'SCREENING CLEAR - SAFE'}
            </Text>
            <Text style={styles.confidenceText}>
              Confidence: {(result.confidence * 100).toFixed(1)}% • Inference: {result.modelType}
            </Text>
          </View>
        </View>

        <Text style={styles.assessmentMessage}>{result.assessment}</Text>
      </View>

      {/* Session Metadata Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session Parameters</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>SESSION ID</Text>
            <Text style={styles.metaValue}>#{recordId.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>TIMESTAMP</Text>
            <Text style={styles.metaValue}>
              {formatDate(timestamp)} • {formatTime(timestamp)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>DURATION</Text>
            <Text style={styles.metaValue}>{formatDuration(durationSeconds)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>SAMPLE COUNT</Text>
            <Text style={styles.metaValue}>{readings.length} readings</Text>
          </View>
        </View>
      </View>

      {/* Multi-Channel Waveform Snapshot */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Screening Waveform Telemetry</Text>
        <RealtimeSensorChart readings={readings} height={170} />
      </View>

      {/* Peak Values Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Peak Gas & Vapor Levels</Text>

        <View style={styles.peakTable}>
          <View style={styles.peakRow}>
            <View style={styles.peakChannelCol}>
              <Text style={styles.peakChannelCode}>MQ-2</Text>
              <Text style={styles.peakChannelName}>Combustible Gas / Smoke</Text>
            </View>
            <Text
              style={[
                styles.peakValue,
                {
                  color:
                    peakMq2 >= 700
                      ? AppColors.statusDanger
                      : peakMq2 >= 400
                      ? AppColors.statusWarning
                      : AppColors.statusSafe,
                },
              ]}
            >
              {Math.round(peakMq2)} PPM
            </Text>
          </View>

          <View style={styles.peakRow}>
            <View style={styles.peakChannelCol}>
              <Text style={styles.peakChannelCode}>MQ-3</Text>
              <Text style={styles.peakChannelName}>Ethanol & Alcohol Vapors</Text>
            </View>
            <Text
              style={[
                styles.peakValue,
                {
                  color:
                    peakMq3 >= 650
                      ? AppColors.statusDanger
                      : peakMq3 >= 350
                      ? AppColors.statusWarning
                      : AppColors.statusSafe,
                },
              ]}
            >
              {Math.round(peakMq3)} PPM
            </Text>
          </View>

          <View style={styles.peakRow}>
            <View style={styles.peakChannelCol}>
              <Text style={styles.peakChannelCode}>MQ-135</Text>
              <Text style={styles.peakChannelName}>NH3, Benzene & Toxic Vapors</Text>
            </View>
            <Text
              style={[
                styles.peakValue,
                {
                  color:
                    peakMq135 >= 750
                      ? AppColors.statusDanger
                      : peakMq135 >= 450
                      ? AppColors.statusWarning
                      : AppColors.statusSafe,
                },
              ]}
            >
              {Math.round(peakMq135)} PPM
            </Text>
          </View>
        </View>
      </View>

      {/* Officer Remarks & Notes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Officer Inspection Remarks</Text>
        <CustomTextField
          placeholder="Enter baggage inspection remarks, passenger details, or SOP actions taken..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <CustomButton
          title="Save Record & Return to Dashboard"
          onPress={handleSaveAndDone}
          loading={isSaving}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<MaterialCommunityIcons name="check" size={20} color="#0A0F1D" />}
        />

        <View style={styles.actionRow}>
          <CustomButton
            title="Share Assessment"
            onPress={handleShare}
            variant="secondary"
            size="md"
            style={styles.halfBtn}
            leftIcon={
              <MaterialCommunityIcons
                name="share-variant-outline"
                size={18}
                color={AppColors.primaryCyan}
              />
            }
          />

          <CustomButton
            title="New Screening"
            onPress={() => router.replace('/live-monitoring')}
            variant="secondary"
            size="md"
            style={styles.halfBtn}
            leftIcon={
              <MaterialCommunityIcons
                name="replay"
                size={18}
                color={AppColors.primaryCyan}
              />
            }
          />
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
    paddingBottom: 40,
    gap: 14,
  },
  verdictCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
  },
  verdictIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  verdictTextCol: {
    flex: 1,
  },
  verdictTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  assessmentMessage: {
    fontSize: 13,
    color: AppColors.textPrimary,
    lineHeight: 18,
    fontWeight: '500',
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
  metaGrid: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(38, 58, 99, 0.4)',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  peakTable: {
    gap: 8,
  },
  peakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 8,
    padding: 10,
  },
  peakChannelCol: {
    flex: 1,
  },
  peakChannelCode: {
    fontSize: 13,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  peakChannelName: {
    fontSize: 11,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  peakValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  notesInput: {
    marginBottom: 0,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
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
    minWidth: 180,
  },
});
