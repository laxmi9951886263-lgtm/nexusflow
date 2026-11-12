const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');

// ═══════════════════════════════════════════════════════════════════════
// HIGH-SPEED TELEMETRY INGESTION ENDPOINTS
// Designed for 5,000+ writes/sec with MongoDB Time-Series collections
// ═══════════════════════════════════════════════════════════════════════

// ── In-memory buffer for batch writes (performance optimization) ──
let writeBuffer = [];
let flushTimer = null;
const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 500;

// Stats tracking
const stats = {
  totalIngested: 0,
  totalBatches: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Flush the write buffer to MongoDB in a single insertMany call.
 * This reduces per-document overhead and maximizes throughput.
 */
async function flushBuffer() {
  if (writeBuffer.length === 0) return;

  const batch = writeBuffer.splice(0, writeBuffer.length);
  try {
    await Telemetry.insertMany(batch, { ordered: false });
    stats.totalBatches++;
    stats.totalIngested += batch.length;
  } catch (err) {
    stats.errors++;
    console.error(`[Ingestion] Batch write error (${batch.length} docs):`, err.message);
  }
}

// Start periodic flush timer
function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/ingest — Single telemetry point
// Body: { deviceId, sensorType, value, unit?, tags?, timestamp? }
// ─────────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { deviceId, sensorType, value, unit, tags, timestamp } = req.body;

  if (!deviceId || !sensorType || value === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: deviceId, sensorType, value',
    });
  }

  const doc = {
    deviceId,
    sensorType,
    value: Number(value),
    unit: unit || '',
    tags: tags || {},
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  };

  writeBuffer.push(doc);
  startFlushTimer();

  // Auto-flush when buffer is full
  if (writeBuffer.length >= BATCH_SIZE) {
    flushBuffer();
  }

  // Broadcast to WebSocket clients (will be wired in index.js)
  if (req.app.locals.broadcast) {
    req.app.locals.broadcast({
      type: 'telemetry',
      data: doc,
    });
  }

  res.status(202).json({ status: 'accepted', buffered: writeBuffer.length });
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/ingest/batch — Batch ingestion (array of points)
// Body: [ { deviceId, sensorType, value, ... }, ... ]
// ─────────────────────────────────────────────────────────────────────
router.post('/batch', async (req, res) => {
  const points = req.body;

  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: 'Body must be a non-empty array' });
  }

  const docs = points.map((p) => ({
    deviceId: p.deviceId,
    sensorType: p.sensorType,
    value: Number(p.value),
    unit: p.unit || '',
    tags: p.tags || {},
    timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
  }));

  try {
    await Telemetry.insertMany(docs, { ordered: false });
    stats.totalIngested += docs.length;
    stats.totalBatches++;

    // Broadcast latest point
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast({
        type: 'telemetry_batch',
        count: docs.length,
        latest: docs[docs.length - 1],
      });
    }

    res.json({ status: 'ok', ingested: docs.length });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/ingest/stats — Ingestion statistics
// ─────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const uptimeSec = (Date.now() - stats.startTime) / 1000;
  res.json({
    totalIngested: stats.totalIngested,
    totalBatches: stats.totalBatches,
    errors: stats.errors,
    avgWritesPerSec: Math.round(stats.totalIngested / Math.max(uptimeSec, 1)),
    uptimeSeconds: Math.round(uptimeSec),
    bufferSize: writeBuffer.length,
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/ingest/query — Query telemetry data
// Query: ?deviceId=xxx&sensorType=temperature&from=ISO&to=ISO&limit=100
// ─────────────────────────────────────────────────────────────────────
router.get('/query', async (req, res) => {
  const { deviceId, sensorType, from, to, limit } = req.query;

  const filter = {};
  if (deviceId) filter.deviceId = deviceId;
  if (sensorType) filter.sensorType = sensorType;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  try {
    const docs = await Telemetry.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit) || 100)
      .lean();

    res.json({ count: docs.length, data: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/ingest/aggregate — Aggregation pipeline
// Query: ?deviceId=xxx&sensorType=temperature&interval=minute|hour|day
// ─────────────────────────────────────────────────────────────────────
router.get('/aggregate', async (req, res) => {
  const { deviceId, sensorType, interval } = req.query;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const dateGroup = {
    minute: {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' },
      hour: { $hour: '$timestamp' },
      minute: { $minute: '$timestamp' },
    },
    hour: {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' },
      hour: { $hour: '$timestamp' },
    },
    day: {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' },
    },
  };

  const matchStage = { deviceId };
  if (sensorType) matchStage.sensorType = sensorType;

  try {
    const results = await Telemetry.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateGroup[interval] || dateGroup.minute,
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
          count: { $sum: 1 },
          firstTimestamp: { $first: '$timestamp' },
        },
      },
      { $sort: { firstTimestamp: -1 } },
      { $limit: 100 },
    ]);

    res.json({ interval: interval || 'minute', data: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

