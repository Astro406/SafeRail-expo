import {
  RailGuardApiService,
  RailGuardAuthException,
  RailGuardTimeoutException,
  RailGuardServerException,
} from '../src/services/railGuardApiService';
import { LocalStorageService } from '../src/services/localStorageService';

describe('RailGuardApiService Tests', () => {
  let storage: LocalStorageService;
  let apiService: RailGuardApiService;

  beforeEach(() => {
    storage = new LocalStorageService();
    apiService = new RailGuardApiService(storage, undefined, 5000);
  });

  test('parses RailGuard alert model JSON correctly', () => {
    const rawAlertJson = {
      id: 'RG-5001',
      event_uid: 'EV-5001-A',
      timestamp: '2026-10-29T11:00:00.000Z',
      camera_id: 'CAM-PL1-CONV-01',
      track_id: 104,
      object_class: 'knife',
      event_duration: 3.2,
      reason: 'Prohibited Edged Weapon Profile Detected',
      snapshot_url: 'https://storage.googleapis.com/evidence/RG-5001.jpg',
      clip_url: null,
      review_status: 'unreviewed',
      disclaimer: 'RailGuard AI Automated Detection',
    };

    const model = (apiService as any).mapToAlertModel(rawAlertJson);

    expect(model.id).toBe('RG-5001');
    expect(model.eventUid).toBe('EV-5001-A');
    expect(model.objectClass).toBe('knife');
    expect(model.eventDuration).toBe(3.2);
    expect(model.reviewStatus).toBe('unreviewed');
    expect(model.snapshotUrl).toBe('https://storage.googleapis.com/evidence/RG-5001.jpg');
  });

  test('exception hierarchy instantiates correctly with proper status codes', () => {
    const authEx = new RailGuardAuthException('Token expired', 401);
    expect(authEx.name).toBe('RailGuardAuthException');
    expect(authEx.statusCode).toBe(401);
    expect(authEx.message).toBe('Token expired');

    const timeoutEx = new RailGuardTimeoutException('Request timed out');
    expect(timeoutEx.name).toBe('RailGuardTimeoutException');

    const serverEx = new RailGuardServerException('Internal server error', 503);
    expect(serverEx.statusCode).toBe(503);
  });
});
