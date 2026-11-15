// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Telemetry Validation Middleware (Day 2 Milestone)
// Enforces strict schema, numeric boundaries, and data sanitization
// on high-velocity IoT ingest streams before hitting the Time-Series buffer.
// ═══════════════════════════════════════════════════════════════════════

const VALID_SENSOR_TYPES = [
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
];

const NUMERIC_BOUNDS = {
  temperature: { min: -50, max: 1500 },
  pressure:    { min: 0,   max: 500 },
  humidity:    { min: 0,   max: 100 },
  vibration:   { min: 0,   max: 100 },
  rpm:         { min: 0,   max: 20000 },
  voltage:     { min: 0,   max: 1000 },
  current:     { min: 0,   max: 500 },
  flow_rate:   { min: 0,   max: 5000 },
  gas_level:   { min: 0,   max: 10000 },
};

/**
 * Validates a single telemetry payload object.
 * Returns { valid: boolean, error: string|null, sanitized: object }
 */
function validateTelemetryPayload(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  // 1. Device ID checks
  if (!data.deviceId || typeof data.deviceId !== 'string' || data.deviceId.trim().length === 0) {
    return { valid: false, error: 'Invalid or missing "deviceId" string' };
  }
  const cleanDeviceId = data.deviceId.trim().toUpperCase();

  // 2. Sensor Type checks
  if (!data.sensorType || !VALID_SENSOR_TYPES.includes(data.sensorType.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid "sensorType". Allowed: ${VALID_SENSOR_TYPES.join(', ')}`,
    };
  }
  const cleanSensorType = data.sensorType.toLowerCase();

  // 3. Numeric value checks
  const numValue = Number(data.value);
  if (data.value === undefined || isNaN(numValue) || !isFinite(numValue)) {
    return { valid: false, error: '"value" must be a valid finite number' };
  }

  // 4. Boundary sanity check
  const bounds = NUMERIC_BOUNDS[cleanSensorType];
  if (bounds) {
    if (numValue < bounds.min || numValue > bounds.max) {
      return {
        valid: false,
        error: `Value ${numValue} out of realistic bounds for ${cleanSensorType} [${bounds.min}, ${bounds.max}]`,
      };
    }
  }

  // 5. Sanitized document
  const sanitized = {
    deviceId: cleanDeviceId,
    deviceName: data.deviceName ? String(data.deviceName).trim() : cleanDeviceId,
    sensorType: cleanSensorType,
    unit: data.unit ? String(data.unit).trim() : '',
    value: parseFloat(numValue.toFixed(4)),
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    tags: {
      location: data.tags?.location ? String(data.tags.location).trim() : 'Unspecified',
      zone: data.tags?.zone ? String(data.tags.zone).trim() : 'Floor 1',
      priority: ['low', 'medium', 'high', 'critical'].includes(data.tags?.priority)
        ? data.tags.priority
        : 'medium',
    },
  };

  return { valid: true, error: null, sanitized };
}

/**
 * Express middleware for single telemetry POST endpoint.
 */
function validateSingleTelemetry(req, res, next) {
  const result = validateTelemetryPayload(req.body);
  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }
  req.sanitizedTelemetry = result.sanitized;
  next();
}

/**
 * Express middleware for batch telemetry POST endpoint.
 */
function validateBatchTelemetry(req, res, next) {
  if (!Array.isArray(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'Body must be a non-empty array of telemetry objects' });
  }

  const sanitizedBatch = [];
  const errors = [];

  req.body.forEach((item, index) => {
    const res = validateTelemetryPayload(item);
    if (!res.valid) {
      errors.push({ index, error: res.error });
    } else {
      sanitizedBatch.push(res.sanitized);
    }
  });

  if (errors.length > 0 && sanitizedBatch.length === 0) {
    return res.status(400).json({ error: 'All batch items failed validation', details: errors });
  }

  req.sanitizedBatch = sanitizedBatch;
  req.validationWarnings = errors.length > 0 ? errors : null;
  next();
}

module.exports = {
  validateTelemetryPayload,
  validateSingleTelemetry,
  validateBatchTelemetry,
  VALID_SENSOR_TYPES,
};

