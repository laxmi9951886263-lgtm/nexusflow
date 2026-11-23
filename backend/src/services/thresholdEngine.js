// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Advanced Threshold Logic & Hysteresis Engine (Day 8 Milestone)
// Evaluates complex condition predicates and enforces hysteresis anti-flapping
// and alert cooldown limits to prevent operator alert fatigue.
// ═══════════════════════════════════════════════════════════════════════

// Stateful hysteresis and cooldown tracking per rule+device
// Key: "ruleId:deviceId:sensorType" -> { state: 'TRIGGERED' | 'NORMAL', lastAlertTime: number, alertCount: number }
const ruleStates = new Map();

/**
 * Evaluates standard and range comparison operators.
 */
function evaluatePredicate(value, operator, threshold, upperThreshold = null) {
  const v = Number(value);
  const t = Number(threshold);
  const u = upperThreshold !== null ? Number(upperThreshold) : null;

  switch (operator) {
    case 'gt':      return v > t;
    case 'gte':     return v >= t;
    case 'lt':      return v < t;
    case 'lte':     return v <= t;
    case 'eq':      return Math.abs(v - t) < 0.0001;
    case 'neq':     return Math.abs(v - t) >= 0.0001;
    case 'between': return u !== null ? (v >= t && v <= u) : v >= t;
    case 'outside': return u !== null ? (v < t || v > u) : v < t;
    default:        return v > t;
  }
}

/**
 * Stateful Threshold Evaluator with Hysteresis & Alert Cooldown.
 * 
 * Hysteresis concept:
 * - Upper threshold (Trigger): e.g. 80°C
 * - Reset threshold (Clear): e.g. 76°C (hysteresis gap = 4°C)
 * - Once triggered, the alert stays ACTIVE until the temperature drops
 *   below 76°C, preventing rapid ON/OFF oscillation.
 */
function evaluateThresholdWithHysteresis({
  ruleId = 'default-rule',
  deviceId,
  sensorType,
  value,
  operator = 'gt',
  threshold = 80,
  upperThreshold = null,
  hysteresisDelta = 3.0,
  cooldownSeconds = 5,
}) {
  const key = `${ruleId}:${deviceId}:${sensorType}`;
  const now = Date.now();
  const v = Number(value);
  const t = Number(threshold);

  if (!ruleStates.has(key)) {
    ruleStates.set(key, {
      state: 'NORMAL',
      lastAlertTime: 0,
      alertCount: 0,
    });
  }

  const record = ruleStates.get(key);
  let shouldTriggerAlert = false;
  let stateChanged = false;

  if (operator === 'gt' || operator === 'gte') {
    const tripThreshold = t;
    const resetThreshold = t - Math.abs(Number(hysteresisDelta) || 3.0);

    if (record.state === 'NORMAL') {
      if (v > tripThreshold) {
        record.state = 'TRIGGERED';
        stateChanged = true;
        shouldTriggerAlert = true;
      }
    } else {
      // In TRIGGERED state -> only reset if value falls below reset threshold
      if (v < resetThreshold) {
        record.state = 'NORMAL';
        stateChanged = true;
      } else {
        // Still in trip zone -> check cooldown timer for repeated alerts
        const elapsed = (now - record.lastAlertTime) / 1000;
        if (elapsed >= cooldownSeconds) {
          shouldTriggerAlert = true;
        }
      }
    }
  } else if (operator === 'lt' || operator === 'lte') {
    const tripThreshold = t;
    const resetThreshold = t + Math.abs(Number(hysteresisDelta) || 3.0);

    if (record.state === 'NORMAL') {
      if (v < tripThreshold) {
        record.state = 'TRIGGERED';
        stateChanged = true;
        shouldTriggerAlert = true;
      }
    } else {
      if (v > resetThreshold) {
        record.state = 'NORMAL';
        stateChanged = true;
      } else {
        const elapsed = (now - record.lastAlertTime) / 1000;
        if (elapsed >= cooldownSeconds) {
          shouldTriggerAlert = true;
        }
      }
    }
  } else {
    // For other operators, evaluate standard predicate
    const isPassing = evaluatePredicate(v, operator, t, upperThreshold);
    if (isPassing) {
      const elapsed = (now - record.lastAlertTime) / 1000;
      if (elapsed >= cooldownSeconds || record.state === 'NORMAL') {
        shouldTriggerAlert = true;
      }
      record.state = 'TRIGGERED';
    } else {
      record.state = 'NORMAL';
    }
  }

  if (shouldTriggerAlert) {
    record.lastAlertTime = now;
    record.alertCount++;
  }

  return {
    isTriggered: shouldTriggerAlert,
    currentState: record.state,
    stateChanged,
    alertCount: record.alertCount,
    value: v,
    threshold: t,
  };
}

function resetThresholdState() {
  ruleStates.clear();
}

function getRuleStates() {
  return Array.from(ruleStates.entries()).map(([key, val]) => ({ key, ...val }));
}

module.exports = {
  evaluatePredicate,
  evaluateThresholdWithHysteresis,
  resetThresholdState,
  getRuleStates,
};
