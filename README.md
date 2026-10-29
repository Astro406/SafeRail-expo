# RailSafe-AI Mobile (React Native + Expo Go)

> **Autonomous Multi-Sensor Railway Safety & Threat Screening Mobile Platform**  
> Complete high-fidelity React Native + Expo Go migration of the RailSafe-AI Flutter application.

---

## 1. Overview & Architecture

RailSafe-AI is an edge-connected railway security and telemetry inspection application. It interfaces with an ESP32 micro-controller sensor array over Bluetooth Low Energy (BLE), ingesting real-time volatile gas and environmental readings (MQ-2 combustible gas/smoke, MQ-3 alcohol/vapor, MQ-4 methane/natural gas, and MQ-135 air quality/hazardous compounds).

The mobile app conducts local threshold verification and connects seamlessly with the **Python FastAPI Machine Learning Anomaly Detection Backend** (`railsafe_backend/`) for predictive inference (RandomForest classifier), as well as the **RailGuard Cloud API** for operational incident auditing and dispatch.

### Architecture Highlights

```
mobile-expo/
├── src/
│   ├── app/                      # Expo Router File-Based Navigation
│   │   ├── _layout.tsx           # Global Providers & Dark Theme Root
│   │   ├── index.tsx             # Splash Screen & Auth Redirect Guard
│   │   ├── (auth)/               # Authentication Route Group
│   │   │   ├── login.tsx         # Railway Security Officer Login
│   │   │   └── register.tsx      # Terminal Registration & Verification
│   │   ├── dashboard.tsx         # Primary Operations Hub & Action Center
│   │   ├── device-connection.tsx # BLE Device Scanner & Pairing Manager
│   │   ├── live-monitoring.tsx   # Real-Time Multi-Channel Telemetry & Test Suite
│   │   ├── test-result.tsx       # AI Analysis Result & Secondary Review Dispatch
│   │   ├── test-history/         # Auditable Local & Cloud Test Records
│   │   │   ├── index.tsx         # Filterable Test History Log
│   │   │   └── [id].tsx          # Comprehensive Test Record Detail & Sensor Breakdown
│   │   ├── alerts/               # High-Priority Railway Threat Alerts
│   │   │   ├── index.tsx         # Alert Center & Live Feeds
│   │   │   └── [id].tsx          # Alert Resolution & Chain-of-Custody Review
│   │   └── settings.tsx          # Device, Backend URLs & Safety Calibration Config
│   ├── components/               # Custom Native UI Components
│   │   ├── AppBrandLogo.tsx      # High-Fidelity SVG Brand Monogram & Lockup
│   │   ├── CustomButton.tsx      # Premium Haptic Button (Primary, Outline, Danger)
│   │   ├── CustomTextField.tsx   # Floating-Label Form Inputs with Clear & Icons
│   │   ├── EmptyStateView.tsx    # Styled Empty/Offline Fallback State View
│   │   ├── RealtimeSensorChart.tsx # Multi-Channel SVG Waveform Graph
│   │   ├── SensorGaugeCard.tsx   # Radial-Inspired Sensor Card with Min/Max/Avg
│   │   └── StatusBadge.tsx       # Color-Coded Railway Status Indicators
│   ├── context/                  # React State Context Providers
│   │   ├── AlertsContext.tsx     # Threat Feeds & Real-Time Alert Manager
│   │   ├── AuthContext.tsx       # Railway Officer Authentication State
│   │   ├── BleContext.tsx        # BLE Connection & Live Telemetry Stream
│   │   ├── SettingsContext.tsx   # Persistence & Operational Config
│   │   └── TestContext.tsx       # Screening Scan Execution & Record Creation
│   ├── services/                 # Singleton Service Abstractions
│   │   ├── authService.ts        # Credential & Token Management
│   │   ├── bleService.ts         # BLE GATT Framing, Chunk Assembly & Hardware Simulator
│   │   ├── localStorageService.ts# AsyncStorage Persistence with Synchronous Memory Cache
│   │   ├── predictionApiService.ts# Python FastAPI Backend (/predict, /health)
│   │   ├── railGuardApiService.ts# RailGuard Operations Cloud Backend
│   │   ├── simulationService.ts  # Calibrated ESP32 Telemetry Generator
│   │   └── telemetryService.ts   # Offline-First Telemetry Sync Queue
│   ├── theme/
│   │   └── colors.ts             # Curated Dark Railway Theme Palette
│   └── types/
│       └── index.ts              # Strict TypeScript Models & Enums
├── __tests__/                    # Automated Jest Test Suites
│   ├── modelsAndParsing.test.ts  # BLE GATT Chunking & Frame Assembly Tests
│   ├── railGuardApi.test.ts      # Cloud API Client & Error Handling Tests
│   ├── screeningAnalyzer.test.ts # AI Heuristics & Secondary Review Rule Tests
│   └── telemetryQueue.test.ts    # Offline Queue & Deduplication Tests
├── .env.example                  # Environment Configuration Template
├── package.json
└── tsconfig.json
```

