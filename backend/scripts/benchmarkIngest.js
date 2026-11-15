// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Ingestion & Validation Benchmark Script (Day 2 Milestone)
// Verifies throughput and error-free ingestion against validation rules.
// ═══════════════════════════════════════════════════════════════════════

const { validateTelemetryPayload } = require('../src/middleware/validator');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║        NexusFlow — Day 2 Validation Benchmark            ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const testCases = [
  {
    name: 'Valid Turbine Temperature Reading',
    payload: { deviceId: 'TURB-001', sensorType: 'temperature', value: 82.4, unit: '°C' },
    expectedValid: true,
  },
  {
    name: 'Valid Pump Pressure Reading',
    payload: { deviceId: 'PUMP-002', sensorType: 'pressure', value: 48.2, unit: 'PSI' },
    expectedValid: true,
  },
  {
    name: 'Invalid Sensor Type Rejection',
    payload: { deviceId: 'TURB-001', sensorType: 'radiation_hazard', value: 50 },
    expectedValid: false,
  },
  {
    name: 'Out-of-Bounds Value Rejection (Temperature > 1500°C)',
    payload: { deviceId: 'TURB-001', sensorType: 'temperature', value: 9999 },
    expectedValid: false,
  },
  {
    name: 'Missing DeviceId Rejection',
    payload: { sensorType: 'vibration', value: 3.2 },
    expectedValid: false,
  },
  {
    name: 'NaN Value Rejection',
    payload: { deviceId: 'COMP-003', sensorType: 'rpm', value: 'invalid_number' },
    expectedValid: false,
  },
];

let passedTests = 0;

testCases.forEach((tc, idx) => {
  const result = validateTelemetryPayload(tc.payload);
  const success = result.valid === tc.expectedValid;
  if (success) {
    passedTests++;
    console.log(`✅ [Test ${idx + 1}] PASS: ${tc.name}`);
  } else {
    console.error(`❌ [Test ${idx + 1}] FAIL: ${tc.name} (Result: ${result.valid}, Expected: ${tc.expectedValid})`);
  }
});

console.log(`\nValidation Suite: ${passedTests}/${testCases.length} tests passed.\n`);

// Throughput simulation
console.log('⚡ Running Ingestion Throughput Test (10,000 synthetic records)...');
const startTime = Date.now();
const recordsCount = 10000;

for (let i = 0; i < recordsCount; i++) {
  validateTelemetryPayload({
    deviceId: `DEV-${i % 20}`,
    sensorType: 'temperature',
    value: 70 + (i % 30),
    unit: '°C',
    tags: { zone: 'Plant-A' },
  });
}

const durationMs = Date.now() - startTime;
const throughputPerSec = Math.round((recordsCount / (durationMs || 1)) * 1000);

console.log(`⏱️ Processed ${recordsCount.toLocaleString()} validations in ${durationMs}ms`);
console.log(`🚀 Validation Throughput: ${throughputPerSec.toLocaleString()} ops/second`);
console.log('\nDay 2 Verification Complete! ✅');

