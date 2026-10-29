import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors } from '@/theme/colors';

export interface SensorGaugeCardProps {
  channelName: string;
  sensorCode: 'MQ-2' | 'MQ-3' | 'MQ-135';
  currentValue: number;
  peakValue: number;
  averageValue?: number;
  warningThreshold: number;
  hazardThreshold: number;
  maxValue?: number;
  unit?: string;
  style?: ViewStyle;
}

export const SensorGaugeCard: React.FC<SensorGaugeCardProps> = ({
  channelName,
  sensorCode,
  currentValue,
  peakValue,
  averageValue,
  warningThreshold,
  hazardThreshold,
  maxValue = 1000,
  unit = 'PPM',
  style,
}) => {
  const percentage = Math.min(100, Math.max(0, (currentValue / maxValue) * 100));

  const isHazard = currentValue >= hazardThreshold;
  const isWarning = !isHazard && currentValue >= warningThreshold;

  const statusColor = isHazard
    ? AppColors.statusDanger
    : isWarning
    ? AppColors.statusWarning
    : AppColors.statusSafe;

  const statusText = isHazard ? 'HAZARD' : isWarning ? 'ELEVATED' : 'NOMINAL';

  const getSensorIcon = () => {
    switch (sensorCode) {
      case 'MQ-2':
        return 'fire-alert' as const;
      case 'MQ-3':
        return 'bottle-tonic-outline' as const;
      case 'MQ-135':
        return 'weather-dust' as const;
      default:
        return 'gauge' as const;
    }
  };

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.sensorInfo}>
          <View style={[styles.iconBox, { borderColor: statusColor }]}>
            <MaterialCommunityIcons name={getSensorIcon()} size={20} color={statusColor} />
          </View>
          <View>
            <View style={styles.codeRow}>
              <Text style={styles.sensorCode}>{sensorCode}</Text>
              <Text style={styles.unitText}>({unit})</Text>
            </View>
            <Text style={styles.channelName} numberOfLines={1}>
              {channelName}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isHazard
                ? 'rgba(255, 61, 87, 0.16)'
                : isWarning
                ? 'rgba(255, 179, 0, 0.16)'
                : 'rgba(0, 230, 118, 0.16)',
              borderColor: statusColor,
            },
          ]}
        >
          <Text style={[styles.statusPillText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      {/* Main Value Display */}
      <View style={styles.valueRow}>
        <Text style={[styles.currentValue, { color: statusColor }]}>
          {Math.round(currentValue)}
        </Text>
        <Text style={styles.valueUnit}>{unit}</Text>
      </View>

      {/* Bar Gauge */}
      <View style={styles.gaugeTrack}>
        <View
          style={[
            styles.gaugeFill,
            {
              width: `${percentage}%`,
              backgroundColor: statusColor,
            },
          ]}
        />
        {/* Warning threshold indicator tick */}
        <View
          style={[
            styles.thresholdTick,
            { left: `${(warningThreshold / maxValue) * 100}%` },
          ]}
        />
        {/* Hazard threshold indicator tick */}
        <View
          style={[
            styles.thresholdTickHazard,
            { left: `${(hazardThreshold / maxValue) * 100}%` },
          ]}
        />
      </View>

      {/* Threshold markings & Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>PEAK</Text>
          <Text style={styles.statValue}>{Math.round(peakValue)} {unit}</Text>
        </View>
        {averageValue !== undefined && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>AVG</Text>
            <Text style={styles.statValue}>{Math.round(averageValue)} {unit}</Text>
          </View>
        )}
        <View style={styles.statItemRight}>
          <Text style={styles.statLabel}>WARN / HAZ</Text>
          <Text style={styles.statValue}>
            {warningThreshold} / {hazardThreshold}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: AppColors.surfaceBorder,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sensorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0F1A2C',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  sensorCode: {
    fontSize: 15,
    fontWeight: '800',
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
  },
  unitText: {
    fontSize: 11,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  channelName: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: '500',
    maxWidth: 160,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  currentValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  valueUnit: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: '600',
    marginLeft: 6,
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: '#0E1729',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  thresholdTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: AppColors.statusWarning,
  },
  thresholdTickHazard: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: AppColors.statusDanger,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38, 58, 99, 0.4)',
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statItemRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: AppColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
});
