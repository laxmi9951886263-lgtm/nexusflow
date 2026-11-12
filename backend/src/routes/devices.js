const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// ─────────────────────────────────────────────────────────────────────
// GET /api/devices — List all registered devices
// ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find().sort({ updatedAt: -1 }).lean();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

  try {
    const device = await Device.create({
      deviceId,
      name,
      type,
      sensors: sensors || [],
      location: location || {},
    });
    res.status(201).json(device);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `Device "${deviceId}" already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/devices/:deviceId — Get a single device
// ─────────────────────────────────────────────────────────────────────
router.get('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId }).lean();
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// PUT /api/devices/:deviceId — Update device
// ─────────────────────────────────────────────────────────────────────
router.put('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.deviceId },
      req.body,
      { new: true }
    );
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/devices/:deviceId — Remove device
// ─────────────────────────────────────────────────────────────────────
router.delete('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOneAndDelete({ deviceId: req.params.deviceId });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json({ status: 'deleted', deviceId: req.params.deviceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

