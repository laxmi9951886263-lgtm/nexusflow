// ═══════════════════════════════════════════════════════════════════════
// NexusFlow Backend — Main Server (Day 3 Enhanced)
// Express + MongoDB Time-Series + WebSocket for real-time telemetry
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

// ── Simulator ──
const { generateBatch, getDeviceList } = require('./services/simulator');
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

// Broadcast function — available to routes via app.locals
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    service: 'NexusFlow Backend',
    status: 'running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    wsClients: wsClients.size,
    uptime: Math.round(process.uptime()),
    features: ['time-series-ingest', 'device-registry', 'simulator-control', 'websocket-stream'],
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MongoDB Connection + Server Start
// ═══════════════════════════════════════════════════════════════════════
let simulatorInterval = null;

async function start() {
  // Try connecting to MongoDB
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('[DB] ✅ Connected to MongoDB');

    // Seed default devices if empty
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
    console.log('║         NexusFlow — IoT Rule Engine             ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  🌐 HTTP API:    http://localhost:${PORT}/api      ║`);
    console.log(`║  📡 WebSocket:   ws://localhost:${PORT}/ws         ║`);
    console.log(`║  💓 Health:      http://localhost:${PORT}/api/health║`);
    console.log('║                                                  ║');
    console.log('║  Endpoints:                                      ║');
    console.log('║   POST /api/ingest         Single telemetry      ║');
    console.log('║   POST /api/ingest/batch   Batch telemetry       ║');
    console.log('║   GET  /api/ingest/stats   Ingestion stats       ║');
    console.log('║   GET  /api/ingest/time-range Time-window stats  ║');
    console.log('║   CRUD /api/devices        Device registry       ║');
    console.log('║   GET  /api/devices/:id/health Diagnostics       ║');
    console.log('║   POST /api/simulator/inject  Anomaly injection  ║');
    console.log('║   CRUD /api/graphs         Flow graph storage    ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });

  // ── Start Mock Telemetry Simulator ──
  simulatorInterval = setInterval(() => {
    const batch = generateBatch();
    batch.forEach((point) => {
      broadcast({ type: 'telemetry', data: point });
    });
  }, 1000);

  console.log('[Simulator] 📊 Mock telemetry broadcasting every 1s');
}

start();

// Graceful shutdown
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
