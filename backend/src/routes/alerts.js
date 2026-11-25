const express = require('express');
const router = express.Router();
const {
  getAlertHistory,
  getDispatchStats,
  dispatchAlert,
  clearAlertHistory,
} = require('../services/actionDispatcher');

// ═══════════════════════════════════════════════════════════════════════
// ALERT DISPATCH & AUDIT TRAIL API (Day 9 Milestone)
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// GET /api/alerts/history — Fetch recent triggered alert deliveries
// Query: ?limit=50&deviceId=TURB-001
// ─────────────────────────────────────────────────────────────────────
router.get('/history', (req, res) => {
  const { limit = 50, deviceId } = req.query;
  const alerts = getAlertHistory(limit, deviceId || null);
  res.json({
    count: alerts.length,
    alerts,
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/alerts/stats — Get delivery statistics by channel
// ─────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  res.json(getDispatchStats());
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/alerts/test-dispatch — Manually trigger an alert notification
// Body: { actionType, target, templateMessage, context }
// ─────────────────────────────────────────────────────────────────────
router.post('/test-dispatch', async (req, res) => {
  const { actionType = 'sms', target = '+919876543210', templateMessage, context = {} } = req.body;

  try {
    const record = await dispatchAlert({
      ruleName: 'Manual Dashboard Test Alert',
      actionType,
      target,
      templateMessage: templateMessage || 'CRITICAL: {{deviceId}} sensor {{sensorType}} at {{value}}!',
      context: {
        deviceId: context.deviceId || 'TURB-001',
        sensorType: context.sensorType || 'temperature',
        value: context.value || 92.5,
        threshold: context.threshold || 85.0,
      },
    });

    res.status(201).json({
      status: 'dispatched',
      record,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/alerts/clear — Clear in-memory history log
// ─────────────────────────────────────────────────────────────────────
router.post('/clear', (req, res) => {
  clearAlertHistory();
  res.json({ status: 'cleared', message: 'Alert history buffer reset' });
});

module.exports = router;
