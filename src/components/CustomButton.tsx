import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '@/theme/colors';

export interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  testID,
}) => {
  const isInteractive = !loading && !disabled;

  const getContainerSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      default:
        return styles.sizeMd;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.textSm;
      case 'lg':
        return styles.textLg;
      default:
        return styles.textMd;
    }
  };

  const renderContent = () => (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? AppColors.primaryCyan : '#FFFFFF'}
        />
      ) : (
        <>
          {leftIcon && <View style={styles.iconWrapper}>{leftIcon}</View>}
          <Text
            style={[
              styles.baseText,
              getTextSizeStyle(),
              variant === 'outline' && styles.textOutline,
              variant === 'ghost' && styles.textGhost,
              variant === 'secondary' && styles.textSecondary,
              variant === 'danger' && styles.textDanger,
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.iconWrapper}>{rightIcon}</View>}
        </>
      )}
    </View>
  );

  if (variant === 'primary' && !disabled) {
    return (
      <Pressable
        testID={testID}
        onPress={isInteractive ? onPress : undefined}
        style={({ pressed }) => [
          styles.baseButton,
          getContainerSizeStyle(),
          fullWidth && styles.fullWidth,
          pressed && styles.pressed,
          style,
        ]}
      >
        <LinearGradient
          colors={AppColors.brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientFill, getContainerSizeStyle()]}
        >
          {renderContent()}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={isInteractive ? onPress : undefined}
      style={({ pressed }) => [
        styles.baseButton,
        getContainerSizeStyle(),
        fullWidth && styles.fullWidth,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        variant === 'warning' && styles.buttonWarning,
        variant === 'outline' && styles.buttonOutline,
        variant === 'ghost' && styles.buttonGhost,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {renderContent()}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientFill: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  fullWidth: {
    width: '100%',
  },
  sizeSm: {
    height: 38,
    paddingHorizontal: 14,
  },
  sizeMd: {
    height: 48,
    paddingHorizontal: 20,
  },
  sizeLg: {
    height: 56,
    paddingHorizontal: 24,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseText: {
    fontWeight: '700',
    color: '#0A0F1D',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 17,
  },
  buttonSecondary: {
    backgroundColor: AppColors.surfaceCard,
    borderWidth: 1.5,
    borderColor: AppColors.surfaceBorder,
  },
  textSecondary: {
    color: AppColors.textPrimary,
  },
  buttonDanger: {
    backgroundColor: AppColors.statusDanger,
  },
  textDanger: {
    color: '#FFFFFF',
  },
  buttonWarning: {
    backgroundColor: AppColors.statusWarning,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: AppColors.primaryCyan,
  },
  textOutline: {
    color: AppColors.primaryCyan,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  textGhost: {
    color: AppColors.textSecondary,
  },
  buttonDisabled: {
    backgroundColor: '#1E293B',
    borderColor: 'transparent',
    opacity: 0.6,
  },
  textDisabled: {
    color: '#64748B',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
