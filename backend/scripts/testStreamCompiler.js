// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — RxJS Stream Compiler Test Suite (Day 6 Milestone)
// Verifies graph-to-observable compilation, filtering, and real-time alerts.
// ═══════════════════════════════════════════════════════════════════════

const {
  compileGraphToObservable,
  activateRulePipeline,
  stopRulePipeline,
  pushTelemetryToStream,
  getActivePipelines,
} = require('../src/services/streamCompiler');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║        NexusFlow — Day 6 RxJS Stream Compiler Test       ║');
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

// Sample Rule: If TURB-001 temperature * 1.0 > 80.0 °C, trigger SMS Alert
const testGraph = {
  name: 'Turbine Temperature Overheat Rule',
  nodes: [
    { id: 's1', type: 'sensorSource', data: { deviceId: 'TURB-001', sensorType: 'temperature' } },
    { id: 'm1', type: 'mathOperation', data: { operation: 'multiply', param: 1.0 } },
    { id: 't1', type: 'thresholdCheck', data: { operator: 'gt', threshold: 80.0 } },
    { id: 'a1', type: 'alertAction', data: { actionType: 'sms', target: '+919876543210' } },
  ],
  edges: [
    { id: 'e1', source: 's1', target: 'm1' },
    { id: 'e2', source: 'm1', target: 't1' },
    { id: 'e3', source: 't1', target: 'a1' },
  ],
};

// ── Test 1: Observable Compilation ──
const compiled = compileGraphToObservable(testGraph);
assert(compiled && compiled.stream$ !== undefined, 'Visual graph successfully compiled to RxJS Observable stream');
assert(compiled.manifest.pipelineDepth === 4, 'Pipeline manifest depth matches node count (4)');

// ── Test 2: Active Pipeline Registration ──
const pipelineId = 'test-pipe-001';
const activeEntry = activateRulePipeline(pipelineId, testGraph);
assert(activeEntry.graphId === pipelineId, 'Pipeline registered in active execution map');
assert(getActivePipelines().length >= 1, 'Active pipelines counter reflects running pipeline');

// ── Test 3: Normal Telemetry Event (Below Threshold -> No Alert) ──
console.log('\n📊 Feeding normal reading (72°C, threshold: 80°C)...');
pushTelemetryToStream({
  deviceId: 'TURB-001',
  sensorType: 'temperature',
  value: 72.0,
  timestamp: new Date(),
});

assert(activeEntry.runtimeStats.evaluatedCount === 1, 'Telemetry point was evaluated by reactive pipeline');
assert(activeEntry.runtimeStats.triggeredCount === 0, 'No alert triggered for reading below threshold (72°C <= 80°C)');

// ── Test 4: Mismatched Device Filter (Ignored) ──
pushTelemetryToStream({
  deviceId: 'PUMP-002',
  sensorType: 'temperature',
  value: 95.0,
  timestamp: new Date(),
});
assert(activeEntry.runtimeStats.triggeredCount === 0, 'Telemetry from unlinked device PUMP-002 safely ignored');

// ── Test 5: Overheat Telemetry Event (Above Threshold -> Alert Triggered) ──
console.log('\n🚨 Feeding overheat reading (88.5°C, threshold: 80°C)...');
pushTelemetryToStream({
  deviceId: 'TURB-001',
  sensorType: 'temperature',
  value: 88.5,
  timestamp: new Date(),
});

assert(activeEntry.runtimeStats.triggeredCount === 1, 'Alert triggered for reading exceeding threshold (88.5°C > 80°C)');
assert(activeEntry.runtimeStats.recentAlerts.length === 1, 'Alert payload logged in recentAlerts history');
assert(activeEntry.runtimeStats.recentAlerts[0].actionsDispatched[0].type === 'sms', 'SMS action target verified in dispatched payload');

// ── Test 6: Pipeline Unsubscription / Teardown ──
const stopped = stopRulePipeline(pipelineId);
assert(stopped === true, 'Pipeline successfully unsubscribed and stopped');

pushTelemetryToStream({
  deviceId: 'TURB-001',
  sensorType: 'temperature',
  value: 99.0,
  timestamp: new Date(),
});
assert(activeEntry.runtimeStats.triggeredCount === 1, 'No new evaluations after pipeline stopped');

console.log(`\n==============================================`);
console.log(`Summary: ${passed}/${total} Day 6 tests passed! ✅`);
console.log(`==============================================\n`);
