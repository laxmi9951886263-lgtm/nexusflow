const mongoose = require('mongoose');

// ─── Device Registry ────────────────────────────────────────────────
// Stores registered IoT devices / sensors that feed telemetry data.

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'turbine',
      'pump',
      'compressor',
      'conveyor',
      'boiler',
      'hvac',
      'generator',
      'custom',
    ],
  },
  sensors: [
    {
      sensorType: {
        type: String,
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
      unit: { type: String, default: '' },
      minValue: { type: Number, default: 0 },
      maxValue: { type: Number, default: 100 },
    },
  ],
  location: {
    zone: { type: String, default: 'Floor 1' },
    building: { type: String, default: 'Main' },
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'error'],
    default: 'online',
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Device', deviceSchema);

