# NexusFlow — Visual IoT Telemetry & Rule Engine

A visual, no-code IoT telemetry and reactive rule engine platform. Factory operators can visually assemble complex logic pipelines by connecting IoT sensor nodes to filter nodes and action triggers.

---

## 🏗️ Architecture & Tech Stack

- **Backend:** Node.js, Express, RxJS (Reactive Observables), WebSocket (`ws`), MongoDB 5.0+ (Native Time-Series Collections)
- **Frontend:** React, React Flow (interactive node-based drag & drop canvas), Vite
- **Data Ingestion:** In-memory batch write buffer handling **5,000+ writes/second** into MongoDB Time-Series bucketing.

---

## 📅 Daily Milestones & Commit Log

### Day 1 (Nov 12): Project Scaffolding & Initial Canvas
- Time-Series schema definition (`Telemetry.js`) with second-level granularity.
- High-speed ingestion API (`POST /api/ingest`, `POST /api/ingest/batch`).
- React Flow visual workspace with custom nodes (`SensorSourceNode`, `MathOperationNode`, `ThresholdCheckNode`, `AlertActionNode`).

### Day 2 (Nov 14): Ingestion Validation & Range Aggregations
- Added schema validation middleware (`backend/src/middleware/validator.js`) enforcing strict numeric bounds, type casting, and device sanitization.
- Added `/api/ingest/time-range` endpoint for rolling-window statistical aggregations (min, max, avg, sample count).
- Added automated benchmark suite (`backend/scripts/benchmarkIngest.js`) validating 10,000 records in 24ms (~416k ops/sec).

### Day 3 (Nov 15): IoT Device Registry & Dynamic Hardware Simulator
- Built IoT device diagnostics and state manager (`backend/src/routes/devices.js`) with `/health` reports and state toggles (`online`, `offline`, `maintenance`, `error`).
- Expanded industrial telemetry simulator (`backend/src/services/simulator.js`) with calibrated thresholds (warning, critical) and active anomaly injection.
- Added simulator control endpoints (`backend/src/routes/simulator.js`) for runtime chaos testing (`/inject`, `/status`, `/reset`).
- Created automated test suite (`backend/scripts/testDeviceRegistry.js`) with 10/10 tests passing.

### Day 4 (Nov 16): Canvas Connection Validation & Template Toolbar
- Added intelligent topology validator (`frontend/src/utils/flowValidation.js`) enforcing acyclic directed flow, terminal sinks, and root sources.
- Built interactive toolbar component (`frontend/src/components/CanvasToolbar.jsx`) with preset rule templates (Turbine Overheat SMS, Boiler Safety Webhook) and topology metrics.
- Upgraded `App.jsx` with connection error toasts, quick node creation buttons, and dynamic wire coloring.

### Day 5 (Nov 17): Graph JSON Serialization & Topological Execution Planner
- Created graph compiler planner (`backend/src/services/graphSerializer.js`) implementing Kahn's algorithm for topological sorting and cycle detection.
- Added `/api/graphs/validate`, `/api/graphs/:id/export`, and `/api/graphs/import` endpoints for visual-to-stream compilation.
- Created automated verification test suite (`backend/scripts/testGraphSerialization.js`) with 10/10 tests passing.

### Day 6 (Nov 19): RxJS Reactive Stream Compiler Engine
- Built logic compilation engine (`backend/src/services/streamCompiler.js`) transforming visual React Flow graphs into active RxJS Observables (`filter`, `map`, `tap`).
- Added execution controller endpoints (`backend/src/routes/execution.js`) for compiling, executing, and stopping live stream pipelines (`/compile/:id`, `/stop/:id`, `/active`).
- Wired continuous telemetry feed directly into the reactive event bus (`telemetryBus$`).
- Created automated stream test suite (`backend/scripts/testStreamCompiler.js`) with 12/12 tests passing.

---

## 🚀 Quick Start Guide

### 1. Start Backend:
```bash
cd backend
npm install
npm start
```
- API Running on: `http://localhost:4000/api`
- WebSocket Telemetry: `ws://localhost:4000/ws`

### 2. Run Test Suites:
```bash
# Day 2 Ingestion Benchmark
node backend/scripts/benchmarkIngest.js

# Day 3 Device Registry & Anomaly Test
node backend/scripts/testDeviceRegistry.js

# Day 5 Graph Serialization & DAG Test
node backend/scripts/testGraphSerialization.js

# Day 6 RxJS Stream Compiler Test
node backend/scripts/testStreamCompiler.js
```

### 3. Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Open UI on: `http://localhost:5173`
