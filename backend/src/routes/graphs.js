const express = require('express');
const router = express.Router();
const FlowGraph = require('../models/FlowGraph');
const { serializeAndValidateGraph } = require('../services/graphSerializer');

// In-memory fallback store when DB is offline
const memoryGraphs = new Map();

// ═══════════════════════════════════════════════════════════════════════
// FLOW GRAPH SERIALIZATION & COMPILATION ROUTES (Day 5 Enhanced)
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// GET /api/graphs — List all saved flow graphs
// ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const graphs = await FlowGraph.find().sort({ updatedAt: -1 }).lean();
    if (graphs.length > 0) return res.json(graphs);
  } catch (err) {}

  res.json(Array.from(memoryGraphs.values()));
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/graphs/validate — Validate graph topology (Day 5 Feature)
// ─────────────────────────────────────────────────────────────────────
router.post('/validate', (req, res) => {
  const result = serializeAndValidateGraph(req.body);
  if (!result.valid) {
    return res.status(400).json({ status: 'invalid', errors: result.errors });
  }
  res.json({
    status: 'valid',
    executionOrder: result.executionOrder,
    manifest: result.manifest,
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/graphs — Save a new flow graph with pre-validation
// ─────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, description, nodes, edges } = req.body;

  if (!name || !nodes || !edges) {
    return res.status(400).json({ error: 'Missing required fields: name, nodes, edges' });
  }

  // Pre-validate topology before saving
  const validation = serializeAndValidateGraph({ nodes, edges });
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Graph validation failed',
      details: validation.errors,
    });
  }

  try {
    const graph = await FlowGraph.create({
      name,
      description: description || '',
      nodes,
      edges,
    });
    return res.status(201).json({ graph, manifest: validation.manifest });
  } catch (err) {
    // Memory store fallback
    const id = `graph-${Date.now()}`;
    const memGraph = { _id: id, id, name, description, nodes, edges, createdAt: new Date() };
    memoryGraphs.set(id, memGraph);
    return res.status(201).json({ graph: memGraph, manifest: validation.manifest, persisted: 'in-memory' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/graphs/:id/export — Export graph execution manifest (Day 5)
// ─────────────────────────────────────────────────────────────────────
router.get('/:id/export', async (req, res) => {
  let graph = null;
  try {
    graph = await FlowGraph.findById(req.params.id).lean();
  } catch (err) {}

  if (!graph) {
    graph = memoryGraphs.get(req.params.id);
  }

  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }

  const validation = serializeAndValidateGraph(graph);

  res.json({
    graphId: graph._id || graph.id,
    name: graph.name,
    description: graph.description,
    serializedAt: new Date().toISOString(),
    nodes: graph.nodes,
    edges: graph.edges,
    manifest: validation.manifest,
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/graphs/import — Import external JSON graph (Day 5 Feature)
// ─────────────────────────────────────────────────────────────────────
router.post('/import', async (req, res) => {
  const { name = 'Imported Pipeline', description = '', nodes, edges } = req.body;

  const validation = serializeAndValidateGraph({ nodes, edges });
  if (!validation.valid) {
    return res.status(400).json({ error: 'Imported graph is invalid', details: validation.errors });
  }

  const id = `imported-${Date.now()}`;
  const importedDoc = { _id: id, id, name, description, nodes, edges, importedAt: new Date() };
  memoryGraphs.set(id, importedDoc);

  res.status(201).json({
    status: 'imported',
    graph: importedDoc,
    manifest: validation.manifest,
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/graphs/:id — Get a single graph by ID
// ─────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const graph = await FlowGraph.findById(req.params.id).lean();
    if (graph) return res.json(graph);
  } catch (err) {}

  const mem = memoryGraphs.get(req.params.id);
  if (mem) return res.json(mem);

  res.status(404).json({ error: 'Graph not found' });
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/graphs/:id — Delete a graph
// ─────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await FlowGraph.findByIdAndDelete(req.params.id);
  } catch (err) {}

  memoryGraphs.delete(req.params.id);
  res.json({ status: 'deleted', id: req.params.id });
});

module.exports = router;
