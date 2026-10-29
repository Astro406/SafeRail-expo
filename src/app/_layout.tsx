import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { AlertsProvider } from '@/context/AlertsContext';
import { BleProvider } from '@/context/BleContext';
import { TestProvider } from '@/context/TestContext';
import { AppColors } from '@/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <AlertsProvider>
            <BleProvider>
              <TestProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: AppColors.surface,
                    },
                    headerTintColor: AppColors.textPrimary,
                    contentStyle: {
                      backgroundColor: AppColors.background,
                    },
                    headerTitleStyle: {
                      fontWeight: '700',
                      fontSize: 17,
                    },
                    headerShadowVisible: false,
                  }}
                >
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="(auth)/register"
                    options={{ title: 'Officer Registration' }}
                  />
                  <Stack.Screen name="dashboard" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="device-connection"
                    options={{ title: 'ESP32 Hardware Node' }}
                  />
                  <Stack.Screen
                    name="live-monitoring"
                    options={{ title: 'Live Screening Session' }}
                  />
                  <Stack.Screen
                    name="test-result"
                    options={{
                      title: 'Screening Assessment',
                      headerBackVisible: false,
                    }}
                  />
                  <Stack.Screen
                    name="test-history/index"
                    options={{ title: 'Screening Logs' }}
                  />
                  <Stack.Screen
                    name="test-history/[id]"
                    options={{ title: 'Session Record' }}
                  />
                  <Stack.Screen
                    name="alerts/index"
                    options={{ title: 'Threat & Surveillance Feeds' }}
                  />
                  <Stack.Screen
                    name="alerts/[id]"
                    options={{ title: 'RailGuard Vision Alert' }}
                  />
                  <Stack.Screen
                    name="settings"
                    options={{ title: 'Configuration & Diagnostics' }}
                  />
                </Stack>
              </TestProvider>
            </BleProvider>
          </AlertsProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
