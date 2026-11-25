// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Action Dispatcher Test Suite (Day 9 Milestone)
// Verifies multi-channel notifications (SMS, Webhook, Email),
// template variable interpolation, delivery logging, and stats.
// ═══════════════════════════════════════════════════════════════════════

const {
  dispatchAlert,
  dispatchWithRetry,
  interpolateTemplate,
  getAlertHistory,
  getDispatchStats,
  clearAlertHistory,
} = require('../src/services/actionDispatcher');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║        NexusFlow — Day 9 Action Dispatcher Test          ║');
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

clearAlertHistory();

// ── Test 1: Template Variable Interpolation ──
const tpl = 'ALERT: {{deviceId}} {{sensorType}} reached {{value}}°C (limit: {{threshold}}°C)';
const ctx = { deviceId: 'TURB-001', sensorType: 'temperature', value: 89.2, threshold: 85.0 };
const interpolated = interpolateTemplate(tpl, ctx);
assert(
  interpolated === 'ALERT: TURB-001 temperature reached 89.2°C (limit: 85°C)',
  'Template interpolation correctly substitutes all dynamic variables'
);

// ── Test 2: SMS Action Dispatch ──
console.log('\n📱 Testing SMS Action Dispatch...');
dispatchAlert({
  ruleName: 'Turbine Overheat Protection',
  actionType: 'sms',
  target: '+91 98765 43210',
  templateMessage: 'CRITICAL: {{deviceId}} temp is {{value}}°C',
  context: { deviceId: 'TURB-001', value: 92.4 },
}).then((smsRecord) => {
  assert(smsRecord.status === 'DELIVERED', 'SMS alert status marked as DELIVERED');
  assert(smsRecord.details.channel === 'SMS_GATEWAY', 'SMS routed through SMS_GATEWAY adapter');
  assert(smsRecord.message.includes('TURB-001 temp is 92.4°C'), 'SMS message text properly formatted');

  // ── Test 3: Webhook Action Dispatch ──
  console.log('\n🌐 Testing Webhook Action Dispatch...');
  return dispatchAlert({
    ruleName: 'Coolant Pump Trip Wire',
    actionType: 'webhook',
    target: 'https://safety.factory.internal/webhook',
    templateMessage: 'PUMP TRIP: {{deviceId}} flow rate drop',
    context: { deviceId: 'PUMP-002', sensorType: 'flow_rate', value: 12.0 },
  });
}).then((webhookRecord) => {
  assert(webhookRecord.details.channel === 'WEBHOOK_POST', 'Webhook routed through WEBHOOK_POST adapter');
  assert(webhookRecord.details.payload.event === 'THRESHOLD_BREACH', 'Webhook payload contains structured event schema');

  // ── Test 4: Email Action Dispatch ──
  console.log('\n✉️ Testing Email Action Dispatch...');
  return dispatchAlert({
    ruleName: 'Boiler Pressure High',
    actionType: 'email',
    target: 'safety-officer@factory.org',
    templateMessage: 'Boiler {{deviceId}} pressure critical: {{value}} bar',
    context: { deviceId: 'BOIL-004', value: 18.2 },
  });
}).then((emailRecord) => {
  assert(emailRecord.details.channel === 'SMTP_MAILER', 'Email routed through SMTP_MAILER adapter');
  assert(emailRecord.details.subject.includes('Boiler Pressure High'), 'Email subject matches rule name');

  // ── Test 5: Audit Trail & History Log ──
  const history = getAlertHistory(10);
  assert(history.length === 3, `Alert history log records all 3 dispatches (count: ${history.length})`);
  assert(history[0].actionType === 'email', 'Most recent alert appears first (LIFO order)');

  // ── Test 6: Device Filter on History ──
  const turbAlerts = getAlertHistory(10, 'TURB-001');
  assert(turbAlerts.length === 1 && turbAlerts[0].context.deviceId === 'TURB-001', 'Alert history successfully filtered by deviceId TURB-001');

  // ── Test 7: Dispatch Statistics Monitor ──
  const stats = getDispatchStats();
  assert(stats.totalDispatched === 3, 'Stats track totalDispatched count (3)');
  assert(stats.smsCount === 1 && stats.webhookCount === 1 && stats.emailCount === 1, 'Stats track per-channel distribution');

  // ── Test 8: Dispatch With Retry Handler ──
  return dispatchWithRetry({
    ruleName: 'Retry Verification Rule',
    actionType: 'console',
    templateMessage: 'Audit log verification',
    context: { deviceId: 'COMP-003' },
  }, 2);
}).then((retryRecord) => {
  assert(retryRecord.status === 'DELIVERED', 'dispatchWithRetry completes successfully');

  console.log(`\n==============================================`);
  console.log(`Summary: ${passed}/${total} Day 9 tests passed! ✅`);
  console.log(`==============================================\n`);
}).catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
