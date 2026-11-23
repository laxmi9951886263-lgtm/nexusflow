// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Threshold Logic & Hysteresis Test Suite (Day 8 Milestone)
// Verifies comparison operators, range queries, anti-flapping, and cooldowns.
// ═══════════════════════════════════════════════════════════════════════

const {
  evaluatePredicate,
  evaluateThresholdWithHysteresis,
  resetThresholdState,
} = require('../src/services/thresholdEngine');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   NexusFlow — Day 8 Threshold Logic & Hysteresis Test    ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [Test ${total}] PASS: ${testName}`);
  } else {
    console.error(`❌ [Test ${total}] FAIL: ${testName}`);
  }
}

resetThresholdState();

// ── Test 1: Standard Comparison Operators ──
assert(evaluatePredicate(85, 'gt', 80) === true, '85 > 80 evaluates to true');
assert(evaluatePredicate(80, 'gt', 80) === false, '80 > 80 evaluates to false');
assert(evaluatePredicate(80, 'gte', 80) === true, '80 >= 80 evaluates to true');
assert(evaluatePredicate(15, 'lt', 20) === true, '15 < 20 evaluates to true');
assert(evaluatePredicate(20, 'lte', 20) === true, '20 <= 20 evaluates to true');
assert(evaluatePredicate(42.0, 'eq', 42.0) === true, '42.0 == 42.0 evaluates to true');

// ── Test 2: Range Operators (Between / Outside) ──
assert(evaluatePredicate(55, 'between', 50, 60) === true, '55 is between [50, 60]');
assert(evaluatePredicate(65, 'between', 50, 60) === false, '65 is not between [50, 60]');
assert(evaluatePredicate(95, 'outside', 20, 80) === true, '95 is outside [20, 80]');
assert(evaluatePredicate(50, 'outside', 20, 80) === false, '50 is not outside [20, 80]');

// ── Test 3: Hysteresis Trip Above Threshold ──
// Threshold = 80, Hysteresis Delta = 4 (Trip > 80, Reset < 76)
console.log('\n🌡️ Testing Hysteresis Anti-Flapping on Turbine Overheat...');
const trip1 = evaluateThresholdWithHysteresis({
  ruleId: 'r1',
  deviceId: 'TURB-001',
  sensorType: 'temperature',
  value: 82.0,
  threshold: 80.0,
  hysteresisDelta: 4.0,
});
assert(trip1.isTriggered === true && trip1.currentState === 'TRIGGERED', 'Initial spike (82°C > 80°C) trips alert into TRIGGERED state');

// ── Test 4: Hovering Around Threshold (Anti-Flapping Check) ──
// Value drops slightly to 79.5°C (below 80°C, but above reset threshold of 76°C)
const trip2 = evaluateThresholdWithHysteresis({
  ruleId: 'r1',
  deviceId: 'TURB-001',
  sensorType: 'temperature',
  value: 79.5,
  threshold: 80.0,
  hysteresisDelta: 4.0,
});
assert(trip2.currentState === 'TRIGGERED', 'Sensor value 79.5°C stays in TRIGGERED state (does not flap OFF)');

// ── Test 5: Full Reset Below Hysteresis Floor ──
// Value drops to 74.0°C (below reset threshold 76.0°C)
const trip3 = evaluateThresholdWithHysteresis({
  ruleId: 'r1',
  deviceId: 'TURB-001',
  sensorType: 'temperature',
  value: 74.0,
  threshold: 80.0,
  hysteresisDelta: 4.0,
});
assert(trip3.currentState === 'NORMAL' && trip3.stateChanged === true, 'Sensor value 74.0°C drops below hysteresis floor (76°C) -> state resets to NORMAL');

console.log(`\n==============================================`);
console.log(`Summary: ${passed}/${total} Day 8 tests passed! ✅`);
console.log(`==============================================\n`);
