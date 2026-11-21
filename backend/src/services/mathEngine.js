// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Industrial Math & Signal Processing Engine (Day 7 Milestone)
// Provides sliding window moving averages, exponential smoothing,
// outlier rejection filters, and industrial unit conversions for RxJS streams.
// ═══════════════════════════════════════════════════════════════════════

// In-memory sliding windows per device+sensor
// Key: "deviceId:sensorType:windowSize" -> Array<number>
const windowBuffers = new Map();

// Exponential moving average state
// Key: "deviceId:sensorType" -> lastEmaNumber
const emaState = new Map();

/**
 * Calculates Simple Moving Average (SMA) over a sliding window.
 */
function calculateMovingAverage(key, value, windowSize = 5) {
  const size = Math.max(2, Math.min(Number(windowSize) || 5, 100));
  if (!windowBuffers.has(key)) {
    windowBuffers.set(key, []);
  }

  const buf = windowBuffers.get(key);
  buf.push(Number(value));
  if (buf.length > size) {
    buf.shift();
  }

  const sum = buf.reduce((acc, curr) => acc + curr, 0);
  return {
    sma: parseFloat((sum / buf.length).toFixed(3)),
    sampleCount: buf.length,
    windowFull: buf.length === size,
    buffer: [...buf],
  };
}

/**
 * Calculates Exponential Moving Average (EMA).
 * alpha = 2 / (windowSize + 1)
 */
function calculateEMA(key, value, windowSize = 10) {
  const alpha = 2 / (windowSize + 1);
  const current = Number(value);

  if (!emaState.has(key)) {
    emaState.set(key, current);
    return parseFloat(current.toFixed(3));
  }

  const prevEma = emaState.get(key);
  const nextEma = current * alpha + prevEma * (1 - alpha);
  emaState.set(key, nextEma);
  return parseFloat(nextEma.toFixed(3));
}

/**
 * Outlier & Glitch Rejector.
 * Rejects isolated hardware readings that differ from the current window
 * average by more than maxAllowedDelta.
 */
function isNoiseOutlier(key, value, maxAllowedDelta = 40.0) {
  const buf = windowBuffers.get(key) || [];
  if (buf.length < 3) return false; // Need at least 3 points to detect outlier

  const sum = buf.reduce((a, b) => a + b, 0);
  const avg = sum / buf.length;
  const delta = Math.abs(Number(value) - avg);

  return delta > maxAllowedDelta;
}

/**
 * Industrial unit conversion functions.
 */
const UNIT_CONVERSIONS = {
  celsiusToFahrenheit: (v) => parseFloat(((v * 9) / 5 + 32).toFixed(2)),
  fahrenheitToCelsius: (v) => parseFloat((((v - 32) * 5) / 9).toFixed(2)),
  barToPsi:            (v) => parseFloat((v * 14.5038).toFixed(2)),
  psiToBar:            (v) => parseFloat((v / 14.5038).toFixed(3)),
  lminToGpm:           (v) => parseFloat((v * 0.264172).toFixed(2)),
  gpmToLmin:           (v) => parseFloat((v / 0.264172).toFixed(2)),
  rpmToHz:             (v) => parseFloat((v / 60).toFixed(2)),
  hzToRpm:             (v) => parseFloat((v * 60).toFixed(2)),
};

/**
 * Applies a configured math operation to an incoming sensor value.
 */
function applyMathOperation(operation, value, param, key = 'default') {
  const v = Number(value);
  const p = Number(param) || 1;

  switch (operation) {
    case 'movingAverage':
    case 'sma':
      return calculateMovingAverage(key, v, p).sma;

    case 'ema':
      return calculateEMA(key, v, p);

    case 'multiply':
      return parseFloat((v * p).toFixed(3));

    case 'add':
      return parseFloat((v + p).toFixed(3));

    case 'subtract':
      return parseFloat((v - p).toFixed(3));

    case 'abs':
      return Math.abs(v);

    case 'round':
      return Math.round(v);

    case 'celsiusToF':
      return UNIT_CONVERSIONS.celsiusToFahrenheit(v);

    case 'barToPsi':
      return UNIT_CONVERSIONS.barToPsi(v);

    case 'lminToGpm':
      return UNIT_CONVERSIONS.lminToGpm(v);

    case 'rpmToHz':
      return UNIT_CONVERSIONS.rpmToHz(v);

    default:
      return v;
  }
}

function resetMathState() {
  windowBuffers.clear();
  emaState.clear();
}

module.exports = {
  calculateMovingAverage,
  calculateEMA,
  isNoiseOutlier,
  applyMathOperation,
  resetMathState,
  UNIT_CONVERSIONS,
};
