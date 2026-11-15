const express = require('express');
const router = express.Router();
const {
  injectAnomaly,
  clearAnomalies,
  getSimulatorStatus,
  DEVICES,
} = require('../services/simulator');

// ═══════════════════════════════════════════════════════════════════════
// HARDWARE SIMULATOR & ANOMALY INJECTION CONTROLLER (Day 3 Feature)
// Allows testers to trigger real-time anomalies (overheating, vibration surge)
// to verify dynamic rule engine execution.
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// GET /api/simulator/status — Current simulation metrics & active anomalies
// ─────────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json(getSimulatorStatus());
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/simulator/inject — Inject hardware anomaly
// Body: { deviceId, sensorType, spikeMultiplier?, durationSeconds?, reason? }
// ─────────────────────────────────────────────────────────────────────
router.post('/inject', (req, res) => {
  const { deviceId, sensorType, spikeMultiplier = 2.0, durationSeconds = 20, reason } = req.body;

  if (!deviceId || !sensorType) {
    return res.status(400).json({ error: 'deviceId and sensorType are required' });
  }

  const cleanDeviceId = String(deviceId).toUpperCase();
  const cleanSensor = String(sensorType).toLowerCase();

  const dev = DEVICES.find((d) => d.deviceId === cleanDeviceId);
  if (!dev) {
    return res.status(404).json({ error: `Device ${cleanDeviceId} not found in simulator` });
  }

  const hasSensor = dev.sensors.some((s) => s.type === cleanSensor);
  if (!hasSensor) {
    return res.status(400).json({ error: `Sensor ${cleanSensor} does not exist on device ${cleanDeviceId}` });
  }

  const anomaly = injectAnomaly({
    deviceId: cleanDeviceId,
    sensorType: cleanSensor,
    spikeMultiplier: Number(spikeMultiplier),
    durationSeconds: Number(durationSeconds),
    reason: reason || `Manual anomaly injection (${spikeMultiplier}x spike)`,
  });

  res.status(201).json({
    status: 'anomaly_injected',
    anomaly,
    notice: `Sensor ${cleanDeviceId}.${cleanSensor} will spike by ${spikeMultiplier}x for ${durationSeconds}s`,
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/simulator/reset — Clear active anomalies
// ─────────────────────────────────────────────────────────────────────
router.post('/reset', (req, res) => {
  const { deviceId } = req.body || {};
  clearAnomalies(deviceId || null);
  res.json({
    status: 'ok',
    message: deviceId ? `Cleared anomalies for ${deviceId}` : 'Cleared all active anomalies',
    currentStatus: getSimulatorStatus(),
  });
});

module.exports = router;
