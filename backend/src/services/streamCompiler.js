// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — RxJS Reactive Stream Compiler Engine (Day 6 Milestone)
// Translates serialized visual React Flow graphs into live executable
// RxJS Observable data pipelines that process continuous IoT streams.
// ═══════════════════════════════════════════════════════════════════════

const { Subject } = require('rxjs');
const { filter, map, tap } = require('rxjs/operators');
const { serializeAndValidateGraph } = require('./graphSerializer');

// Global event bus streaming all incoming raw telemetry points
const telemetryBus$ = new Subject();

// Registry of actively running compiled pipelines
// Key: graphId -> { subscription, manifest, name, stats: { evaluated, triggered } }
const activePipelines = new Map();

/**
 * Dispatches an incoming telemetry point into the reactive stream bus.
 */
function pushTelemetryToStream(telemetryPoint) {
  telemetryBus$.next(telemetryPoint);
}

/**
 * Evaluates threshold conditions.
 */
function evaluateThreshold(val, operator, threshold) {
  const v = Number(val);
  const t = Number(threshold);
  switch (operator) {
    case 'gt': return v > t;
    case 'gte': return v >= t;
    case 'lt': return v < t;
    case 'lte': return v <= t;
    case 'eq': return Math.abs(v - t) < 0.0001;
    case 'neq': return Math.abs(v - t) >= 0.0001;
    default: return v > t;
  }
}

/**
 * Compiles a React Flow JSON graph into an active RxJS Observable pipeline.
 */
function compileGraphToObservable(graph) {
  const validation = serializeAndValidateGraph(graph);
  if (!validation.valid) {
    throw new Error(`Cannot compile invalid graph: ${validation.errors.join('; ')}`);
  }

  const { nodes, edges } = graph;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Find root source nodes
  const rootSourceNodes = nodes.filter((n) => n.type === 'sensorSource');
  const targetDeviceIds = rootSourceNodes.map((n) => n.data?.deviceId?.toUpperCase()).filter(Boolean);
  const targetSensors = rootSourceNodes.map((n) => n.data?.sensorType?.toLowerCase()).filter(Boolean);

  // Pipeline runtime statistics
  const runtimeStats = {
    evaluatedCount: 0,
    triggeredCount: 0,
    lastEvaluatedAt: null,
    lastTriggeredAt: null,
    recentAlerts: [],
  };

  // Find math operations
  const mathNodes = nodes.filter((n) => n.type === 'mathOperation');
  // Find threshold checks
  const thresholdNodes = nodes.filter((n) => n.type === 'thresholdCheck');
  // Find alert action sinks
  const alertNodes = nodes.filter((n) => n.type === 'alertAction');

  // Build the RxJS pipeline starting from telemetryBus$
  let stream$ = telemetryBus$.pipe(
    // 1. Filter: Match targeted devices and sensors
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

    // 2. Map: Apply math operations
    map((point) => {
      let transformedValue = point.value;
      mathNodes.forEach((mn) => {
        const op = mn.data?.operation || 'movingAverage';
        const param = Number(mn.data?.param ?? 1);
        if (op === 'multiply') transformedValue *= param;
        if (op === 'add') transformedValue += param;
        if (op === 'abs') transformedValue = Math.abs(transformedValue);
        if (op === 'round') transformedValue = Math.round(transformedValue);
        if (op === 'celsiusToF') transformedValue = (transformedValue * 9) / 5 + 32;
      });
      return {
        ...point,
        originalValue: point.value,
        transformedValue: parseFloat(transformedValue.toFixed(2)),
      };
    }),

    // 3. Filter: Apply threshold logic checks
    filter((point) => {
      if (thresholdNodes.length === 0) return true;
      return thresholdNodes.every((tn) => {
        const op = tn.data?.operator || 'gt';
        const thresh = tn.data?.threshold ?? 80;
        return evaluateThreshold(point.transformedValue, op, thresh);
      });
    }),

    // 4. Tap: Trigger action handlers (SMS / Webhook / Log)
    tap((alertData) => {
      runtimeStats.triggeredCount++;
      runtimeStats.lastTriggeredAt = new Date().toISOString();

      const alertPayload = {
        ruleName: graph.name || 'Unnamed Rule',
        deviceId: alertData.deviceId,
        sensorType: alertData.sensorType,
        value: alertData.transformedValue,
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

/**
 * Activates and runs a graph as an ongoing RxJS subscription.
 */
function activateRulePipeline(graphId, graph) {
  // If already running, stop previous
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

/**
 * Stops an active running pipeline.
 */
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
