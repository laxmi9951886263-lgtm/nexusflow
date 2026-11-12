import React from 'react';
import { Handle, Position } from 'reactflow';

// ═══════════════════════════════════════════════════════════════════════
// THRESHOLD CHECK NODE
// Evaluates incoming data against a user-defined threshold.
// If the condition is true, passes data to the "true" output handle.
// ═══════════════════════════════════════════════════════════════════════

const operators = [
  { value: 'gt', label: '> Greater Than' },
  { value: 'gte', label: '≥ Greater or Equal' },
  { value: 'lt', label: '< Less Than' },
  { value: 'lte', label: '≤ Less or Equal' },
  { value: 'eq', label: '= Equal To' },
  { value: 'neq', label: '≠ Not Equal' },
];

export default function ThresholdCheckNode({ data, isConnectable }) {
  const triggered = data.triggered;

  return (
    <div style={{ ...styles.card, borderColor: triggered ? '#ef4444' : '#f59e0b' }}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={isConnectable} style={styles.handleIn} />
      <div style={{ ...styles.header, background: triggered ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)' }}>
        <span style={styles.icon}>⚡</span>
        <span style={{ ...styles.title, color: triggered ? '#f87171' : '#fbbf24' }}>Threshold Check</span>
        {triggered !== undefined && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700,
            padding: '2px 7px', borderRadius: 10,
            background: triggered ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
            color: triggered ? '#f87171' : '#4ade80',
            border: `1px solid ${triggered ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.25)'}`,
          }}>
            {triggered ? '🔴 TRIGGERED' : '🟢 OK'}
          </span>
        )}
      </div>
      <div style={styles.body}>
        <label style={styles.label}>Condition</label>
        <select
          style={styles.select}
          value={data.operator || 'gt'}
          onChange={(e) => data.onChange?.('operator', e.target.value)}
        >
          {operators.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label style={styles.label}>Threshold Value</label>
        <input
          type="number"
          style={styles.input}
          value={data.threshold ?? 80}
          onChange={(e) => data.onChange?.('threshold', Number(e.target.value))}
        />
      </div>
      <Handle type="source" position={Position.Right} id="true" isConnectable={isConnectable} style={{ ...styles.handleOut, top: '40%', background: '#ef4444' }} />
      <Handle type="source" position={Position.Right} id="false" isConnectable={isConnectable} style={{ ...styles.handleOut, top: '70%', background: '#22c55e' }} />
    </div>
  );
}

const styles = {
  card: {
    background: '#111827',
    border: '1.5px solid #f59e0b',
    borderRadius: 12,
    minWidth: 200,
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(245,158,11,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid #713f12', borderRadius: '12px 12px 0 0',
  },
  icon: { fontSize: 16 },
  title: { fontSize: 12, fontWeight: 700 },
  body: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
  select: {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '1px solid #1e293b', background: '#0f172a',
    color: '#e2e8f0', fontSize: 12, outline: 'none',
  },
  input: {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '1px solid #1e293b', background: '#0f172a',
    color: '#e2e8f0', fontSize: 12, outline: 'none',
  },
  handleIn: { background: '#f59e0b', width: 10, height: 10, border: '2px solid #92400e' },
  handleOut: { background: '#f59e0b', width: 10, height: 10, border: '2px solid #92400e' },
};

