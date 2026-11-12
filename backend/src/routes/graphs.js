const express = require('express');
const router = express.Router();
const FlowGraph = require('../models/FlowGraph');

// ─────────────────────────────────────────────────────────────────────
// GET /api/graphs — List all saved flow graphs
// ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const graphs = await FlowGraph.find().sort({ updatedAt: -1 }).lean();
    res.json(graphs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/graphs — Save a new flow graph from the React Flow canvas
// Body: { name, description?, nodes, edges }
// ─────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, description, nodes, edges } = req.body;

  if (!name || !nodes || !edges) {
    return res.status(400).json({
      error: 'Missing required fields: name, nodes, edges',
    });
  }

  try {
    const graph = await FlowGraph.create({
      name,
      description: description || '',
      nodes,
      edges,
    });
    res.status(201).json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/graphs/:id — Get a single graph by ID
// ─────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const graph = await FlowGraph.findById(req.params.id).lean();
    if (!graph) return res.status(404).json({ error: 'Graph not found' });
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// PUT /api/graphs/:id — Update graph (save canvas changes)
// ─────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const graph = await FlowGraph.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!graph) return res.status(404).json({ error: 'Graph not found' });
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/graphs/:id — Delete a graph
// ─────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const graph = await FlowGraph.findByIdAndDelete(req.params.id);
    if (!graph) return res.status(404).json({ error: 'Graph not found' });
    res.json({ status: 'deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

