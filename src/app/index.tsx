import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { AppBrandLogo } from '@/components/AppBrandLogo';
import { AppColors } from '@/theme/colors';
import { AppConstants } from '@/constants/AppConstants';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isInitialized, user, router]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#070B16', '#0E172B', '#14203D']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.centerContent}>
        <AppBrandLogo size="lg" showSubtitle={false} />
        <Text style={styles.subtitle}>{AppConstants.appTagline}</Text>
        <Text style={styles.descriptor}>
          Integrated Confirmatory Gas Screening & RailGuard AI Surveillance
        </Text>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={AppColors.primaryCyan} />
          <Text style={styles.loadingText}>Loading security protocols...</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>
          {AppConstants.appName} v{AppConstants.appVersion}
        </Text>
        <Text style={styles.disclaimerText}>
          Confirmatory Handheld Screening Tool • SOP Compliance Required
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primaryCyan,
    marginTop: 20,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  descriptor: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 36,
  },
  loadingText: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 10,
    color: AppColors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
