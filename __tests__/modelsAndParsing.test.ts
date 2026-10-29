import { BleService } from '../src/services/bleService';
import { SensorReading } from '../src/types';

describe('Models and BLE Telemetry Parsing Test', () => {
  let bleService: BleService;

  beforeEach(() => {
    bleService = new BleService();
  });

  afterEach(async () => {
    await bleService.disconnect();
  });

  test('correctly parses framed valid ESP32 JSON payload with newline delimiter', (done) => {
    const rawPacket = JSON.stringify({
      deviceId: 'RAILSAFE-ESP32-01',
      timestamp: '2026-10-29T10:00:00.000Z',
      sequence: 42,
      mode: 'hardware',
      sensors: {
        mq2: { value: 145.2, unit: 'PPM', label: 'Combustible' },
        mq3: { value: 89.0, unit: 'PPM', label: 'Alcohol' },
        mq135: { value: 112.5, unit: 'PPM', label: 'Air Quality' },
      },
      status: 'OK',
    }) + '\n';

    bleService.onReading((reading: SensorReading) => {
      expect(reading.deviceId).toBe('RAILSAFE-ESP32-01');
      expect(reading.sequence).toBe(42);
      expect(reading.mq2).toBe(145.2);
      expect(reading.mq3).toBe(89.0);
      expect(reading.mq135).toBe(112.5);
      expect(reading.isTelemetryComplete).toBe(true);
      done();
    });

    bleService.processIncomingPacket(rawPacket);
  });

  test('reassembles chunked fragments across multiple GATT characteristic notifications', (done) => {
    const fullJson = JSON.stringify({
      deviceId: 'RAILSAFE-ESP32-01',
      timestamp: '2026-10-29T10:01:00.000Z',
      sequence: 43,
      mode: 'hardware',
      sensors: {
        mq2: { value: 200.0, unit: 'PPM' },
        mq3: { value: 150.0, unit: 'PPM' },
        mq135: { value: 180.0, unit: 'PPM' },
      },
      status: 'OK',
    }) + '\n';

    const chunk1 = fullJson.substring(0, 35);
    const chunk2 = fullJson.substring(35, 70);
    const chunk3 = fullJson.substring(70);

    bleService.onReading((reading: SensorReading) => {
      expect(reading.sequence).toBe(43);
      expect(reading.mq2).toBe(200.0);
      done();
    });

    bleService.processIncomingPacket(chunk1);
    bleService.processIncomingPacket(chunk2);
    bleService.processIncomingPacket(chunk3);
  });

  test('flags missing sensor channels if packet lacks required channels', (done) => {
    const partialJson = JSON.stringify({
      deviceId: 'RAILSAFE-ESP32-01',
      sequence: 44,
      mode: 'hardware',
      sensors: {
        mq2: { value: 130.0, unit: 'PPM' },
      },
      status: 'OK',
    }) + '\n';

    bleService.onReading((reading: SensorReading) => {
      expect(reading.hasMissingTelemetry).toBe(true);
      expect(reading.missingChannels).toContain('mq4_raw');
      expect(reading.missingChannels).toContain('mq7_raw');
      done();
    });

    bleService.processIncomingPacket(partialJson);
  });
});
