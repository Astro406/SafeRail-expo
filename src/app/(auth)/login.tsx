import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { AppBrandLogo } from '@/components/AppBrandLogo';
import { CustomButton } from '@/components/CustomButton';
import { CustomTextField } from '@/components/CustomTextField';
import { AppColors } from '@/theme/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginDemo, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email or Officer ID is required');
      isValid = false;
    } else if (!email.includes('@') && email.trim().length < 4) {
      setEmailError('Enter a valid official email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email.trim(), password);
      router.replace('/dashboard');
    } catch (err: any) {
      // error is handled in context
    }
  };

  const handleDemoAccess = async () => {
    try {
      await loginDemo();
      router.replace('/dashboard');
    } catch (err: any) {
      Alert.alert('Demo Error', err.message || 'Failed to initialize demo session');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <AppBrandLogo size="lg" />
          <View style={styles.badgeRow}>
            <View style={styles.officialBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color={AppColors.primaryCyan} />
              <Text style={styles.officialBadgeText}>OFFICIAL SECURITY PORTAL</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Officer Authentication</Text>
          <Text style={styles.cardSubtitle}>
            Sign in to access sensor screening nodes and cloud threat telemetry
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={AppColors.statusDanger}
              />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <CustomTextField
            label="Officer Email / ID"
            placeholder="officer@railsafe.gov.in"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError('');
              if (error) clearError();
            }}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={
              <MaterialCommunityIcons
                name="badge-account-outline"
                size={20}
                color={AppColors.textSecondary}
              />
            }
          />

          <CustomTextField
            label="Security Password"
            placeholder="••••••••••••"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passwordError) setPasswordError('');
              if (error) clearError();
            }}
            error={passwordError}
            secureTextEntry
            leftIcon={
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={AppColors.textSecondary}
              />
            }
          />

          <CustomButton
            title="Authenticate & Enter"
            onPress={handleLogin}
            loading={isLoading}
            variant="primary"
            fullWidth
            style={styles.loginButton}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR QUICK DEMO</Text>
            <View style={styles.dividerLine} />
          </View>

          <CustomButton
            title="Hackathon Quick Access Demo Officer"
            onPress={handleDemoAccess}
            loading={isLoading}
            variant="secondary"
            fullWidth
            leftIcon={
              <MaterialCommunityIcons
                name="shield-star"
                size={18}
                color={AppColors.primaryCyan}
              />
            }
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New railway security officer?</Text>
          <CustomButton
            title="Register Official Credentials"
            onPress={() => router.push('/(auth)/register')}
            variant="ghost"
            size="sm"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  badgeRow: {
    marginTop: 14,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: AppColors.primaryCyan,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: AppColors.surfaceBorder,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 61, 87, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 87, 0.4)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: AppColors.statusDanger,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AppColors.surfaceBorder,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textMuted,
    letterSpacing: 0.6,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
});
