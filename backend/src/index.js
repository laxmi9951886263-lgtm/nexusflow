// ═══════════════════════════════════════════════════════════════════════
// NexusFlow Backend — Main Server (Day 6 Stream-Compiler Enabled)
// Express + MongoDB Time-Series + RxJS Reactive Stream Engine
// ═══════════════════════════════════════════════════════════════════════

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const mongoose = require('mongoose');

// ── Routes ──
const ingestionRoutes = require('./routes/ingestion');
const deviceRoutes = require('./routes/devices');
const graphRoutes = require('./routes/graphs');
const simulatorRoutes = require('./routes/simulator');
const executionRoutes = require('./routes/execution');

// ── Services ──
const { generateBatch, getDeviceList } = require('./services/simulator');
const { pushTelemetryToStream } = require('./services/streamCompiler');
const Device = require('./models/Device');

// ── Config ──
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexusflow';

const app = express();
const server = http.createServer(app);

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ═══════════════════════════════════════════════════════════════════════
// WebSocket Server — broadcasts telemetry to all connected clients
// ═══════════════════════════════════════════════════════════════════════
const wss = new WebSocketServer({ server, path: '/ws' });

const wsClients = new Set();
wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`[WS] Client connected (total: ${wsClients.size})`);

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[WS] Client disconnected (total: ${wsClients.size})`);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to NexusFlow Telemetry Stream',
    timestamp: new Date().toISOString(),
  }));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === 1) { // OPEN
      client.send(msg);
    }
  }
}
app.locals.broadcast = broadcast;

// ═══════════════════════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════════════════════
app.use('/api/ingest', ingestionRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/graphs', graphRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/execution', executionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    service: 'NexusFlow Backend',
    status: 'running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    wsClients: wsClients.size,
    uptime: Math.round(process.uptime()),
    modules: ['Time-Series-Ingest', 'Device-Registry', 'RxJS-Stream-Compiler', 'WebSocket-Broadcaster'],
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MongoDB Connection + Server Start
// ═══════════════════════════════════════════════════════════════════════
let simulatorInterval = null;

async function start() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('[DB] ✅ Connected to MongoDB');

    const deviceCount = await Device.countDocuments();
    if (deviceCount === 0) {
      const mockDevices = getDeviceList();
      await Device.insertMany(mockDevices);
      console.log(`[DB] 🌱 Seeded ${mockDevices.length} mock devices`);
    }
  } catch (err) {
    console.warn('[DB] ⚠️ MongoDB unavailable — running in demo mode (in-memory persistence)');
  }

  // Start HTTP + WS server
  server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║    NexusFlow — Visual IoT Rule Engine (Day 6)   ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  🌐 HTTP API:    http://localhost:${PORT}/api      ║`);
    console.log(`║  📡 WebSocket:   ws://localhost:${PORT}/ws         ║`);
    console.log(`║  ⚡ Stream Run:  POST /api/execution/compile/:id ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });

  // Start Mock Telemetry Simulator -> feed to both WebSocket and RxJS stream
  simulatorInterval = setInterval(() => {
    const batch = generateBatch();
    batch.forEach((point) => {
      pushTelemetryToStream(point);
      broadcast({ type: 'telemetry', data: point });
    });
  }, 1000);

  console.log('[Simulator] 📊 Mock telemetry broadcasting & streaming into RxJS compiler every 1s');
}

start();

process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  if (simulatorInterval) clearInterval(simulatorInterval);
  wss.close();
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = { app, server, wss };
