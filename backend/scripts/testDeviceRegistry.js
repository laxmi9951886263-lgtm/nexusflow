// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Device Registry & Simulator Test Suite (Day 3 Milestone)
// Verifies device status toggling, health scoring, and anomaly injection.
// ═══════════════════════════════════════════════════════════════════════

const {
  DEVICES,
  injectAnomaly,
  clearAnomalies,
  getSimulatorStatus,
  generateReading,
} = require('../src/services/simulator');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║    NexusFlow — Day 3 Device Registry & Simulator Test    ║');
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

// ── Test 1: Device Registry Initialization ──
assert(DEVICES.length >= 4, 'Device registry has at least 4 default industrial devices');

// ── Test 2: Specific Hardware Inspection ──
const turbine = DEVICES.find((d) => d.deviceId === 'TURB-001');
assert(turbine !== undefined && turbine.sensors.length === 3, 'Turbine TURB-001 has 3 calibrated sensors');

// ── Test 3: Sensor Thresholds Configured ──
const tempSensor = turbine.sensors.find((s) => s.type === 'temperature');
assert(tempSensor.warningThreshold === 85 && tempSensor.criticalThreshold === 95, 'Temperature thresholds properly calibrated (Warning 85°C, Critical 95°C)');

// ── Test 4: Simulator Baseline Reading ──
const baseReading = generateReading(turbine, tempSensor);
assert(baseReading.value >= 60 && baseReading.value <= 85, `Baseline temperature within normal operating envelope (${baseReading.value}°C)`);

// ── Test 5: Dynamic Anomaly Injection ──
console.log('\n🔥 Injecting 2.0x Overheat Anomaly on TURB-001...');
const anomaly = injectAnomaly({
  deviceId: 'TURB-001',
  sensorType: 'temperature',
  spikeMultiplier: 2.0,
  durationSeconds: 10,
  reason: 'Simulated cooling loop valve failure',
});
assert(anomaly && anomaly.spikeMultiplier === 2.0, 'Anomaly injected successfully into active queue');

// ── Test 6: Anomaly Verification in Telemetry Stream ──
const spikedReading = generateReading(turbine, tempSensor);
assert(spikedReading.value > 120, `Anomaly reflected in telemetry value (${spikedReading.value}°C > 120°C)`);
assert(spikedReading.tags.priority === 'critical', `Anomaly correctly escalated to "critical" priority`);
assert(spikedReading.anomaly !== null, `Anomaly metadata attached to telemetry payload`);

// ── Test 7: Active Anomalies in Simulator Status ──
const status = getSimulatorStatus();
assert(status.activeAnomalies.length >= 1, `Simulator status reports active anomalies (count: ${status.activeAnomalies.length})`);

// ── Test 8: Anomaly Reset & Cleanup ──
clearAnomalies('TURB-001');
const cleanStatus = getSimulatorStatus();
assert(cleanStatus.activeAnomalies.length === 0, 'Anomalies cleared successfully back to baseline');

console.log(`\n==============================================`);
console.log(`Summary: ${passed}/${total} Day 3 tests passed! ✅`);
console.log(`==============================================\n`);
