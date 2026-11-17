// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Graph Serialization & DAG Test Suite (Day 5 Milestone)
// Verifies DAG topological sort, cycle detection, and manifest creation.
// ═══════════════════════════════════════════════════════════════════════

const { serializeAndValidateGraph } = require('../src/services/graphSerializer');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║    NexusFlow — Day 5 Graph Serialization & DAG Test      ║');
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

// ── Test 1: Valid Linear Rule Pipeline ──
const validPipeline = {
  nodes: [
    { id: 'n1', type: 'sensorSource', data: { deviceId: 'TURB-001', sensorType: 'temperature' } },
    { id: 'n2', type: 'mathOperation', data: { operation: 'movingAverage', param: 5 } },
    { id: 'n3', type: 'thresholdCheck', data: { operator: 'gt', threshold: 85 } },
    { id: 'n4', type: 'alertAction', data: { actionType: 'sms', target: '+91 9999999999' } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2' },
    { id: 'e2', source: 'n2', target: 'n3' },
    { id: 'e3', source: 'n3', target: 'n4' },
  ],
};

const res1 = serializeAndValidateGraph(validPipeline);
assert(res1.valid === true, 'Valid 4-node pipeline passes validation');
assert(res1.executionOrder.length === 4, 'Execution order contains all 4 nodes');
assert(res1.executionOrder[0] === 'n1' && res1.executionOrder[3] === 'n4', 'Topological sort order matches stream direction (n1 -> n2 -> n3 -> n4)');

// ── Test 2: Execution Manifest Generation ──
assert(res1.manifest !== null, 'Execution manifest generated');
assert(res1.manifest.sources.length === 1 && res1.manifest.sources[0].deviceId === 'TURB-001', 'Manifest correctly identifies TURB-001 as root data producer');
assert(res1.manifest.sinks.length === 2, 'Manifest identifies downstream sinks (threshold & alertAction)');

// ── Test 3: Cyclic Dependency Detection (Cycle Rejection) ──
const cyclicPipeline = {
  nodes: [
    { id: 'c1', type: 'sensorSource', data: {} },
    { id: 'c2', type: 'mathOperation', data: {} },
    { id: 'c3', type: 'thresholdCheck', data: {} },
  ],
  edges: [
    { id: 'ce1', source: 'c1', target: 'c2' },
    { id: 'ce2', source: 'c2', target: 'c3' },
    { id: 'ce3', source: 'c3', target: 'c2' }, // Cycle: c2 <-> c3
  ],
};

const res3 = serializeAndValidateGraph(cyclicPipeline);
assert(res3.valid === false, 'Cyclic dependency properly detected and rejected');
assert(res3.errors.some((e) => e.includes('cycle')), 'Error message explicitly reports circular dependency / DAG violation');

// ── Test 4: Missing Node Reference in Edge ──
const brokenEdgePipeline = {
  nodes: [
    { id: 'b1', type: 'sensorSource', data: {} },
    { id: 'b2', type: 'alertAction', data: {} },
  ],
  edges: [
    { id: 'be1', source: 'b1', target: 'non_existent_node' },
  ],
};

const res4 = serializeAndValidateGraph(brokenEdgePipeline);
assert(res4.valid === false, 'Orphaned/non-existent target node in edge rejected');

// ── Test 5: Pipeline Missing Root Source ──
const sourcelessPipeline = {
  nodes: [
    { id: 's1', type: 'mathOperation', data: {} },
    { id: 's2', type: 'alertAction', data: {} },
  ],
  edges: [
    { id: 'se1', source: 's1', target: 's2' },
  ],
};

const res5 = serializeAndValidateGraph(sourcelessPipeline);
assert(res5.valid === false, 'Pipeline without sensorSource data producer rejected');

console.log(`\n==============================================`);
console.log(`Summary: ${passed}/${total} Day 5 tests passed! ✅`);
console.log(`==============================================\n`);
