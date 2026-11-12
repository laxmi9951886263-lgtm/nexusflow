const mongoose = require('mongoose');

// ─── Flow Graph Schema ──────────────────────────────────────────────
// Stores the React Flow JSON graph: nodes + edges serialized from the
// visual canvas, ready to be compiled into RxJS streams by the backend.

const flowGraphSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
  },
  // ── React Flow JSON (nodes array) ──
  nodes: [
    {
      id: { type: String, required: true },
      type: {
        type: String,
        required: true,
        enum: [
          'sensorSource',
          'mathOperation',
          'thresholdCheck',
          'movingAverage',
          'alertAction',
          'webhookAction',
          'logAction',
        ],
      },
      position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
  ],
  // ── React Flow JSON (edges array) ──
  edges: [
    {
      id: { type: String, required: true },
      source: { type: String, required: true },
      target: { type: String, required: true },
      sourceHandle: { type: String, default: null },
      targetHandle: { type: String, default: null },
    },
  ],
  // ── State ──
  isActive: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: String,
    default: 'admin',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('FlowGraph', flowGraphSchema);

