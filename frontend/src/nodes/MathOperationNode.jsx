import React from 'react';
import { Handle, Position } from 'reactflow';

// ═══════════════════════════════════════════════════════════════════════
// MATH OPERATION NODE
// Performs math transformations on incoming telemetry data.
// Supports: Moving Average, Multiply, Add, Absolute Value.
// ═══════════════════════════════════════════════════════════════════════

const operations = [
  { value: 'movingAverage', label: 'Moving Average' },
  { value: 'multiply', label: 'Multiply by Constant' },
  { value: 'add', label: 'Add Constant' },
  { value: 'abs', label: 'Absolute Value' },
  { value: 'round', label: 'Round' },
  { value: 'celsiusToF', label: '°C → °F' },
];

export default function MathOperationNode({ data, isConnectable }) {
  const op = data.operation || 'movingAverage';
  const needsParam = ['movingAverage', 'multiply', 'add'].includes(op);

  return (
    <div style={styles.card}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={isConnectable} style={styles.handleIn} />
      <div style={styles.header}>
        <span style={styles.icon}>🔢</span>
        <span style={styles.title}>Math Operation</span>
      </div>
      <div style={styles.body}>
        <label style={styles.label}>Operation</label>
        <select
          style={styles.select}
          value={op}
          onChange={(e) => data.onChange?.('operation', e.target.value)}
        >
          {operations.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {needsParam && (
          <>
            <label style={styles.label}>
              {op === 'movingAverage' ? 'Window Size' : 'Value'}
            </label>
            <input
              type="number"
              style={styles.input}
              value={data.param ?? (op === 'movingAverage' ? 5 : 1)}
              onChange={(e) => data.onChange?.('param', Number(e.target.value))}
            />
          </>
        )}

        {data.outputValue !== undefined && (
          <div style={styles.outputVal}>
            Output: <strong>{data.outputValue}</strong>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="out" isConnectable={isConnectable} style={styles.handleOut} />
    </div>
  );
}

const styles = {
  card: {
    background: '#111827',
    border: '1.5px solid #7c3aed',
    borderRadius: 12,
    minWidth: 200,
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(124,58,237,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', background: 'rgba(124,58,237,0.12)',
    borderBottom: '1px solid #4c1d95', borderRadius: '12px 12px 0 0',
  },
  icon: { fontSize: 16 },
  title: { fontSize: 12, fontWeight: 700, color: '#a78bfa' },
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
  outputVal: { fontSize: 11, color: '#a78bfa', marginTop: 4 },
  handleIn: { background: '#7c3aed', width: 10, height: 10, border: '2px solid #4c1d95' },
  handleOut: { background: '#7c3aed', width: 10, height: 10, border: '2px solid #4c1d95' },
};

