import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTest } from '@/context/TestContext';
import { CustomTextField } from '@/components/CustomTextField';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyStateView } from '@/components/EmptyStateView';
import { AppColors } from '@/theme/colors';
import { formatDate, formatTime } from '@/utils/dateFormatter';
import { TestRecord } from '@/types';

type FilterType = 'ALL' | 'SAFE' | 'ELEVATED' | 'HAZARD';

export default function TestHistoryListScreen() {
  const router = useRouter();
  const { records, deleteRecord } = useTest();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const verdict = r.result?.verdict || 'SAFE';
      const recordId = r.id || r.testId || '';
      // Verdict filter
      if (selectedFilter !== 'ALL' && verdict !== selectedFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = recordId.toLowerCase().includes(q);
        const verdictMatch = verdict.toLowerCase().includes(q);
        const notesMatch = (r.notes || '').toLowerCase().includes(q);
        return idMatch || verdictMatch || notesMatch;
      }
      return true;
    });
  }, [records, searchQuery, selectedFilter]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Screening Record',
      'Are you sure you want to permanently delete this screening session from local memory?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRecord(id) },
      ]
    );
  };

  const renderItem = ({ item }: { item: TestRecord }) => {
    const recordId = item.id || item.testId || 'RECORD';
    const verdict = item.result?.verdict || 'SAFE';
    const isHazard = verdict === 'HAZARD';
    const isElevated = verdict === 'ELEVATED';
    const timestamp = item.timestamp || item.startedAt || new Date().toISOString();
    const durationSeconds = item.durationSeconds ?? 30;
    const peakMq2 = item.peakMq2 ?? 0;
    const peakMq3 = item.peakMq3 ?? 0;
    const peakMq135 = item.peakMq135 ?? 0;
    const confidence = item.result?.confidence ?? 0.95;
    const modelType = item.result?.modelType || 'FastAPI ML Classifier';

    return (
      <Pressable
        style={styles.recordCard}
        onPress={() => router.push(`/test-history/${recordId}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.idRow}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={18}
              color={AppColors.primaryCyan}
            />
            <Text style={styles.recordId}>
              #{recordId.substring(0, 8).toUpperCase()}
            </Text>
          </View>
          <StatusBadge
            size="sm"
            label={verdict}
            variant={isHazard ? 'danger' : isElevated ? 'warning' : 'safe'}
          />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.timestampText}>
            {formatDate(timestamp)} • {formatTime(timestamp)} ({durationSeconds}s)
          </Text>

          <View style={styles.peakBadgeRow}>
            <View style={styles.peakTag}>
              <Text style={styles.peakTagLabel}>MQ-2</Text>
              <Text style={styles.peakTagVal}>{Math.round(peakMq2)}</Text>
            </View>
            <View style={styles.peakTag}>
              <Text style={styles.peakTagLabel}>MQ-3</Text>
              <Text style={styles.peakTagVal}>{Math.round(peakMq3)}</Text>
            </View>
            <View style={styles.peakTag}>
              <Text style={styles.peakTagLabel}>MQ-135</Text>
              <Text style={styles.peakTagVal}>{Math.round(peakMq135)}</Text>
            </View>
          </View>

          {item.notes ? (
            <Text style={styles.notesText} numberOfLines={1}>
              Note: {item.notes}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.confidenceText}>
            {(confidence * 100).toFixed(0)}% Confidence ({modelType})
          </Text>
          <Pressable
            onPress={() => handleDelete(recordId)}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color={AppColors.textMuted}
            />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <CustomTextField
          placeholder="Search by ID, notes, or verdict..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          leftIcon={
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={AppColors.textSecondary}
            />
          }
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersRow}>
        {(['ALL', 'SAFE', 'ELEVATED', 'HAZARD'] as FilterType[]).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              selectedFilter === f && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === f && styles.filterChipTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Record List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id || item.testId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyStateView
            title="No Screening Logs"
            description={
              searchQuery || selectedFilter !== 'ALL'
                ? 'No screening sessions match the current filter criteria.'
                : 'No screening tests have been conducted yet.'
            }
            iconName="clipboard-text-outline"
            actionTitle="Launch Screening"
            onAction={() => router.push('/live-monitoring')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceCard,
    borderWidth: 1,
    borderColor: AppColors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: AppColors.primaryCyan,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: AppColors.primaryCyan,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  recordCard: {
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
    marginBottom: 8,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordId: {
    fontSize: 13,
    fontWeight: '800',
    color: AppColors.primaryCyan,
  },
  cardBody: {
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  peakBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  peakTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  peakTagLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textMuted,
  },
  peakTagVal: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  notesText: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontStyle: 'italic',
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
  confidenceText: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 4,
  },
});
