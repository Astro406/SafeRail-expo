import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useBle } from '@/context/BleContext';
import { CustomButton } from '@/components/CustomButton';
import { CustomTextField } from '@/components/CustomTextField';
import { StatusBadge } from '@/components/StatusBadge';
import { AppColors } from '@/theme/colors';
import { AppConstants } from '@/constants/AppConstants';
import { BleConstants } from '@/constants/BleConstants';
import { PredictionApiService } from '@/services/predictionApiService';
import { RailGuardApiService } from '@/services/railGuardApiService';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { isDemoMode, toggleDemoMode } = useBle();

  const [predictionUrl, setPredictionUrl] = useState(settings.predictionApiUrl);
  const [railGuardUrl, setRailGuardUrl] = useState(settings.railGuardApiUrl);
  const [bleServiceUuid, setBleServiceUuid] = useState(settings.bleServiceUuid);

  const [testingPrediction, setTestingPrediction] = useState(false);
  const [predictionStatus, setPredictionStatus] = useState<string | null>(null);

  const [testingRailGuard, setTestingRailGuard] = useState(false);
  const [railGuardStatus, setRailGuardStatus] = useState<string | null>(null);

  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  const handleSaveUrls = async () => {
    try {
      await updateSettings({
        predictionApiUrl: predictionUrl.trim(),
        railGuardApiUrl: railGuardUrl.trim(),
        bleServiceUuid: bleServiceUuid.trim(),
      });
      Alert.alert('Configuration Saved', 'Backend API endpoints and BLE UUIDs updated.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save configuration settings.');
    }
  };

  const handleTestPrediction = async () => {
    setTestingPrediction(true);
    setPredictionStatus(null);
    try {
      const isHealthy = await PredictionApiService.checkHealth(predictionUrl.trim());
      if (isHealthy) {
        setPredictionStatus('ONLINE: FastAPI ML inference service reachable.');
      } else {
        setPredictionStatus('UNREACHABLE: Service did not return 200 OK.');
      }
    } catch (err: any) {
      setPredictionStatus(`ERROR: ${err.message || 'Connection failed'}`);
    } finally {
      setTestingPrediction(false);
    }
  };

  const handleTestRailGuard = async () => {
    setTestingRailGuard(true);
    setRailGuardStatus(null);
    try {
      const isHealthy = await RailGuardApiService.checkHealth(railGuardUrl.trim());
      if (isHealthy) {
        setRailGuardStatus('ONLINE: RailGuard Vision Cloud API reachable.');
      } else {
        setRailGuardStatus('UNREACHABLE: Vision API returned error or timeout.');
      }
    } catch (err: any) {
      setRailGuardStatus(`ERROR: ${err.message || 'Connection failed'}`);
    } finally {
      setTestingRailGuard(false);
    }
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Configurations',
      'Restore default endpoint URLs and BLE UUIDs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Defaults',
          style: 'destructive',
          onPress: async () => {
            await resetSettings();
            setPredictionUrl(AppConstants.defaultPredictionApiUrl);
            setRailGuardUrl(AppConstants.defaultRailGuardApiUrl);
            setBleServiceUuid(BleConstants.serviceUuid);
            setPredictionStatus(null);
            setRailGuardStatus(null);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Officer Sign Out',
      'Are you sure you want to log out of RailSafe-AI?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Officer Profile Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Officer Profile</Text>
          <StatusBadge size="sm" label="ACTIVE" variant="safe" />
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="shield-account" size={28} color={AppColors.primaryCyan} />
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.officerName}>{user?.name || 'Security Officer'}</Text>
            <Text style={styles.officerBadge}>Badge ID: {user?.badgeId || 'RPF-DEMO'}</Text>
            <Text style={styles.officerEmail}>{user?.email || 'officer@railsafe.gov.in'}</Text>
            <Text style={styles.officerStation}>Station: {user?.station || 'Platform Screening'}</Text>
          </View>
        </View>

        <CustomButton
          title="Sign Out of Handheld Terminal"
          onPress={handleLogout}
          variant="outline"
          size="sm"
          style={styles.logoutBtn}
          leftIcon={<MaterialCommunityIcons name="logout-variant" size={16} color={AppColors.primaryCyan} />}
        />
      </View>

      {/* Backend API Endpoints */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ML Inference & Cloud Endpoints</Text>
        <Text style={styles.cardDesc}>
          Configure connection endpoints for the FastAPI ML backend and Render RailGuard Vision API.
        </Text>

        {/* Prediction API */}
        <CustomTextField
          label="Python FastAPI ML Backend URL"
          placeholder="http://10.0.2.2:8000"
          value={predictionUrl}
          onChangeText={setPredictionUrl}
          helperText="Endpoints: /health, /predict (Screening ML classifier)"
        />

        <View style={styles.testBtnRow}>
          <CustomButton
            title="Test ML Backend"
            onPress={handleTestPrediction}
            loading={testingPrediction}
            variant="secondary"
            size="sm"
            leftIcon={<MaterialCommunityIcons name="lan-connect" size={16} color={AppColors.textSecondary} />}
          />
        </View>

        {predictionStatus && (
          <View
            style={[
              styles.statusBanner,
              predictionStatus.startsWith('ONLINE') ? styles.statusOk : styles.statusErr,
            ]}
          >
            <Text
              style={[
                styles.statusBannerText,
                predictionStatus.startsWith('ONLINE') ? styles.textOk : styles.textErr,
              ]}
            >
              {predictionStatus}
            </Text>
          </View>
        )}

        {/* RailGuard Vision API */}
        <CustomTextField
          label="RailGuard AI Vision Cloud API URL"
          placeholder="https://railguard-vision.onrender.com"
          value={railGuardUrl}
          onChangeText={setRailGuardUrl}
          helperText="Endpoints: /ready, /api/alerts, /review, /stats"
        />

        <View style={styles.testBtnRow}>
          <CustomButton
            title="Test Vision Cloud API"
            onPress={handleTestRailGuard}
            loading={testingRailGuard}
            variant="secondary"
            size="sm"
            leftIcon={<MaterialCommunityIcons name="cloud-search-outline" size={16} color={AppColors.textSecondary} />}
          />
        </View>

        {railGuardStatus && (
          <View
            style={[
              styles.statusBanner,
              railGuardStatus.startsWith('ONLINE') ? styles.statusOk : styles.statusErr,
            ]}
          >
            <Text
              style={[
                styles.statusBannerText,
                railGuardStatus.startsWith('ONLINE') ? styles.textOk : styles.textErr,
              ]}
            >
              {railGuardStatus}
            </Text>
          </View>
        )}

        <CustomButton
          title="Save API Configurations"
          onPress={handleSaveUrls}
          variant="primary"
          size="md"
          style={styles.saveBtn}
          leftIcon={<MaterialCommunityIcons name="content-save" size={18} color="#0A0F1D" />}
        />
      </View>

      {/* BLE Hardware Service UUID */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bluetooth LE Configuration</Text>
        <CustomTextField
          label="ESP32 Service UUID"
          value={bleServiceUuid}
          onChangeText={setBleServiceUuid}
          helperText="Screening terminal GATT Service UUID"
        />
        <CustomButton
          title="Restore Hardware Defaults"
          onPress={handleResetDefaults}
          variant="ghost"
          size="sm"
          style={styles.resetBtn}
        />
      </View>

      {/* Simulator Mode Switch */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Expo Go Hardware Simulator</Text>
          <StatusBadge
            size="sm"
            label={isDemoMode ? 'ENABLED' : 'DISABLED'}
            variant={isDemoMode ? 'warning' : 'neutral'}
          />
        </View>
        <Text style={styles.cardDesc}>
          Simulates 1 Hz telemetry packets from the ESP32 hardware node, permitting end-to-end screening evaluation in Expo Go without physical sensors.
        </Text>
        <CustomButton
          title={isDemoMode ? 'Disable Simulator (Real BLE Mode)' : 'Enable Simulator Mode'}
          onPress={toggleDemoMode}
          variant="secondary"
          size="sm"
          style={styles.simToggleBtn}
        />
      </View>

      {/* Firebase Setup Guide Modal Trigger */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Firebase Authentication Guide</Text>
          <MaterialCommunityIcons name="firebase" size={24} color="#FFA000" />
        </View>
        <Text style={styles.cardDesc}>
          RailSafe-AI features complete Firebase Auth integration instructions for production deployments.
        </Text>
        <CustomButton
          title="View Firebase Integration Details"
          onPress={() => setShowFirebaseModal(true)}
          variant="secondary"
          size="sm"
          leftIcon={<MaterialCommunityIcons name="information-outline" size={16} color={AppColors.textSecondary} />}
        />
      </View>

      {/* Regulatory & Version */}
      <View style={styles.footerCard}>
        <Text style={styles.footerVersion}>
          {AppConstants.appName} • Build v{AppConstants.appVersion}
        </Text>
        <Text style={styles.footerDisclaimer}>
          {AppConstants.statutoryDisclaimer}
        </Text>
      </View>

      {/* Firebase Info Modal */}
      <Modal
        visible={showFirebaseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFirebaseModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="firebase" size={28} color="#FFA000" />
              <Text style={styles.modalTitle}>Firebase Configuration</Text>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalBodyText}>
                RailSafe-AI uses local authentication by default for offline terminal resilience and hackathon demonstrations, with full support for Firebase Authentication:
              </Text>
              <Text style={styles.modalStep}>
                1. Create a Firebase project at console.firebase.google.com.
              </Text>
              <Text style={styles.modalStep}>
                2. Enable Email/Password authentication in the Firebase Console.
              </Text>
              <Text style={styles.modalStep}>
                3. Download google-services.json (Android) and GoogleService-Info.plist (iOS).
              </Text>
              <Text style={styles.modalStep}>
                4. For Expo Go development, the included AuthService provides in-memory session caching and Demo Officer access without requiring native Google Play Services.
              </Text>
            </ScrollView>

            <CustomButton
              title="Close Guide"
              onPress={() => setShowFirebaseModal(false)}
              variant="primary"
              size="sm"
              style={styles.modalCloseBtn}
            />
          </View>
        </View>
      </Modal>
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
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 14,
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  officerName: {
    fontSize: 15,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  officerBadge: {
    fontSize: 12,
    color: AppColors.primaryCyan,
    fontWeight: '700',
  },
  officerEmail: {
    fontSize: 11,
    color: AppColors.textSecondary,
  },
  officerStation: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  logoutBtn: {
    marginTop: 8,
  },
  testBtnRow: {
    alignItems: 'flex-start',
    marginTop: -8,
    marginBottom: 10,
  },
  statusBanner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  statusOk: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  statusErr: {
    backgroundColor: 'rgba(255, 61, 87, 0.12)',
    borderColor: 'rgba(255, 61, 87, 0.4)',
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textOk: {
    color: AppColors.statusSafe,
  },
  textErr: {
    color: AppColors.statusDanger,
  },
  saveBtn: {
    marginTop: 6,
  },
  resetBtn: {
    marginTop: -4,
    alignSelf: 'flex-start',
  },
  simToggleBtn: {
    marginTop: 4,
  },
  footerCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  footerDisclaimer: {
    fontSize: 10,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    maxWidth: 300,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: AppColors.surfaceBorder,
    padding: 18,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  modalScroll: {
    marginVertical: 10,
  },
  modalBodyText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  modalStep: {
    fontSize: 12,
    color: AppColors.textPrimary,
    lineHeight: 18,
    marginBottom: 8,
  },
  modalCloseBtn: {
    marginTop: 10,
  },
});
