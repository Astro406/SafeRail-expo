import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, ViewStyle, Pressable } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { SensorReading } from '@/types';
import { AppColors } from '@/theme/colors';

export interface RealtimeSensorChartProps {
  readings: SensorReading[];
  maxSamples?: number;
  height?: number;
  maxY?: number;
  style?: ViewStyle;
}

const getChannelValue = (reading: SensorReading, key: 'mq2' | 'mq3' | 'mq135'): number => {
  if (key === 'mq2') {
    return reading.mq2 ?? reading.mq2Value ?? reading.sensor1Value ?? reading.sensors?.['mq2']?.value ?? 0;
  }
  if (key === 'mq3') {
    return reading.mq3 ?? reading.mq4Value ?? reading.sensor2Value ?? reading.sensors?.['mq3']?.value ?? 0;
  }
  return reading.mq135 ?? reading.mq7Value ?? reading.sensor3Value ?? reading.sensors?.['mq135']?.value ?? 0;
};

export const RealtimeSensorChart: React.FC<RealtimeSensorChartProps> = ({
  readings,
  maxSamples = 30,
  height = 190,
  maxY = 1000,
  style,
}) => {
  const [layoutWidth, setLayoutWidth] = useState<number>(320);
  const [showMq2, setShowMq2] = useState<boolean>(true);
  const [showMq3, setShowMq3] = useState<boolean>(true);
  const [showMq135, setShowMq135] = useState<boolean>(true);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setLayoutWidth(width);
    }
  };

  const padLeft = 32;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 22;

  const chartWidth = Math.max(80, layoutWidth - padLeft - padRight);
  const chartHeight = Math.max(50, height - padTop - padBottom);

  // Take the most recent maxSamples
  const visibleData = readings.slice(-maxSamples);

  // Compute SVG paths
  const generatePath = (
    data: SensorReading[],
    key: 'mq2' | 'mq3' | 'mq135'
  ): { linePath: string; areaPath: string } => {
    if (data.length < 2) return { linePath: '', areaPath: '' };

    const stepX = chartWidth / (maxSamples - 1);
    // Align points from the right so new points arrive on the right
    const startIndex = maxSamples - data.length;

    let linePath = '';
    let firstX = 0;
    let lastX = 0;

    data.forEach((reading, i) => {
      const x = padLeft + (startIndex + i) * stepX;
      const val = getChannelValue(reading, key);
      const rawVal = Math.min(maxY, Math.max(0, val));
      const y = padTop + chartHeight - (rawVal / maxY) * chartHeight;

      if (i === 0) {
        linePath = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        firstX = x;
      } else {
        linePath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      lastX = x;
    });

    const bottomY = (padTop + chartHeight).toFixed(1);
    const areaPath = `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;

    return { linePath, areaPath };
  };

  const mq2Paths = generatePath(visibleData, 'mq2');
  const mq3Paths = generatePath(visibleData, 'mq3');
  const mq135Paths = generatePath(visibleData, 'mq135');

  const latest = visibleData[visibleData.length - 1];

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {/* Legend & Channel Filter Bar */}
      <View style={styles.legendRow}>
        <Pressable
          style={[styles.legendItem, !showMq2 && styles.legendItemDisabled]}
          onPress={() => setShowMq2(!showMq2)}
        >
          <View style={[styles.legendDot, { backgroundColor: AppColors.primaryCyan }]} />
          <Text style={[styles.legendText, { color: AppColors.primaryCyan }]}>
            MQ-2: {latest ? Math.round(getChannelValue(latest, 'mq2')) : '--'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.legendItem, !showMq3 && styles.legendItemDisabled]}
          onPress={() => setShowMq3(!showMq3)}
        >
          <View style={[styles.legendDot, { backgroundColor: AppColors.statusWarning }]} />
          <Text style={[styles.legendText, { color: AppColors.statusWarning }]}>
            MQ-3: {latest ? Math.round(getChannelValue(latest, 'mq3')) : '--'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.legendItem, !showMq135 && styles.legendItemDisabled]}
          onPress={() => setShowMq135(!showMq135)}
        >
          <View style={[styles.legendDot, { backgroundColor: AppColors.accentIndigo }]} />
          <Text style={[styles.legendText, { color: '#818cf8' }]}>
            MQ-135: {latest ? Math.round(getChannelValue(latest, 'mq135')) : '--'}
          </Text>
        </Pressable>
      </View>

      {/* SVG Canvas */}
      <Svg width={layoutWidth} height={height}>
        <Defs>
          <SvgGradient id="gradMq2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={AppColors.primaryCyan} stopOpacity="0.3" />
            <Stop offset="1" stopColor={AppColors.primaryCyan} stopOpacity="0.0" />
          </SvgGradient>
          <SvgGradient id="gradMq3" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={AppColors.statusWarning} stopOpacity="0.25" />
            <Stop offset="1" stopColor={AppColors.statusWarning} stopOpacity="0.0" />
          </SvgGradient>
          <SvgGradient id="gradMq135" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={AppColors.accentIndigo} stopOpacity="0.25" />
            <Stop offset="1" stopColor={AppColors.accentIndigo} stopOpacity="0.0" />
          </SvgGradient>
        </Defs>

        {/* Horizontal Grid Lines */}
        {[0, 250, 500, 750, 1000].map((val) => {
          const y = padTop + chartHeight - (val / maxY) * chartHeight;
          return (
            <React.Fragment key={`grid-${val}`}>
              <Line
                x1={padLeft}
                y1={y}
                x2={padLeft + chartWidth}
                y2={y}
                stroke="rgba(38, 58, 99, 0.45)"
                strokeWidth="1"
              />
              <SvgText
                x={padLeft - 6}
                y={y + 3}
                fill={AppColors.textMuted}
                fontSize="9"
                fontWeight="600"
                textAnchor="end"
              >
                {val}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Hazard Line (700 PPM) */}
        <Line
          x1={padLeft}
          y1={padTop + chartHeight - (700 / maxY) * chartHeight}
          x2={padLeft + chartWidth}
          y2={padTop + chartHeight - (700 / maxY) * chartHeight}
          stroke={AppColors.statusDanger}
          strokeWidth="1.2"
          strokeDasharray="4, 4"
        />

        {/* Warning Line (400 PPM) */}
        <Line
          x1={padLeft}
          y1={padTop + chartHeight - (400 / maxY) * chartHeight}
          x2={padLeft + chartWidth}
          y2={padTop + chartHeight - (400 / maxY) * chartHeight}
          stroke={AppColors.statusWarning}
          strokeWidth="1"
          strokeDasharray="3, 3"
        />

        {/* Area and Line for MQ-135 */}
        {showMq135 && mq135Paths.areaPath ? (
          <>
            <Path d={mq135Paths.areaPath} fill="url(#gradMq135)" />
            <Path
              d={mq135Paths.linePath}
              stroke="#818cf8"
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
            />
          </>
        ) : null}

        {/* Area and Line for MQ-3 */}
        {showMq3 && mq3Paths.areaPath ? (
          <>
            <Path d={mq3Paths.areaPath} fill="url(#gradMq3)" />
            <Path
              d={mq3Paths.linePath}
              stroke={AppColors.statusWarning}
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
            />
          </>
        ) : null}

        {/* Area and Line for MQ-2 */}
        {showMq2 && mq2Paths.areaPath ? (
          <>
            <Path d={mq2Paths.areaPath} fill="url(#gradMq2)" />
            <Path
              d={mq2Paths.linePath}
              stroke={AppColors.primaryCyan}
              strokeWidth="2.5"
              fill="none"
              strokeLinejoin="round"
            />
          </>
        ) : null}

        {/* Time Axis Labels */}
        <SvgText
          x={padLeft}
          y={height - 5}
          fill={AppColors.textMuted}
          fontSize="9"
          textAnchor="start"
        >
          -{maxSamples}s
        </SvgText>
        <SvgText
          x={padLeft + chartWidth}
          y={height - 5}
          fill={AppColors.textMuted}
          fontSize="9"
          textAnchor="end"
        >
          Now (Live)
        </SvgText>
      </Svg>

      {visibleData.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>Awaiting live telemetry packets...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: AppColors.surfaceBorder,
    paddingTop: 12,
    paddingBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  legendItemDisabled: {
    opacity: 0.4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 15, 29, 0.75)',
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
