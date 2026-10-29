import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { AppColors } from '@/theme/colors';

interface AppBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const AppBrandLogo: React.FC<AppBrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
}) => {
  const iconSize = size === 'sm' ? 36 : size === 'lg' ? 68 : 52;
  const titleSize = size === 'sm' ? 16 : size === 'lg' ? 26 : 20;
  const subSize = size === 'sm' ? 10 : size === 'lg' ? 12 : 11;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { width: iconSize, height: iconSize }]}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 64 64" fill="none">
          <Defs>
            <SvgGradient id="railGrad" x1="0" y1="0" x2="64" y2="64">
              <Stop offset="0" stopColor={AppColors.primaryCyan} />
              <Stop offset="1" stopColor={AppColors.primaryBlue} />
            </SvgGradient>
            <SvgGradient id="shieldGrad" x1="32" y1="2" x2="32" y2="62">
              <Stop offset="0" stopColor="#1E2E4E" stopOpacity="0.8" />
              <Stop offset="1" stopColor="#0F172A" stopOpacity="0.95" />
            </SvgGradient>
          </Defs>

          {/* Shield Outline */}
          <Path
            d="M32 4L54 14V32C54 45.2 44.6 57.2 32 60C19.4 57.2 10 45.2 10 32V14L32 4Z"
            fill="url(#shieldGrad)"
            stroke="url(#railGrad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Railway Tracks converging perspective */}
          <Path
            d="M23 48L28 22M41 48L36 22"
            stroke={AppColors.primaryCyan}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Railroad Sleepers */}
          <Path d="M26 42H38" stroke={AppColors.primaryCyan} strokeWidth="2" strokeLinecap="round" />
          <Path d="M28 35H36" stroke={AppColors.primaryCyan} strokeWidth="2" strokeLinecap="round" />
          <Path d="M29.5 28H34.5" stroke={AppColors.primaryCyan} strokeWidth="1.8" strokeLinecap="round" />

          {/* Radar AI Pulse Arc at Apex */}
          <Path
            d="M24 16C28.8 13.5 35.2 13.5 40 16"
            stroke={AppColors.accentTeal}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Circle cx="32" cy="18" r="2.5" fill={AppColors.primaryCyan} />
        </Svg>
      </View>

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { fontSize: titleSize }]}>RAILSAFE</Text>
          <View style={styles.aiBadge}>
            <Text style={[styles.aiText, { fontSize: titleSize * 0.55 }]}>AI</Text>
          </View>
        </View>
        {showSubtitle && (
          <Text style={[styles.subtitle, { fontSize: subSize }]}>
            Handheld Screening & Surveillance
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontWeight: '800',
    color: AppColors.textPrimary,
    letterSpacing: 1.5,
  },
  aiBadge: {
    backgroundColor: AppColors.primaryCyan,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  aiText: {
    color: '#0A0F1D',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
