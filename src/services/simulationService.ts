import { SensorReading } from '../types';

export type SimulationReadingListener = (reading: SensorReading) => void;
export type ReadingListener = SimulationReadingListener;

export class SimulationService {
  private timer: any = null;
  private listeners: Set<ReadingListener> = new Set();
  private sequence: number = 0;
  private _isRunning: boolean = false;
  private _scenario: 'nominal' | 'anomaly' = 'nominal';
  private ticksInTest: number = 0;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get scenario(): 'nominal' | 'anomaly' {
    return this._scenario;
  }

  setScenario(scenario: 'nominal' | 'anomaly') {
    this._scenario = scenario;
  }

  subscribe(listener: ReadingListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  startSimulation(scenario?: 'nominal' | 'anomaly') {
    if (scenario) this._scenario = scenario;
    this.stopSimulation();
    this._isRunning = true;
    this.sequence = 0;
    this.ticksInTest = 0;

    this.timer = setInterval(() => {
      this.sequence++;
      this.ticksInTest++;

      let s1Val: number;
      let s2Val: number;
      let s3Val: number;

      const rng = Math.random();
      const rng2 = Math.random();
      const rng3 = Math.random();

      if (this._scenario === 'anomaly') {
        // Between ticks 4 and 10, simulate a clear transient rise
        if (this.ticksInTest >= 4 && this.ticksInTest <= 10) {
          const ramp = (this.ticksInTest - 3) / 4.0;
          const peak = Math.min(ramp, 1.0) * 310.0;
          s1Val = 70.0 + peak + rng * 25.0;
          s2Val = 35.0 + peak * 0.45 + rng2 * 15.0;
          s3Val = 40.0 + peak * 0.35 + rng3 * 10.0;
        } else if (this.ticksInTest > 10) {
          // Gradual decay
          const decay = Math.max(0.0, 1.0 - (this.ticksInTest - 10) * 0.15);
          s1Val = 70.0 + 310.0 * decay + rng * 10.0;
          s2Val = 35.0 + 140.0 * decay + rng2 * 8.0;
          s3Val = 40.0 + 100.0 * decay + rng3 * 5.0;
        } else {
          // Baseline ambient
          s1Val = 60.0 + rng * 18.0;
          s2Val = 30.0 + rng2 * 10.0;
          s3Val = 25.0 + rng3 * 8.0;
        }
      } else {
        // Nominal ambient with small random drift
        s1Val = 680.0 + rng * 40.0;
        s2Val = 950.0 + rng2 * 50.0;
        s3Val = 75.0 + rng3 * 10.0;
      }

      const parsedS1 = parseFloat(s1Val.toFixed(1));
      const parsedS2 = parseFloat(s2Val.toFixed(1));
      const parsedS3 = parseFloat(s3Val.toFixed(1));

      const reading: SensorReading = {
        deviceId: 'RAILSAFE-DEMO-SIM',
        timestamp: new Date().toISOString(),
        sequence: this.sequence,
        mode: 'demo',
        sensors: {
          sensor_1: {
            value: parsedS1,
            unit: 'ppm',
            label: 'Sensor 1 (MQ-2 / Combustible)',
          },
          sensor_2: {
            value: parsedS2,
            unit: 'mV',
            label: 'Sensor 2 (MQ-4 / Methane)',
          },
          mq2_raw: {
            value: parsedS1,
            unit: 'raw',
            label: 'MQ-2 Raw',
          },
          mq4_raw: {
            value: parsedS2,
            unit: 'raw',
            label: 'MQ-4 Raw',
          },
          mq7_raw: {
            value: parsedS3,
            unit: 'raw',
            label: 'MQ-7 Raw',
          },
        },
        status: 'demo_ok',
        sensor1Value: parsedS1,
        sensor2Value: parsedS2,
        sensor3Value: parsedS3,
        mq2Value: parsedS1,
        mq4Value: parsedS2,
        mq7Value: parsedS3,
        hasMissingTelemetry: false,
        isTelemetryComplete: true,
      };

      this.listeners.forEach((listener) => {
        try {
          listener(reading);
        } catch (e) {
          console.error('[SimulationService] Listener error:', e);
        }
      });
    }, 1000);
  }

  stopSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._isRunning = false;
    this.ticksInTest = 0;
  }

  dispose() {
    this.stopSimulation();
    this.listeners.clear();
  }
}
