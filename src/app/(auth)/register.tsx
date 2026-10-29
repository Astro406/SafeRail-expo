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
import { CustomButton } from '@/components/CustomButton';
import { CustomTextField } from '@/components/CustomTextField';
import { AppColors } from '@/theme/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [station, setStation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Officer full name is required';
    if (!badgeId.trim()) errors.badgeId = 'Official Badge / ID is required';
    if (!email.trim() || !email.includes('@')) errors.email = 'Valid official email is required';
    if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register(
        email.trim(),
        password,
        name.trim(),
        badgeId.trim().toUpperCase(),
        station.trim() || 'Central Railway Hub'
      );
      Alert.alert(
        'Registration Complete',
        'Officer profile registered successfully. You may now sign in.',
        [{ text: 'Proceed', onPress: () => router.replace('/dashboard') }]
      );
    } catch (err: any) {
      // Handled via context error
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register Official Credentials</Text>
          <Text style={styles.cardSubtitle}>
            Enlist new security officer profile for handheld screening & threat monitoring
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
            label="Officer Full Name"
            placeholder="e.g. Inspector Ramesh Kumar"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
              if (error) clearError();
            }}
            error={formErrors.name}
            leftIcon={
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={AppColors.textSecondary}
              />
            }
          />

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <CustomTextField
                label="Badge ID / Service #"
                placeholder="RPF-8392"
                value={badgeId}
                onChangeText={(t) => {
                  setBadgeId(t);
                  if (formErrors.badgeId) setFormErrors({ ...formErrors, badgeId: '' });
                }}
                error={formErrors.badgeId}
                autoCapitalize="characters"
                leftIcon={
                  <MaterialCommunityIcons
                    name="shield-outline"
                    size={20}
                    color={AppColors.textSecondary}
                  />
                }
              />
            </View>
            <View style={styles.halfCol}>
              <CustomTextField
                label="Station / Post"
                placeholder="NDLS-PL-1"
                value={station}
                onChangeText={setStation}
                leftIcon={
                  <MaterialCommunityIcons
                    name="train"
                    size={20}
                    color={AppColors.textSecondary}
                  />
                }
              />
            </View>
          </View>

          <CustomTextField
            label="Official Security Email"
            placeholder="r.kumar@railsafe.gov.in"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
            }}
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={AppColors.textSecondary}
              />
            }
          />

          <CustomTextField
            label="Security Password"
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
            }}
            error={formErrors.password}
            secureTextEntry
            leftIcon={
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={AppColors.textSecondary}
              />
            }
          />

          <CustomTextField
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: '' });
            }}
            error={formErrors.confirmPassword}
            secureTextEntry
            leftIcon={
              <MaterialCommunityIcons
                name="lock-check-outline"
                size={20}
                color={AppColors.textSecondary}
              />
            }
          />

          <CustomButton
            title="Create Official Account"
            onPress={handleRegister}
            loading={isLoading}
            variant="primary"
            fullWidth
            style={styles.submitButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already registered?</Text>
          <CustomButton
            title="Return to Officer Sign In"
            onPress={() => router.back()}
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: AppColors.surfaceBorder,
    padding: 20,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
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
  submitButton: {
    marginTop: 8,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
});
