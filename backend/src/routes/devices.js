const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { DEVICES } = require('../services/simulator');

// ═══════════════════════════════════════════════════════════════════════
// IoT DEVICE REGISTRY & HEALTH DIAGNOSTICS (Day 3 Enhanced)
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// GET /api/devices — List all registered devices
// ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find().sort({ updatedAt: -1 }).lean();
    if (devices.length > 0) return res.json(devices);
  } catch (err) {
    // Fallback to in-memory simulator list when DB offline
  }
  res.json(DEVICES);
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/devices — Register a new device
// ─────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { deviceId, name, type, sensors, location } = req.body;

  if (!deviceId || !name || !type) {
    return res.status(400).json({
      error: 'Missing required fields: deviceId, name, type',
    });
  }

  const cleanDeviceId = deviceId.trim().toUpperCase();

  try {
    const device = await Device.create({
      deviceId: cleanDeviceId,
      name: name.trim(),
      type,
      sensors: sensors || [],
      location: location || {},
    });
    res.status(201).json(device);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `Device "${cleanDeviceId}" already exists` });
    }
    // In-memory fallback
    const newDev = { deviceId: cleanDeviceId, name, type, sensors: sensors || [], location: location || {}, status: 'online' };
    DEVICES.push(newDev);
    res.status(201).json(newDev);
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/devices/:deviceId — Get a single device
// ─────────────────────────────────────────────────────────────────────
router.get('/:deviceId', async (req, res) => {
  const id = req.params.deviceId.toUpperCase();
  try {
    const device = await Device.findOne({ deviceId: id }).lean();
    if (device) return res.json(device);
  } catch (err) {}

  const memDev = DEVICES.find((d) => d.deviceId === id);
  if (!memDev) return res.status(404).json({ error: `Device ${id} not found` });
  res.json(memDev);
});

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/devices/:deviceId/status — Quick state toggle (Day 3 Feature)
// Body: { status: 'online' | 'offline' | 'maintenance' | 'error' }
// ─────────────────────────────────────────────────────────────────────
router.patch('/:deviceId/status', async (req, res) => {
  const id = req.params.deviceId.toUpperCase();
  const { status } = req.body;

  const validStatuses = ['online', 'offline', 'maintenance', 'error'];
  if (!status || !validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const cleanStatus = status.toLowerCase();

  // Sync simulator in-memory state
  const simDev = DEVICES.find((d) => d.deviceId === id);
  if (simDev) {
    simDev.status = cleanStatus;
  }

  try {
    const updated = await Device.findOneAndUpdate(
      { deviceId: id },
      { status: cleanStatus, lastSeen: new Date() },
      { new: true }
    );
    if (updated) return res.json(updated);
  } catch (err) {}

  if (simDev) {
    return res.json({ deviceId: id, status: cleanStatus, updatedInSimulator: true });
  }

  res.status(404).json({ error: `Device ${id} not found` });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/devices/:deviceId/health — Diagnostic Health Report (Day 3 Feature)
// ─────────────────────────────────────────────────────────────────────
router.get('/:deviceId/health', async (req, res) => {
  const id = req.params.deviceId.toUpperCase();
  let dev = null;

  try {
    dev = await Device.findOne({ deviceId: id }).lean();
  } catch (err) {}

  if (!dev) {
    dev = DEVICES.find((d) => d.deviceId === id);
  }

  if (!dev) {
    return res.status(404).json({ error: `Device ${id} not found` });
  }

  const healthScore = dev.status === 'online' ? 98
                    : dev.status === 'maintenance' ? 70
                    : dev.status === 'error' ? 25
                    : 0;

  res.json({
    deviceId: dev.deviceId,
    name: dev.name,
    type: dev.type,
    status: dev.status,
    healthScore,
    statusLevel: healthScore >= 90 ? 'OPTIMAL' : healthScore >= 50 ? 'DEGRADED' : 'CRITICAL',
    sensorsMonitored: dev.sensors?.length || 0,
    sensors: dev.sensors || [],
    diagnostics: {
      connectivity: dev.status !== 'offline' ? 'CONNECTED' : 'DISCONNECTED',
      telemetryIngestRate: dev.status === 'online' ? '1.0 Hz' : '0.0 Hz',
      lastHeartbeat: new Date().toISOString(),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/devices/:deviceId — Remove device
// ─────────────────────────────────────────────────────────────────────
router.delete('/:deviceId', async (req, res) => {
  const id = req.params.deviceId.toUpperCase();
  try {
    await Device.findOneAndDelete({ deviceId: id });
  } catch (err) {}

  const idx = DEVICES.findIndex((d) => d.deviceId === id);
  if (idx !== -1) DEVICES.splice(idx, 1);

  res.json({ status: 'deleted', deviceId: id });
});

module.exports = router;
