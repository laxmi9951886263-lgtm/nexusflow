// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — IoT Hardware Telemetry Simulator (Day 3 Enhanced)
// Features: Realistic continuous stream, dynamic anomaly injection,
// jitter modeling, and device state synchronization.
// ═══════════════════════════════════════════════════════════════════════

const DEVICES = [
  {
    deviceId: 'TURB-001',
    name: 'Main Turbine A',
    type: 'turbine',
    location: { zone: 'Floor 1', building: 'Powerhouse' },
    status: 'online',
    sensors: [
      { type: 'temperature', unit: '°C', base: 72, variance: 8, warningThreshold: 85, criticalThreshold: 95 },
      { type: 'rpm',         unit: 'RPM', base: 3500, variance: 150, warningThreshold: 3800, criticalThreshold: 4100 },
      { type: 'vibration',   unit: 'mm/s', base: 2.2, variance: 0.8, warningThreshold: 4.5, criticalThreshold: 6.0 },
    ],
  },
  {
    deviceId: 'PUMP-002',
    name: 'Coolant Pump B',
    type: 'pump',
    location: { zone: 'Floor 1', building: 'Cooling Bay' },
    status: 'online',
    sensors: [
      { type: 'pressure',    unit: 'PSI', base: 45, variance: 5, warningThreshold: 60, criticalThreshold: 75 },
      { type: 'flow_rate',   unit: 'L/min', base: 120, variance: 15, warningThreshold: 150, criticalThreshold: 180 },
      { type: 'temperature', unit: '°C', base: 36, variance: 4, warningThreshold: 50, criticalThreshold: 65 },
    ],
  },
  {
    deviceId: 'COMP-003',
    name: 'Air Compressor C',
    type: 'compressor',
    location: { zone: 'Floor 2', building: 'Pneumatics' },
    status: 'online',
    sensors: [
      { type: 'pressure',    unit: 'bar', base: 8.2, variance: 1.1, warningThreshold: 11.0, criticalThreshold: 13.0 },
      { type: 'current',     unit: 'A', base: 22.0, variance: 3.5, warningThreshold: 30.0, criticalThreshold: 38.0 },
      { type: 'temperature', unit: '°C', base: 54.0, variance: 6.0, warningThreshold: 70.0, criticalThreshold: 85.0 },
    ],
  },
  {
    deviceId: 'BOIL-004',
    name: 'Steam Boiler D',
    type: 'boiler',
    location: { zone: 'Basement', building: 'Thermal Plant' },
    status: 'online',
    sensors: [
      { type: 'temperature', unit: '°C', base: 182, variance: 12, warningThreshold: 210, criticalThreshold: 235 },
      { type: 'pressure',    unit: 'bar', base: 12.5, variance: 1.8, warningThreshold: 16.0, criticalThreshold: 19.0 },
      { type: 'gas_level',   unit: 'ppm', base: 14.0, variance: 6.0, warningThreshold: 30.0, criticalThreshold: 50.0 },
    ],
  },
];

// Active user-injected anomalies queue
// Format: { id, deviceId, sensorType, spikeMultiplier, expiresAt, reason }
const activeAnomalies = new Map();

// Runtime simulator stats
const simulatorStats = {
  readingsEmitted: 0,
  anomaliesInjectedTotal: 0,
  activeAnomaliesCount: 0,
  startedAt: Date.now(),
};

/**
 * Injects a manual anomaly for a specific device and sensor.
 */
