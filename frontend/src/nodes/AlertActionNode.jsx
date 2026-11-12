import React from 'react';
import { Handle, Position } from 'reactflow';

// ═══════════════════════════════════════════════════════════════════════
// ALERT ACTION NODE
// Output trigger node (SMS, Webhook, Email, Log alert).
// Triggers when a threshold or logic rule evaluates to true.
// ═══════════════════════════════════════════════════════════════════════

const actionTypes = [
  { value: 'sms', label: '📱 SMS Alert' },
  { value: 'webhook', label: '🌐 Webhook POST' },
  { value: 'email', label: '✉️ Email Notification' },
  { value: 'console', label: '📋 System Log' },
];

export default function AlertActionNode({ data, isConnectable }) {
  const action = data.actionType || 'sms';

  return (
    <div style={styles.card}>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={isConnectable}
        style={styles.handle}
      />
      <div style={styles.header}>
        <span style={styles.icon}>🔔</span>
        <span style={styles.title}>Action Trigger</span>
      </div>
      <div style={styles.body}>
        <label style={styles.label}>Action Type</label>
        <select
          style={styles.select}
          value={action}
          onChange={(e) => data.onChange?.('actionType', e.target.value)}
        >
          {actionTypes.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        <label style={styles.label}>
          {action === 'sms' ? 'Recipient Phone' : action === 'webhook' ? 'Webhook URL' : 'Target'}
        </label>
        <input
          type="text"
          style={styles.input}
          placeholder={action === 'sms' ? '+91 98765 43210' : 'https://api.example.com/alert'}
          value={data.target || ''}
          onChange={(e) => data.onChange?.('target', e.target.value)}
        />

        <label style={styles.label}>Message Template</label>
        <input
          type="text"
          style={styles.input}
          placeholder="ALERT: {{device}} exceeded limit: {{val}}"
          value={data.message || ''}
          onChange={(e) => data.onChange?.('message', e.target.value)}
        />
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#111827',
    border: '1.5px solid #ec4899',
    borderRadius: 12,
    minWidth: 220,
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(236,72,153,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', background: 'rgba(236,72,153,0.12)',
    borderBottom: '1px solid #831843', borderRadius: '12px 12px 0 0',
  },
  icon: { fontSize: 16 },
  title: { fontSize: 12, fontWeight: 700, color: '#f472b6' },
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
  handle: {
    background: '#ec4899', width: 10, height: 10, border: '2px solid #831843',
  },
};

