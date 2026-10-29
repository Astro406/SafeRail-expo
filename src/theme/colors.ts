export const AppColors = {
  // Deep railway navy & charcoal palette
  background: '#0A0F1D',
  surface: '#131D31',
  surfaceCard: '#18243E',
  surfaceCardElevated: '#1E2E4E',
  surfaceBorder: '#263A63',
  surfaceBorderGlow: '#355288',

  // Brand Accents
  primaryCyan: '#00E5FF',
  primaryBlue: '#1E88E5',
  accentTeal: '#00E5BA',
  accentIndigo: '#5E60CE',

  // Status & Safety Indicators
  statusSafe: '#00E676',
  statusWarning: '#FFB300',
  statusDanger: '#FF3D57',
  statusInfo: '#29B6F6',

  // Typography Colors
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textCyan: '#38BDF8',

  // Gradients (tuples for expo-linear-gradient)
  brandGradient: ['#00E5FF', '#1E88E5'] as const,
  cardGradient: ['#142038', '#182643'] as const,
  alertGradient: ['rgba(255, 61, 87, 0.2)', 'rgba(255, 61, 87, 0.07)'] as const,
  warningGradient: ['rgba(255, 179, 0, 0.2)', 'rgba(255, 179, 0, 0.07)'] as const,
  safeGradient: ['rgba(0, 230, 118, 0.2)', 'rgba(0, 230, 118, 0.07)'] as const,
  cyanGlowGradient: ['rgba(0, 229, 255, 0.25)', 'transparent'] as const,
};
