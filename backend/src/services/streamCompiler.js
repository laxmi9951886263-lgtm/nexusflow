// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — RxJS Reactive Stream Compiler Engine (Day 8 Hysteresis-Enabled)
// Translates serialized visual React Flow graphs into live executable
// RxJS Observable data pipelines with hysteresis anti-flapping gates.
// ═══════════════════════════════════════════════════════════════════════

const { Subject } = require('rxjs');
const { filter, map, tap } = require('rxjs/operators');
const { serializeAndValidateGraph } = require('./graphSerializer');
const { applyMathOperation } = require('./mathEngine');
const { evaluateThresholdWithHysteresis } = require('./thresholdEngine');

const telemetryBus$ = new Subject();
const activePipelines = new Map();

function pushTelemetryToStream(telemetryPoint) {
  telemetryBus$.next(telemetryPoint);
}

function compileGraphToObservable(graph) {
  const validation = serializeAndValidateGraph(graph);
  if (!validation.valid) {
    throw new Error(`Cannot compile invalid graph: ${validation.errors.join('; ')}`);
  }

  const { nodes, edges } = graph;
  const graphId = graph.id || graph._id || 'compiled-pipeline';

  const rootSourceNodes = nodes.filter((n) => n.type === 'sensorSource');
  const targetDeviceIds = rootSourceNodes.map((n) => n.data?.deviceId?.toUpperCase()).filter(Boolean);
  const targetSensors = rootSourceNodes.map((n) => n.data?.sensorType?.toLowerCase()).filter(Boolean);

  const runtimeStats = {
    evaluatedCount: 0,
    triggeredCount: 0,
    lastEvaluatedAt: null,
    lastTriggeredAt: null,
    recentAlerts: [],
  };

  const mathNodes = nodes.filter((n) => n.type === 'mathOperation');
  const thresholdNodes = nodes.filter((n) => n.type === 'thresholdCheck');
  const alertNodes = nodes.filter((n) => n.type === 'alertAction');

  let stream$ = telemetryBus$.pipe(
    // 1. Filter: Match targeted devices & sensors
    filter((point) => {
      runtimeStats.evaluatedCount++;
      runtimeStats.lastEvaluatedAt = new Date().toISOString();

      if (targetDeviceIds.length > 0 && !targetDeviceIds.includes(point.deviceId?.toUpperCase())) {
        return false;
      }
      if (targetSensors.length > 0 && !targetSensors.includes(point.sensorType?.toLowerCase())) {
        return false;
      }
      return true;
    }),

    // 2. Map: Apply math transformations (SMA, EMA, conversions)
    map((point) => {
      let transformedValue = point.value;
      const bufferKey = `${point.deviceId}:${point.sensorType}`;

      mathNodes.forEach((mn) => {
        const op = mn.data?.operation || 'movingAverage';
        const param = mn.data?.param ?? 5;
        transformedValue = applyMathOperation(op, transformedValue, param, `${bufferKey}:${mn.id}`);
      });

      return {
        ...point,
        originalValue: point.value,
        transformedValue: parseFloat(Number(transformedValue).toFixed(2)),
      };
    }),

    // 3. Filter: Apply stateful threshold check with hysteresis anti-flapping
    filter((point) => {
      if (thresholdNodes.length === 0) return true;

      return thresholdNodes.every((tn) => {
        const op = tn.data?.operator || 'gt';
        const thresh = tn.data?.threshold ?? 80;
        const delta = tn.data?.hysteresisDelta ?? 3.0;

        const evalResult = evaluateThresholdWithHysteresis({
          ruleId: `${graphId}:${tn.id}`,
          deviceId: point.deviceId,
          sensorType: point.sensorType,
          value: point.transformedValue,
          operator: op,
          threshold: thresh,
          hysteresisDelta: delta,
          cooldownSeconds: 5,
        });

        return evalResult.isTriggered;
      });
    }),

    // 4. Tap: Trigger action sinks (SMS / Webhook / Log)
    tap((alertData) => {
      runtimeStats.triggeredCount++;
      runtimeStats.lastTriggeredAt = new Date().toISOString();

      const alertPayload = {
        ruleName: graph.name || 'Unnamed Rule',
        deviceId: alertData.deviceId,
        sensorType: alertData.sensorType,
        value: alertData.transformedValue,
        originalValue: alertData.originalValue,
        triggeredAt: runtimeStats.lastTriggeredAt,
        actionsDispatched: alertNodes.map((an) => ({
          type: an.data?.actionType || 'sms',
          target: an.data?.target || 'Default Target',
          message: an.data?.message || `Alert: ${alertData.deviceId} threshold breached!`,
        })),
      };

      runtimeStats.recentAlerts.unshift(alertPayload);
      if (runtimeStats.recentAlerts.length > 10) {
        runtimeStats.recentAlerts.pop();
      }

      console.log(`[RxJS Engine] 🚨 RULE TRIGGERED: ${alertPayload.ruleName} -> ${alertData.deviceId} value=${alertData.transformedValue}`);
    })
  );

  return { stream$, runtimeStats, manifest: validation.manifest };
}

function activateRulePipeline(graphId, graph) {
  stopRulePipeline(graphId);

  const { stream$, runtimeStats, manifest } = compileGraphToObservable(graph);
  const subscription = stream$.subscribe({
    error: (err) => console.error(`[RxJS Engine] Pipeline ${graphId} error:`, err),
  });

  const entry = {
    graphId,
    name: graph.name || 'NexusFlow Rule',
    subscription,
    runtimeStats,
    manifest,
    startedAt: new Date().toISOString(),
  };

  activePipelines.set(String(graphId), entry);
  console.log(`[RxJS Engine] ▶️ Pipeline compiled and running: "${entry.name}" (ID: ${graphId})`);
  return entry;
}

function stopRulePipeline(graphId) {
  const id = String(graphId);
  const entry = activePipelines.get(id);
  if (entry) {
    entry.subscription.unsubscribe();
    activePipelines.delete(id);
    console.log(`[RxJS Engine] ⏹️ Pipeline stopped: "${entry.name}" (ID: ${id})`);
    return true;
  }
  return false;
}

function getActivePipelines() {
  const list = [];
  activePipelines.forEach((val, key) => {
    list.push({
      graphId: key,
      name: val.name,
      startedAt: val.startedAt,
      stats: val.runtimeStats,
      manifest: val.manifest,
    });
  });
  return list;
}

module.exports = {
  telemetryBus$,
  pushTelemetryToStream,
  compileGraphToObservable,
  activateRulePipeline,
  stopRulePipeline,
  getActivePipelines,
};
