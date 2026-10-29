export const BleConstants = {
  // Service and Characteristic UUIDs specified in RailSafe AI architecture
  defaultServiceUuid: '12345678-1234-5678-1234-56789abcdef0',
  defaultDataCharacteristicUuid: '12345678-1234-5678-1234-56789abcdef1',
  defaultCommandCharacteristicUuid: '12345678-1234-5678-1234-56789abcdef2',

  // Convenience Aliases
  serviceUuid: '12345678-1234-5678-1234-56789abcdef0',
  txCharUuid: '12345678-1234-5678-1234-56789abcdef1',
  rxCharUuid: '12345678-1234-5678-1234-56789abcdef2',

  // Device advertising names filter
  recognizedPrefixes: [
    'RAILSAFE',
    'ESP32',
    'SCREEN-AI',
    'IR-SCANNER',
  ],

  // Timing constants in milliseconds
  scanTimeoutMs: 12000,
  connectionTimeoutMs: 10000,
  staleDataThresholdMs: 5000,

  // Commands supported by prototype ESP32 firmware
  cmdStartTest: 'CMD:START_TEST',
  cmdStopTest: 'CMD:STOP_TEST',
  cmdPing: 'CMD:PING',
  cmdCalibrate: 'CMD:CALIBRATE',
};