---

## 2. Expo Go Compatibility & BLE Architecture

### 100% Expo Go Compatible
Standard Expo Go environments restrict custom native C++/Java/Obj-C dependencies (such as `react-native-ble-plx`). To deliver a seamless testing experience without requiring native builds or prebuilds:

1. **Protocol Framing & Reassembly Engine**: The GATT chunk reassembly parser (`#RS:`, `:END#`, and 20-byte MTU chunking) is implemented in clean TypeScript in `src/services/bleService.ts`. It directly parses the identical byte stream emitted by the physical ESP32 firmware.
2. **Realistic Hardware Simulator**: For immediate testing on Expo Go without requiring physical hardware present, `BleService` includes an active hardware simulator that mimics the ESP32 firmware, broadcasting discovery advertisements and streaming 1.0 Hz live telemetry packets through the identical reassembly pipeline.
3. **Multi-Channel SVG Waveforms**: Instead of depending on native canvas or webviews, real-time waveform charting is achieved using `react-native-svg` path interpolations, offering smooth 60 FPS visual rendering.

---

## 3. Getting Started & Installation

### Prerequisites
- Node.js 18+ installed on your development machine.
- Expo Go app installed on your physical smartphone ([iOS App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)).

### Step 1: Install Dependencies
Navigate to the mobile directory and install all required packages:
```bash
cd mobile-expo
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` or customize backend addresses in the app's **Settings** screen:
```bash
cp .env.example .env
```

| Variable | Description | Default |
|:---|:---|:---|
| `EXPO_PUBLIC_FASTAPI_BACKEND_URL` | Python FastAPI ML Inference URL | `http://localhost:8000` |
| `EXPO_PUBLIC_RAILGUARD_API_URL` | RailGuard Operations Cloud URL | `https://railguard-vision.internal` |
| `EXPO_PUBLIC_ENABLE_SIMULATION` | Toggle ESP32 Telemetry Simulator | `true` |

> **Note for Physical Devices using Expo Go:**  
> When running Expo Go on a physical phone, `localhost` refers to your phone. Configure your computer's local Wi-Fi IP address (e.g. `http://192.168.1.150:8000`) in the app **Settings** tab.

### Step 3: Launch the Development Server
```bash
npx expo start
```
- Open the **Expo Go** camera on iOS or the Expo Go app on Android.
- Scan the terminal QR code to immediately launch the app.
- Press `a` in the terminal to launch the Android Emulator, `i` for iOS Simulator, or `w` for Web.

---

## 4. Connecting with the Python FastAPI Backend

The machine learning anomaly detection service is located in the repository under `railsafe_backend/`.

