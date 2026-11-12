// ═══════════════════════════════════════════════════════════════════════
// Mock Telemetry Simulator
// Generates realistic IoT sensor data for demo / testing purposes.
// Used when real hardware devices are not available.
// ═══════════════════════════════════════════════════════════════════════

const DEVICES = [
  {
    deviceId: 'TURB-001',
    name: 'Main Turbine A',
    sensors: [
      { type: 'temperature', unit: '°C', base: 72, variance: 15 },
      { type: 'rpm',         unit: 'RPM', base: 3500, variance: 200 },
      { type: 'vibration',   unit: 'mm/s', base: 2.5, variance: 1.5 },
    ],
  },
  {
    deviceId: 'PUMP-002',
    name: 'Coolant Pump B',
    sensors: [
      { type: 'pressure',    unit: 'PSI', base: 45, variance: 10 },
      { type: 'flow_rate',   unit: 'L/min', base: 120, variance: 30 },
      { type: 'temperature', unit: '°C', base: 35, variance: 8 },
    ],
  },
  {
    deviceId: 'COMP-003',
    name: 'Air Compressor C',
    sensors: [
      { type: 'pressure',    unit: 'bar', base: 8, variance: 2 },
      { type: 'current',     unit: 'A', base: 22, variance: 5 },
      { type: 'temperature', unit: '°C', base: 55, variance: 12 },
    ],
  },
  {
    deviceId: 'BOIL-004',
    name: 'Steam Boiler D',
    sensors: [
      { type: 'temperature', unit: '°C', base: 180, variance: 25 },
      { type: 'pressure',    unit: 'bar', base: 12, variance: 3 },
      { type: 'gas_level',   unit: 'ppm', base: 15, variance: 10 },
    ],
  },
];

/**
 * Generate a single telemetry reading with realistic noise.
 * Occasionally produces anomaly spikes (5% chance) for testing alerts.
 */
function generateReading(device, sensor) {
  const isAnomaly = Math.random() < 0.05; // 5% anomaly rate
  const noise = (Math.random() - 0.5) * 2 * sensor.variance;
  const spike = isAnomaly ? sensor.variance * 2.5 : 0;

  return {
    deviceId: device.deviceId,
    deviceName: device.name,
    sensorType: sensor.type,
    unit: sensor.unit,
    value: parseFloat((sensor.base + noise + spike).toFixed(2)),
    timestamp: new Date(),
    tags: {
      zone: 'Factory Floor',
      priority: isAnomaly ? 'critical' : 'medium',
    },
  };
}

/**
 * Generate a batch of readings from all devices.
 */
function generateBatch() {
  const batch = [];
  for (const device of DEVICES) {
    for (const sensor of device.sensors) {
      batch.push(generateReading(device, sensor));
    }
  }
  return batch;
}

/**
 * Get the list of mock devices (for seeding the Device collection).
 */
function getDeviceList() {
  return DEVICES.map((d) => ({
    deviceId: d.deviceId,
    name: d.name,
    type: d.deviceId.startsWith('TURB') ? 'turbine'
        : d.deviceId.startsWith('PUMP') ? 'pump'
        : d.deviceId.startsWith('COMP') ? 'compressor'
        : 'boiler',
    sensors: d.sensors.map((s) => ({
      sensorType: s.type,
      unit: s.unit,
      minValue: s.base - s.variance * 2,
      maxValue: s.base + s.variance * 2,
    })),
    location: { zone: 'Factory Floor', building: 'Main Plant' },
    status: 'online',
  }));
}

module.exports = { generateReading, generateBatch, getDeviceList, DEVICES };

