# NexusFlow — Visual IoT Telemetry & Rule Engine

A visual, no-code IoT telemetry and reactive rule engine platform. Factory operators can visually assemble complex logic pipelines by connecting IoT sensor nodes to filter nodes and action triggers.

---

## 🏗️ Architecture & Tech Stack

- **Backend:** Node.js, Express, WebSocket (`ws`), MongoDB 5.0+ (Native Time-Series Collections)
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

### 2. Run Ingestion Benchmark:
```bash
node backend/scripts/benchmarkIngest.js
```

### 3. Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Open UI on: `http://localhost:5173`