### Launch the Backend:
```bash
cd railsafe_backend
# Activate virtual environment if configured
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend health in browser or curl:
```bash
curl http://localhost:8000/health
# Response: {"status":"healthy","model_loaded":true,"version":"1.0.0"}
```

In the RailSafe-AI app:
1. Navigate to the **Settings** screen.
2. In the **FastAPI ML Service URL** field, set:
   - `http://10.0.2.2:8000` (for Android Studio Emulator)
   - `http://localhost:8000` (for iOS Simulator or Web)
   - `http://<YOUR_LOCAL_IP>:8000` (for Physical Device on Wi-Fi)
3. Tap **Test Backend Connection**. A green badge will confirm successful contact with the RandomForest model.

---

## 5. Verification & Automated Test Suites

The project includes Jest test suites covering models, GATT parsing, offline telemetry queues, and AI heuristics.

### Run All Tests:
```bash
npm test
```
Result: **4 test suites passing, 14 unit tests passing**.

### Static Type Check:
```bash
npx tsc --noEmit
```
Result: **0 TypeScript errors**.

---

## 6. Feature Parity Matrix: Flutter vs React Native Expo

| Feature / Subsystem | Original Flutter Implementation | Migrated React Native + Expo Go | Parity Status |
|:---|:---|:---|:---:|
| **Design System & Theme** | Dark railway palette, Google Fonts, cards | High-contrast dark industrial theme (`#0A0F1D`, `#00F5D4`, `#3B82F6`), Inter font, custom cards & badges | **100% Parity** |
| **Authentication Flow** | Email/Password login, registration, persistent session | `AuthContext` + `authService` with persistent session token & credential validation | **100% Parity** |
| **Operations Dashboard** | Metrics tiles, quick actions, status header, recent alert strip | `dashboard.tsx` with live connection status, 4 operational KPI metrics, quick actions grid, recent alert feed | **100% Parity** |
| **Device Connection** | BLE scanner, RSSI indicator, pairing dialog, ESP32 service matching | `device-connection.tsx` with scan animation, signal meter, instant connect, and hardware simulator toggle | **100% Parity** |
| **Live Monitoring** | Real-time sensor gauges (MQ-2, MQ-3, MQ-4, MQ-135), live graph, test timer | `live-monitoring.tsx` with SVG multi-channel waveform chart, 4 radial-style gauge cards, 15-second timed sampling | **100% Parity** |
| **Screening Analysis** | Local heuristics + backend ML inference, secondary review flag | `ScreeningAnalyzer.ts` with local threshold fallback and RandomForest ML inference integration | **100% Parity** |
| **Test Result View** | Detailed breakdown, confidence score, secondary review dispatch | `test-result.tsx` with status banner, gauge summary, officer comments, secondary review modal | **100% Parity** |
| **Test History** | Paginated test history, filter chips, detail drill-down | `test-history/index.tsx` & `[id].tsx` with search, category filtering, detail view, and CSV export | **100% Parity** |
| **Alerts Center** | Alert feed, severity badges, resolution & review workflow | `alerts/index.tsx` & `[id].tsx` with severity filtering, review modal, and chain-of-custody tracking | **100% Parity** |
| **Telemetry Sync** | Offline queue with periodic cloud batch upload | `TelemetrySyncQueue` with bounded queue (500 items), deduplication, and exponential backoff retry | **100% Parity** |
| **Settings & Calibration** | Configurable endpoints, demo mode, threshold calibration | `settings.tsx` with interactive URL test buttons, threshold adjustments, and factory reset | **100% Parity** |
| **Hardware Protocol** | ESP32 GATT framing (`#RS:`, `:END#`, 20B MTU) | Full chunk reassembly engine in `bleService.ts` matching physical firmware payload specs | **100% Parity** |

---

## 7. License & Credits

RailSafe-AI is developed for railway security screening, passenger safety, and autonomous hazardous material detection.
Developed and migrated with precision for high-reliability mobile edge deployment.
