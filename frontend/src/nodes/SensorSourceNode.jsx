import React from 'react';
import { Handle, Position } from 'reactflow';

// ═══════════════════════════════════════════════════════════════════════
// SENSOR SOURCE NODE
// Represents an IoT device data source on the visual canvas.
// Factory managers drag this node to connect a device's telemetry feed.
// ═══════════════════════════════════════════════════════════════════════

const sensorOptions = [
  { value: 'TURB-001', label: '🔧 Main Turbine A' },
  { value: 'PUMP-002', label: '💧 Coolant Pump B' },
  { value: 'COMP-003', label: '💨 Air Compressor C' },
  { value: 'BOIL-004', label: '🔥 Steam Boiler D' },
];

const sensorTypes = [
  'temperature', 'pressure', 'humidity', 'vibration',
  'rpm', 'voltage', 'current', 'flow_rate', 'gas_level',
];

export default function SensorSourceNode({ data, isConnectable }) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.icon}>📡</span>
        <span style={styles.title}>Sensor Source</span>
      </div>
      <div style={styles.body}>
        <label style={styles.label}>Device</label>
        <select
          style={styles.select}
          value={data.deviceId || 'TURB-001'}
          onChange={(e) => data.onChange?.('deviceId', e.target.value)}
        >
          {sensorOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label style={styles.label}>Sensor Type</label>
        <select
          style={styles.select}
          value={data.sensorType || 'temperature'}
          onChange={(e) => data.onChange?.('sensorType', e.target.value)}
        >
          {sensorTypes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {data.lastValue !== undefined && (
          <div style={styles.liveValue}>
            <span style={styles.dot} /> Live: <strong>{data.lastValue}</strong>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        isConnectable={isConnectable}
        style={styles.handle}
      />
    </div>
  );
}

const styles = {
  card: {
    background: '#111827',
    border: '1.5px solid #1e40af',
    borderRadius: 12,
    minWidth: 210,
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(30,64,175,0.25)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'rgba(30,64,175,0.15)',
    borderBottom: '1px solid #1e3a5f',
    borderRadius: '12px 12px 0 0',
  },
  icon: { fontSize: 16 },
  title: { fontSize: 12, fontWeight: 700, color: '#60a5fa' },
  body: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
  select: {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '1px solid #1e293b', background: '#0f172a',
    color: '#e2e8f0', fontSize: 12, outline: 'none',
  },
  liveValue: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: '#34d399', marginTop: 4,
  },
  dot: {
    width: 6, height: 6, borderRadius: '50%', background: '#34d399',
    boxShadow: '0 0 6px rgba(52,211,153,0.6)',
  },
  handle: {
    background: '#3b82f6', width: 10, height: 10, border: '2px solid #1e40af',
  },
};

