// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Math & Filter Operations Test Suite (Day 7 Milestone)
// Verifies Simple Moving Average (SMA), Exponential Smoothing (EMA),
// Outlier Rejection, and Unit Conversion accuracy.
// ═══════════════════════════════════════════════════════════════════════

const {
  calculateMovingAverage,
  calculateEMA,
  isNoiseOutlier,
  applyMathOperation,
  resetMathState,
  UNIT_CONVERSIONS,
} = require('../src/services/mathEngine');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║        NexusFlow — Day 7 Math & Filter Engine Test       ║');
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

resetMathState();

// ── Test 1: Simple Moving Average (SMA) Calculation ──
const seq = [10, 20, 30, 40, 50];
let finalSma = 0;
seq.forEach((val) => {
  finalSma = calculateMovingAverage('turb-temp', val, 5).sma;
});
assert(finalSma === 30, `SMA over [10,20,30,40,50] equals 30 (got ${finalSma})`);

// ── Test 2: SMA Sliding Window Roll (FIFO) ──
// Next value: 60 -> window should become [20, 30, 40, 50, 60] -> average = 40
const rolledSma = calculateMovingAverage('turb-temp', 60, 5).sma;
assert(rolledSma === 40, `SMA window rolls properly FIFO to 40 (got ${rolledSma})`);

// ── Test 3: Exponential Moving Average (EMA) ──
const ema1 = calculateEMA('pump-press', 50, 5);
const ema2 = calculateEMA('pump-press', 60, 5);
assert(ema2 > ema1 && ema2 < 60, `EMA smooths upward trend correctly (ema1: ${ema1}, ema2: ${ema2})`);

// ── Test 4: Noise / Outlier Rejection ──
// Window currently around 40 -> test if a sudden 150 reading is recognized as noise
const isGlitch = isNoiseOutlier('turb-temp', 150, 45);
assert(isGlitch === true, 'Outlier glitch (150 vs avg 40) successfully flagged as noise');

const isNormal = isNoiseOutlier('turb-temp', 45, 45);
assert(isNormal === false, 'Legitimate sensor value (45 vs avg 40) is not marked as noise');

// ── Test 5: Unit Conversion - Celsius to Fahrenheit ──
const fVal = UNIT_CONVERSIONS.celsiusToFahrenheit(100);
assert(fVal === 212, `100°C converts to 212°F (got ${fVal})`);

// ── Test 6: Unit Conversion - Fahrenheit to Celsius ──
const cVal = UNIT_CONVERSIONS.fahrenheitToCelsius(32);
assert(cVal === 0, `32°F converts to 0°C (got ${cVal})`);

// ── Test 7: Unit Conversion - Bar to PSI ──
const psiVal = UNIT_CONVERSIONS.barToPsi(10);
assert(Math.abs(psiVal - 145.04) < 0.1, `10 bar converts to ~145.04 PSI (got ${psiVal})`);

// ── Test 8: Unit Conversion - PSI to Bar ──
const barVal = UNIT_CONVERSIONS.psiToBar(145.038);
assert(Math.abs(barVal - 10.0) < 0.1, `145.038 PSI converts to 10.0 bar (got ${barVal})`);

// ── Test 9: Unit Conversion - Flow Rate (L/min to GPM) ──
const gpmVal = UNIT_CONVERSIONS.lminToGpm(100);
assert(gpmVal === 26.42, `100 L/min converts to 26.42 GPM (got ${gpmVal})`);

// ── Test 10: Unit Conversion - RPM to Hz ──
const hzVal = UNIT_CONVERSIONS.rpmToHz(3600);
assert(hzVal === 60, `3600 RPM converts to 60 Hz (got ${hzVal})`);

// ── Test 11: applyMathOperation Dispatches Correctly ──
const opResult = applyMathOperation('multiply', 45, 2);
assert(opResult === 90, `applyMathOperation('multiply', 45, 2) returns 90 (got ${opResult})`);

// ── Test 12: applyMathOperation SMA In-Stream ──
resetMathState();
applyMathOperation('movingAverage', 10, 3, 'test-key');
applyMathOperation('movingAverage', 20, 3, 'test-key');
const resAvg = applyMathOperation('movingAverage', 30, 3, 'test-key');
assert(resAvg === 20, `applyMathOperation SMA returns 20 over [10,20,30] (got ${resAvg})`);

console.log(`\n==============================================`);
console.log(`Summary: ${passed}/${total} Day 7 tests passed! ✅`);
console.log(`==============================================\n`);
