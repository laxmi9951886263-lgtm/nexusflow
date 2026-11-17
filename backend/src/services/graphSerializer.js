// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Graph Serialization & Execution Planner (Day 5 Milestone)
// Parses React Flow JSON, detects cycles, and calculates topological
// execution ordering for the upcoming RxJS stream compiler.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Validates and serializes a React Flow graph JSON into an execution plan.
 * Returns { valid: boolean, errors: string[], executionOrder: string[], manifest: object }
 */
function serializeAndValidateGraph(graphData) {
  const errors = [];
  const { nodes = [], edges = [] } = graphData || {};

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { valid: false, errors: ['Graph must contain at least one node'], executionOrder: [], manifest: null };
  }

  const nodeMap = new Map();
  nodes.forEach((n) => {
    if (!n.id || !n.type) {
      errors.push(`Node missing mandatory "id" or "type": ${JSON.stringify(n)}`);
    } else if (nodeMap.has(n.id)) {
      errors.push(`Duplicate node id detected: "${n.id}"`);
    } else {
      nodeMap.set(n.id, n);
    }
  });

  // Verify edges connect to existing nodes
  const adjacencyList = new Map();
  const inDegree = new Map();
  nodes.forEach((n) => {
    adjacencyList.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((edge, idx) => {
    if (!edge.source || !edge.target) {
      errors.push(`Edge at index ${idx} missing "source" or "target"`);
      return;
    }
    if (!nodeMap.has(edge.source)) {
      errors.push(`Edge ${edge.id || idx} references non-existent source node "${edge.source}"`);
    }
    if (!nodeMap.has(edge.target)) {
      errors.push(`Edge ${edge.id || idx} references non-existent target node "${edge.target}"`);
    }
    if (edge.source === edge.target) {
      errors.push(`Self-referential edge detected on node "${edge.source}"`);
    }

    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      adjacencyList.get(edge.source).push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  });

  // Check for at least one source node (sensorSource)
  const sourceNodes = nodes.filter((n) => n.type === 'sensorSource');
  if (sourceNodes.length === 0) {
    errors.push('Graph must contain at least one "sensorSource" data producer node');
  }

  // Check for at least one sink node (alertAction or thresholdCheck)
  const sinkNodes = nodes.filter((n) => ['alertAction', 'thresholdCheck'].includes(n.type));
  if (sinkNodes.length === 0) {
    errors.push('Graph must contain at least one action trigger or threshold sink node');
  }

  // Detect cycles using Kahn's Algorithm (Topological Sort)
  const executionOrder = [];
  const queue = [];

  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift();
    executionOrder.push(current);

    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (executionOrder.length !== nodes.length) {
    errors.push('Circular dependency / cycle detected in flow graph. Rules must be a Directed Acyclic Graph (DAG)');
  }

  const valid = errors.length === 0;

  const manifest = valid ? {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    sources: sourceNodes.map((n) => ({ id: n.id, deviceId: n.data?.deviceId, sensor: n.data?.sensorType })),
    sinks: sinkNodes.map((n) => ({ id: n.id, type: n.type, action: n.data?.actionType || 'threshold' })),
    pipelineDepth: executionOrder.length,
    executionOrder,
  } : null;

  return {
    valid,
    errors,
    executionOrder: valid ? executionOrder : [],
    manifest,
  };
}

module.exports = {
  serializeAndValidateGraph,
};
