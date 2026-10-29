import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors } from '@/theme/colors';

export type StatusBadgeVariant = 'safe' | 'warning' | 'danger' | 'info' | 'neutral' | 'cyan';

export interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  iconName,
  size = 'md',
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'safe':
        return {
          bg: 'rgba(0, 230, 118, 0.14)',
          border: 'rgba(0, 230, 118, 0.4)',
          text: AppColors.statusSafe,
          defaultIcon: 'check-circle' as const,
        };
      case 'warning':
        return {
          bg: 'rgba(255, 179, 0, 0.14)',
          border: 'rgba(255, 179, 0, 0.4)',
          text: AppColors.statusWarning,
          defaultIcon: 'alert' as const,
        };
      case 'danger':
        return {
          bg: 'rgba(255, 61, 87, 0.16)',
          border: 'rgba(255, 61, 87, 0.45)',
          text: AppColors.statusDanger,
          defaultIcon: 'alert-decagram' as const,
        };
      case 'cyan':
        return {
          bg: 'rgba(0, 229, 255, 0.14)',
          border: 'rgba(0, 229, 255, 0.4)',
          text: AppColors.primaryCyan,
          defaultIcon: 'shield-check' as const,
        };
      case 'info':
        return {
          bg: 'rgba(41, 182, 246, 0.14)',
          border: 'rgba(41, 182, 246, 0.4)',
          text: AppColors.statusInfo,
          defaultIcon: 'information' as const,
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.25)',
          text: AppColors.textSecondary,
          defaultIcon: 'circle-outline' as const,
        };
    }
  };

  const config = getColors();
  const icon = iconName || config.defaultIcon;
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingVertical: isSm ? 3 : 5,
          paddingHorizontal: isSm ? 8 : 12,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={isSm ? 12 : 15}
        color={config.text}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isSm ? 11 : 13,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
