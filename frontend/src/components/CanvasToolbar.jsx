import React from 'react';
import { FLOW_TEMPLATES } from '../utils/flowValidation';

// ═══════════════════════════════════════════════════════════════════════
// NexusFlow — Canvas Toolbar Component (Day 4 Milestone)
// Quick action controls for loading templates, zooming, and clearing.
// ═══════════════════════════════════════════════════════════════════════

export default function CanvasToolbar({
  onLoadTemplate,
  onClearCanvas,
  nodeCount,
  edgeCount,
  onAddQuickNode,
}) {
  return (
    <div style={styles.toolbar}>
      {/* ── Template Loader ── */}
      <div style={styles.group}>
        <span style={styles.label}>Templates:</span>
        <select
          style={styles.select}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              onLoadTemplate(FLOW_TEMPLATES[e.target.value]);
              e.target.value = '';
            }
          }}
        >
          <option value="" disabled>Load Preset Rule...</option>
          <option value="turbineOverheat">🔧 Turbine Overheat SMS Alert</option>
          <option value="boilerSafety">🔥 Boiler Pressure Safety Webhook</option>
        </select>
      </div>

      <div style={styles.divider} />

      {/* ── Quick Add Node Buttons ── */}
      <div style={styles.group}>
        <span style={styles.label}>Add:</span>
        <button style={styles.btnSm} onClick={() => onAddQuickNode('sensorSource')}>+ Sensor</button>
        <button style={styles.btnSm} onClick={() => onAddQuickNode('mathOperation')}>+ Math</button>
        <button style={styles.btnSm} onClick={() => onAddQuickNode('thresholdCheck')}>+ Check</button>
        <button style={styles.btnSm} onClick={() => onAddQuickNode('alertAction')}>+ Alert</button>
      </div>

      <div style={styles.divider} />

      {/* ── Clear Action ── */}
      <button style={styles.btnDanger} onClick={onClearCanvas}>
        🗑️ Clear
      </button>

      {/* ── Metrics ── */}
      <div style={styles.metrics}>
        <span>Nodes: <strong>{nodeCount}</strong></span>
        <span>•</span>
        <span>Wires: <strong>{edgeCount}</strong></span>
        <span>•</span>
        <span style={{ color: nodeCount > 0 ? '#34d399' : '#64748b' }}>
          {nodeCount > 0 ? '● Topology Valid' : '○ Canvas Empty'}
        </span>
      </div>
    </div>
  );
}

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 16px',
    background: '#0d1322',
    borderBottom: '1px solid #1e293b',
    fontSize: 12,
    color: '#94a3b8',
    flexWrap: 'wrap',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  select: {
    padding: '4px 8px',
    borderRadius: 6,
    background: '#111827',
    border: '1px solid #1e293b',
    color: '#e2e8f0',
    fontSize: 11,
    outline: 'none',
    cursor: 'pointer',
  },
  btnSm: {
    padding: '3px 8px',
    borderRadius: 5,
    background: '#111827',
    border: '1px solid #1e293b',
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDanger: {
    padding: '3px 10px',
    borderRadius: 5,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  divider: {
    width: 1,
    height: 18,
    background: '#1e293b',
  },
  metrics: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    color: '#64748b',
  },
};