function injectAnomaly({ deviceId, sensorType, spikeMultiplier = 2.0, durationSeconds = 15, reason = 'Manual test injection' }) {
  const id = `anom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const anomaly = {
    id,
    deviceId: deviceId.toUpperCase(),
    sensorType: sensorType.toLowerCase(),
    spikeMultiplier: Number(spikeMultiplier),
    expiresAt: Date.now() + durationSeconds * 1000,
    durationSeconds,
    reason,
  };

  activeAnomalies.set(id, anomaly);
  simulatorStats.anomaliesInjectedTotal++;
  simulatorStats.activeAnomaliesCount = activeAnomalies.size;

  return anomaly;
}

/**
 * Clears all active anomalies or for a specific device.
 */
function clearAnomalies(deviceId = null) {
  if (!deviceId) {
    activeAnomalies.clear();
  } else {
    for (const [id, anom] of activeAnomalies.entries()) {
      if (anom.deviceId === deviceId.toUpperCase()) {
        activeAnomalies.delete(id);
      }
    }
  }
  simulatorStats.activeAnomaliesCount = activeAnomalies.size;
}

/**
 * Generates a single reading, applying active anomalies if matched.
 */
function generateReading(device, sensor) {
  // Purge expired anomalies
  const now = Date.now();
  for (const [id, anom] of activeAnomalies.entries()) {
    if (anom.expiresAt <= now) {
      activeAnomalies.delete(id);
    }
  }
  simulatorStats.activeAnomaliesCount = activeAnomalies.size;

  // Check if this sensor has an active anomaly
  let activeAnomaly = null;
  for (const anom of activeAnomalies.values()) {
    if (anom.deviceId === device.deviceId && anom.sensorType === sensor.type) {
      activeAnomaly = anom;
      break;
    }
  }

  // Base random noise
  const noise = (Math.random() - 0.5) * 2 * sensor.variance;
  let finalValue = sensor.base + noise;
  let isTriggered = false;

  if (activeAnomaly) {
    // Explicit user anomaly
    finalValue *= activeAnomaly.spikeMultiplier;
    isTriggered = true;
  } else if (Math.random() < 0.03) {
    // 3% natural random spike
    finalValue += sensor.variance * 2.2;
    isTriggered = true;
  }

  finalValue = parseFloat(finalValue.toFixed(2));
  simulatorStats.readingsEmitted++;

  const priority = finalValue >= (sensor.criticalThreshold || 1000) ? 'critical'
                 : finalValue >= (sensor.warningThreshold || 800) ? 'high'
                 : 'medium';

  return {
    deviceId: device.deviceId,
    deviceName: device.name,
    sensorType: sensor.type,
    unit: sensor.unit,
    value: finalValue,
    timestamp: new Date(),
    tags: {
      zone: device.location?.zone || 'Factory Floor',
      priority,
    },
    anomaly: isTriggered ? (activeAnomaly?.reason || 'Stochastic anomaly spike') : null,
  };
}

/**
 * Generate a full batch across all devices and sensors.
 */
function generateBatch() {
  const batch = [];
  for (const device of DEVICES) {
    if (device.status === 'offline') continue;
    for (const sensor of device.sensors) {
      batch.push(generateReading(device, sensor));
    }
  }
  return batch;
}

function getDeviceList() {
  return DEVICES.map((d) => ({
    deviceId: d.deviceId,
    name: d.name,
    type: d.type,
    sensors: d.sensors.map((s) => ({
      sensorType: s.type,
      unit: s.unit,
      minValue: s.base - s.variance * 2,
      maxValue: s.base + s.variance * 2,
      warningThreshold: s.warningThreshold,
      criticalThreshold: s.criticalThreshold,
    })),
    location: d.location,
    status: d.status,
  }));
}

function getSimulatorStatus() {
  return {
    ...simulatorStats,
    uptimeSeconds: Math.round((Date.now() - simulatorStats.startedAt) / 1000),
    activeAnomalies: Array.from(activeAnomalies.values()),
    devicesRegistered: DEVICES.length,
    devicesOnline: DEVICES.filter((d) => d.status !== 'offline').length,
  };
}

module.exports = {
  generateReading,
  generateBatch,
  getDeviceList,
  injectAnomaly,
  clearAnomalies,
  getSimulatorStatus,
  DEVICES,
};
