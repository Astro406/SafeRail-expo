import { TelemetrySyncQueue, TelemetryService } from '../src/services/telemetryService';
import { LocalStorageService } from '../src/services/localStorageService';
import { SensorReading } from '../src/types';

describe('TelemetrySyncQueue Unit Tests', () => {
  let storage: LocalStorageService;
  let telemetryService: TelemetryService;
  let queue: TelemetrySyncQueue;

  beforeEach(() => {
    storage = new LocalStorageService();
    telemetryService = new TelemetryService(storage);
    queue = new TelemetrySyncQueue(telemetryService, 50, 5, 60000); // 50 items max
  });

  afterEach(() => {
    queue.dispose();
  });

  test('enqueues readings and tracks queueLength', () => {
    const reading: SensorReading = {
      deviceId: 'RAILSAFE-ESP32-01',
      sequence: 1,
      timestamp: new Date().toISOString(),
      mode: 'hardware',
      sensors: { mq2: { value: 100, unit: 'PPM' } },
      status: 'OK',
    };

    queue.enqueue(reading);
    expect(queue.currentState.queuedCount).toBe(1);
  });

  test('deduplicates readings with identical (deviceId, sequence)', () => {
    const reading1: SensorReading = {
      deviceId: 'RAILSAFE-ESP32-01',
      sequence: 99,
      timestamp: new Date().toISOString(),
      mode: 'hardware',
      sensors: {},
      status: 'OK',
    };

    const readingDuplicate: SensorReading = {
      deviceId: 'RAILSAFE-ESP32-01',
      sequence: 99,
      timestamp: new Date().toISOString(),
      mode: 'hardware',
      sensors: {},
      status: 'OK',
    };

    queue.enqueue(reading1);
    queue.enqueue(readingDuplicate);

    expect(queue.currentState.queuedCount).toBe(1);
  });

  test('bounds queue to maximum size without memory leak', () => {
    for (let i = 0; i < 70; i++) {
      queue.enqueue({
        deviceId: 'RAILSAFE-ESP32-01',
        sequence: i,
        timestamp: new Date().toISOString(),
        mode: 'hardware',
        sensors: {},
        status: 'OK',
      });
    }

    // Capacity was bounded to 50
    expect(queue.currentState.queuedCount).toBeLessThanOrEqual(50);
  });
});
