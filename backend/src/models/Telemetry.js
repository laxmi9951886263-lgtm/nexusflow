const mongoose = require('mongoose');

// ─── MongoDB Time-Series Collection for IoT Telemetry ───────────────
// Uses MongoDB 5.0+ native Time-Series collections optimized for
// high-ingest, append-only sensor data with automatic bucketing.

const telemetrySchema = new mongoose.Schema({
  // ── Metadata (indexed for grouping) ──
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  deviceName: {
    type: String,
    default: 'Unknown Device',
  },
  sensorType: {
    type: String,
    required: true,
    enum: [
      'temperature',
      'pressure',
      'humidity',
      'vibration',
      'rpm',
      'voltage',
      'current',
      'flow_rate',
      'gas_level',
      'custom',
    ],
  },
  unit: {
    type: String,
    default: '',
  },

  // ── Time Field (mandatory for time-series) ──
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // ── Measurement Value ──
  value: {
    type: Number,
    required: true,
  },

  // ── Optional tags for filtering ──
  tags: {
    location: { type: String, default: '' },
    zone: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
  },

  // ── Alert flag (set by rule engine) ──
  alertTriggered: {
    type: Boolean,
    default: false,
  },
}, {
  // ─── TIME-SERIES COLLECTION OPTIONS ───
  timeseries: {
    timeField: 'timestamp',
    metaField: 'deviceId',
    granularity: 'seconds',  // optimized for per-second sensor reads
  },
  expireAfterSeconds: 60 * 60 * 24 * 30, // auto-delete after 30 days
});

// ── Compound indexes for fast queries ──
telemetrySchema.index({ deviceId: 1, timestamp: -1 });
telemetrySchema.index({ sensorType: 1, timestamp: -1 });
telemetrySchema.index({ 'tags.priority': 1, timestamp: -1 });

module.exports = mongoose.model('Telemetry', telemetrySchema);

