# NexusFlow — Visual IoT Telemetry & Rule Engine

A visual, no-code IoT telemetry and reactive rule engine platform. Factory operators can visually assemble complex logic pipelines by connecting IoT sensor nodes to filter nodes and action triggers.

---

## 🏗️ Architecture & Tech Stack

- **Backend:** Node.js, Express, WebSocket (`ws`), MongoDB 5.0+ (Native Time-Series Collections)
- **Frontend:** React, React Flow (interactive node-based drag & drop canvas), Vite
- **Data Ingestion:** In-memory batch write buffer handling **5,000+ writes/second** into MongoDB Time-Series bucketing.

---

## 📅 Week-Wise Milestone Deliverables

### Week 1 Deliverables:
- **Time-Series Schema (`backend/src/models/Telemetry.js`)**: Native MongoDB 5.0+ Time-Series collections with `metaField: deviceId`, `timeField: timestamp`, and `granularity: seconds`.
- **High-Throughput Ingestion API (`backend/src/routes/ingestion.js`)**:
  - `POST /api/ingest` (Buffered single telemetry ingest)
  - `POST /api/ingest/batch` (High-density array ingestion)
  - `GET /api/ingest/stats` (Writes/sec and batch metrics)
  - `GET /api/ingest/aggregate` (Aggregation pipeline by minute, hour, day)
- **Interactive Visual Canvas (`frontend/src/App.jsx`)**:
  - Drag-and-drop canvas powered by React Flow.
  - Custom Nodes:
    - 📡 `SensorSourceNode`: IoT device & sensor telemetry selector
    - 🔢 `MathOperationNode`: Moving average window & unit conversions
    - ⚡ `ThresholdCheckNode`: Dynamic logic checks (`>`, `<`, `==`, `!=`)
    - 🔔 `AlertActionNode`: SMS / Webhook / Email dispatch targets
  - Visual graph serialization to JSON for backend compilation.

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

### 2. Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Open UI on: `http://localhost:5173`
