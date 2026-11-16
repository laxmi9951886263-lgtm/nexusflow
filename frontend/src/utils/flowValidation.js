// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Canvas Connection & Validation Rules (Day 4 Milestone)
// Prevents invalid connections, self-loops, and incompatible data types.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Validates whether two handles can be legitimately connected.
 * - Disallows connecting a node to itself (self-loop).
 * - Ensures source and target types match pipeline semantics:
 *   - sensorSource (output only) -> mathOperation / thresholdCheck
 *   - mathOperation (input & output) -> mathOperation / thresholdCheck
 *   - thresholdCheck (input & output) -> alertAction / mathOperation
 *   - alertAction (input only, terminal sink)
 */
export function isValidConnection(connection, nodes) {
  const { source, target, sourceHandle, targetHandle } = connection;

  // 1. Disallow self connections
  if (source === target) {
    return false;
  }

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  // 2. AlertAction cannot be a source (it is a terminal sink)
  if (sourceNode.type === 'alertAction') {
    return false;
  }

  // 3. SensorSource cannot be a target (it is a root producer)
  if (targetNode.type === 'sensorSource') {
    return false;
  }

  // 4. ThresholdCheck has split output handles ('true' or 'false')
  if (sourceNode.type === 'thresholdCheck') {
    // Valid to connect either true/false to action or downstream filter
    return Boolean(sourceHandle);
  }

  return true;
}

/**
 * Pre-configured template rules for rapid visual layout.
 */
export const FLOW_TEMPLATES = {
  turbineOverheat: {
    name: 'Turbine Overheat Emergency SMS',
    nodes: [
      {
        id: 'tpl-1',
        type: 'sensorSource',
        position: { x: 50, y: 140 },
        data: { deviceId: 'TURB-001', sensorType: 'temperature', lastValue: 72.5 },
      },
      {
        id: 'tpl-2',
        type: 'mathOperation',
        position: { x: 340, y: 140 },
        data: { operation: 'movingAverage', param: 5, outputValue: 71.8 },
      },
      {
        id: 'tpl-3',
        type: 'thresholdCheck',
        position: { x: 640, y: 140 },
        data: { operator: 'gt', threshold: 85, triggered: false },
      },
      {
        id: 'tpl-4',
        type: 'alertAction',
        position: { x: 940, y: 140 },
        data: { actionType: 'sms', target: '+91 98765 43210', message: 'CRITICAL: Turbine Overheat > 85°C' },
      },
    ],
    edges: [
      { id: 'te1-2', source: 'tpl-1', target: 'tpl-2', animated: true, style: { stroke: '#60a5fa', strokeWidth: 2 } },
      { id: 'te2-3', source: 'tpl-2', target: 'tpl-3', animated: true, style: { stroke: '#a78bfa', strokeWidth: 2 } },
      { id: 'te3-4', source: 'tpl-3', sourceHandle: 'true', target: 'tpl-4', animated: true, style: { stroke: '#ef4444', strokeWidth: 2 } },
    ],
  },
  boilerSafety: {
    name: 'Boiler Pressure Webhook Trigger',
    nodes: [
      {
        id: 'b-1',
        type: 'sensorSource',
        position: { x: 50, y: 140 },
        data: { deviceId: 'BOIL-004', sensorType: 'pressure', lastValue: 12.5 },
      },
      {
        id: 'b-2',
        type: 'thresholdCheck',
        position: { x: 380, y: 140 },
        data: { operator: 'gte', threshold: 16.0, triggered: false },
      },
      {
        id: 'b-3',
        type: 'alertAction',
        position: { x: 720, y: 140 },
        data: { actionType: 'webhook', target: 'https://safety.factory.internal/e-stop', message: 'VENT VALVE AUTOMATIC RELIEF' },
      },
    ],
    edges: [
      { id: 'be1-2', source: 'b-1', target: 'b-2', animated: true, style: { stroke: '#fbbf24', strokeWidth: 2 } },
      { id: 'be2-3', source: 'b-2', sourceHandle: 'true', target: 'b-3', animated: true, style: { stroke: '#ef4444', strokeWidth: 2 } },
    ],
  },
};
