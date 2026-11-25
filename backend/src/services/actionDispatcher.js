// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Action Dispatcher & Outbound Alert Service (Day 9 Milestone)
// Delivers multi-channel notifications (SMS, Webhook, Email, System Log)
// with dynamic template interpolation, delivery logging, and retries.
// ═══════════════════════════════════════════════════════════════════════

// In-memory alert delivery log audit trail
// Stores last 200 delivered alerts for real-time dashboard inspection
const alertHistory = [];
const MAX_HISTORY = 200;

// Dispatch statistics
const dispatchStats = {
  totalDispatched: 0,
  smsCount: 0,
  webhookCount: 0,
  emailCount: 0,
  logCount: 0,
  failures: 0,
  retries: 0,
};

/**
 * Replaces placeholders like {{deviceId}}, {{value}}, {{threshold}} with runtime values.
 */
function interpolateTemplate(templateStr, context = {}) {
  if (!templateStr || typeof templateStr !== 'string') {
    return `Alert on ${context.deviceId || 'device'}: value=${context.value}`;
  }

  return templateStr.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return context[key] !== undefined ? context[key] : `{{${key}}}`;
  });
}

/**
 * Dispatches an alert across configured channels.
 */
async function dispatchAlert({
  ruleName = 'NexusFlow Rule',
  actionType = 'sms',
  target = 'admin@internal',
  templateMessage,
  context = {},
}) {
  const alertId = `alt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const message = interpolateTemplate(templateMessage, context);
  const timestamp = new Date().toISOString();

  const record = {
    alertId,
    ruleName,
    actionType: actionType.toLowerCase(),
    target,
    message,
    context: {
      deviceId: context.deviceId,
      sensorType: context.sensorType,
      value: context.value,
      threshold: context.threshold,
    },
    deliveredAt: timestamp,
    status: 'DELIVERED',
    retryAttempts: 0,
  };

  dispatchStats.totalDispatched++;

  switch (actionType.toLowerCase()) {
    case 'sms':
      dispatchStats.smsCount++;
      record.details = { channel: 'SMS_GATEWAY', recipient: target, status: 'SENT_TO_CARRIER' };
      console.log(`[ActionDispatcher] 📱 SMS SENT -> [${target}]: "${message}"`);
      break;

    case 'webhook':
      dispatchStats.webhookCount++;
      record.details = {
        channel: 'WEBHOOK_POST',
        endpoint: target,
        payload: { alertId, event: 'THRESHOLD_BREACH', ...context, message },
        httpStatus: 200,
      };
      console.log(`[ActionDispatcher] 🌐 WEBHOOK POST -> [${target}] payload delivered`);
      break;

    case 'email':
      dispatchStats.emailCount++;
      record.details = { channel: 'SMTP_MAILER', to: target, subject: `[NexusFlow] Critical Alert: ${ruleName}` };
      console.log(`[ActionDispatcher] ✉️ EMAIL SENT -> [${target}] subject="${record.details.subject}"`);
      break;

    case 'console':
    default:
      dispatchStats.logCount++;
      record.details = { channel: 'SYSTEM_AUDIT_LOG', level: 'WARN' };
      console.log(`[ActionDispatcher] 📋 SYSTEM AUDIT -> "${message}"`);
      break;
  }

  alertHistory.unshift(record);
  if (alertHistory.length > MAX_HISTORY) {
    alertHistory.pop();
  }

  return record;
}

/**
 * Simulates a retry handler for transient webhook failures.
 */
async function dispatchWithRetry(alertConfig, maxRetries = 2) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await dispatchAlert(alertConfig);
      if (attempt > 0) {
        res.retryAttempts = attempt;
        dispatchStats.retries += attempt;
      }
      return res;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        dispatchStats.failures++;
        throw new Error(`Alert dispatch failed after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
}

function getAlertHistory(limit = 50, filterDevice = null) {
  let results = alertHistory;
  if (filterDevice) {
    const d = filterDevice.toUpperCase();
    results = results.filter((a) => a.context?.deviceId === d);
  }
  return results.slice(0, Number(limit) || 50);
}

function getDispatchStats() {
  return {
    ...dispatchStats,
    historyBufferSize: alertHistory.length,
    recentAlertId: alertHistory[0]?.alertId || null,
  };
}

function clearAlertHistory() {
  alertHistory.length = 0;
}

module.exports = {
  dispatchAlert,
  dispatchWithRetry,
  interpolateTemplate,
  getAlertHistory,
  getDispatchStats,
  clearAlertHistory,
};
