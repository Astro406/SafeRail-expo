export const AppConstants = {
  appName: 'RailSafe AI',
  appSubtitle: 'Handheld Screening Assistance',
  appTagline: 'Handheld Railway Screening Assistance',
  appDepartment: 'Indian Railways Research & Prototype',
  appVersion: '1.0.0 (Hackathon Edition)',

  // Storage Keys
  keyDemoMode: 'demo_mode_enabled',
  keyServiceUuid: 'custom_service_uuid',
  keyDataCharUuid: 'custom_data_char_uuid',
  keyCmdCharUuid: 'custom_cmd_char_uuid',
  keyStaleTimeoutSec: 'stale_timeout_sec',
  keySavedTests: 'offline_saved_tests_json',
  keySavedAlerts: 'offline_saved_alerts_json',
  keyCachedUser: 'cached_user_profile',
  keyDemoScenario: 'demo_simulation_scenario',
  keyBackendUrl: 'backend_api_url',
  defaultBackendUrl: 'http://10.0.2.2:8000',
  defaultPredictionApiUrl: 'http://10.0.2.2:8000',

  // RailGuard Vision Production Cloud Backend (Single Source of Truth)
  keyRailGuardBackendUrl: 'railguard_backend_api_url',
  defaultRailGuardBackendUrl: 'https://railsafe-ai-backend.onrender.com',
  defaultRailGuardApiUrl: 'https://railsafe-ai-backend.onrender.com',

  // Screening Assistance Disclaimer
  prototypeDisclaimer:
    'PROTOTYPE NOTICE: RailSafe AI provides assistive screening indications for research and hardware evaluation. ' +
    'Readings reflect prototype sensor outputs and must not be treated as certified chemical identification without authorized laboratory verification.',
  statutoryDisclaimer:
    'Confirmatory Handheld Screening Tool. RailSafe-AI assists security personnel in detecting hazardous volatile chemicals, alcohol, and combustible gases. Always adhere to standard operating security protocols (SOP).',
};
