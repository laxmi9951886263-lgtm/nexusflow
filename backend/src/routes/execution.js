const express = require('express');
const router = express.Router();
const FlowGraph = require('../models/FlowGraph');
const {
  activateRulePipeline,
  stopRulePipeline,
  getActivePipelines,
  pushTelemetryToStream,
} = require('../services/streamCompiler');

// ═══════════════════════════════════════════════════════════════════════
// LIVE RULE EXECUTION & COMPILER RUNTIME CONTROLLER (Day 6 Milestone)
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// GET /api/execution/active — List all actively executing pipelines
// ─────────────────────────────────────────────────────────────────────
router.get('/active', (req, res) => {
  res.json({
    activeCount: getActivePipelines().length,
    pipelines: getActivePipelines(),
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/execution/compile/:graphId — Compile & activate graph
// ─────────────────────────────────────────────────────────────────────
router.post('/compile/:graphId', async (req, res) => {
  const { graphId } = req.params;
  let graph = null;

  try {
    graph = await FlowGraph.findById(graphId).lean();
  } catch (err) {}

  // Fallback to request body if sent directly
  if (!graph && req.body?.nodes && req.body?.edges) {
    graph = req.body;
  }

  if (!graph) {
    return res.status(404).json({ error: `Graph with ID "${graphId}" not found` });
  }

  try {
    const activeEntry = activateRulePipeline(graphId, graph);
    res.json({
      status: 'active',
      graphId,
      name: activeEntry.name,
      startedAt: activeEntry.startedAt,
      manifest: activeEntry.manifest,
      message: 'Visual graph successfully compiled to RxJS Observables and is now processing live telemetry',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/execution/stop/:graphId — Stop a running pipeline
// ─────────────────────────────────────────────────────────────────────
router.post('/stop/:graphId', (req, res) => {
  const { graphId } = req.params;
  const stopped = stopRulePipeline(graphId);
  if (stopped) {
    res.json({ status: 'stopped', graphId });
  } else {
    res.status(404).json({ error: `Pipeline "${graphId}" is not currently running` });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/execution/test-event — Dispatch manual test telemetry
// Body: { deviceId, sensorType, value }
// ─────────────────────────────────────────────────────────────────────
router.post('/test-event', (req, res) => {
  const { deviceId = 'TURB-001', sensorType = 'temperature', value = 90.0 } = req.body;
  const point = {
    deviceId: String(deviceId).toUpperCase(),
    sensorType: String(sensorType).toLowerCase(),
    value: Number(value),
    timestamp: new Date(),
  };

  pushTelemetryToStream(point);

  res.json({
    status: 'dispatched',
    event: point,
    activePipelinesEvaluating: getActivePipelines().length,
  });
});

module.exports = router;
