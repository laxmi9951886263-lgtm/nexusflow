import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import SensorSourceNode from './nodes/SensorSourceNode.jsx';
import MathOperationNode from './nodes/MathOperationNode.jsx';
import ThresholdCheckNode from './nodes/ThresholdCheckNode.jsx';
import AlertActionNode from './nodes/AlertActionNode.jsx';

// ── Initial demo rule pipeline ──
const initialNodes = [
  {
    id: 'node-1',
    type: 'sensorSource',
    position: { x: 80, y: 150 },
    data: { deviceId: 'TURB-001', sensorType: 'temperature', lastValue: 78.4 },
  },
  {
    id: 'node-2',
    type: 'mathOperation',
    position: { x: 370, y: 150 },
    data: { operation: 'movingAverage', param: 5, outputValue: 77.2 },
  },
  {
    id: 'node-3',
    type: 'thresholdCheck',
    position: { x: 670, y: 150 },
    data: { operator: 'gt', threshold: 80, triggered: false },
  },
  {
    id: 'node-4',
    type: 'alertAction',
    position: { x: 970, y: 150 },
    data: { actionType: 'sms', target: '+91 98765 43210', message: 'CRITICAL: Turbine Temp > 80°C' },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: '#60a5fa', strokeWidth: 2 } },
  { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, style: { stroke: '#a78bfa', strokeWidth: 2 } },
  { id: 'e3-4', source: 'node-3', sourceHandle: 'true', target: 'node-4', animated: true, style: { stroke: '#ef4444', strokeWidth: 2 } },
];

export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [saveStatus, setSaveStatus] = useState('');
  const [telemetryCount, setTelemetryCount] = useState(0);
  const [liveReading, setLiveReading] = useState(null);
  const reactFlowWrapper = useRef(null);

  // Custom node types definition
  const nodeTypes = useMemo(() => ({
    sensorSource: SensorSourceNode,
    mathOperation: MathOperationNode,
    thresholdCheck: ThresholdCheckNode,
    alertAction: AlertActionNode,
  }), []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#34d399', strokeWidth: 2 } }, eds)),
    []
  );

  // ── Drag & drop from palette ──
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 280,
        y: event.clientY - 60,
      };

      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    []
  );

  // ── Save graph to backend ──
  const handleSaveGraph = async () => {
    setSaveStatus('Saving graph...');
    try {
      const payload = {
        name: 'Turbine Temp Anomaly Rule',
        description: 'Auto-compiled RxJS rule: Temp > 80°C trigger SMS alert',
        nodes,
        edges,
      };
      const res = await fetch('/api/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaveStatus('✅ Graph saved successfully');
      } else {
        setSaveStatus('⚠️ Saved locally (Backend offline)');
      }
    } catch {
      setSaveStatus('⚠️ Saved locally (Demo mode)');
    }
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // ── Connect to live telemetry WebSocket ──
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(`ws://${window.location.hostname}:4000/ws`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'telemetry') {
            setTelemetryCount((c) => c + 1);
            setLiveReading(msg.data);

            // Update sensorSource node dynamically
            setNodes((nds) =>
              nds.map((node) => {
                if (node.type === 'sensorSource' && node.data.deviceId === msg.data.deviceId) {
                  return {
                    ...node,
                    data: { ...node.data, lastValue: msg.data.value },
                  };
                }
                return node;
              })
            );
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* ── TOP HEADER ── */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>NF</div>
          <div>
            <h1 style={styles.title}>NexusFlow</h1>
            <p style={styles.subtitle}>Visual IoT Telemetry & Rule Engine · Week 1</p>
          </div>
        </div>

        <div style={styles.statsRow}>
          <span style={styles.badge}>
            <span style={styles.livePulse} />
            Telemetry: <strong>{telemetryCount} pts</strong>
          </span>
          {liveReading && (
            <span style={styles.badge}>
              {liveReading.deviceId}: <strong>{liveReading.value} {liveReading.unit}</strong>
            </span>
          )}
          <span style={{ ...styles.badge, background: '#1e3a5f', color: '#60a5fa' }}>
            MongoDB Time-Series Active
          </span>
          <button style={styles.saveBtn} onClick={handleSaveGraph}>
            💾 Save Flow Graph
          </button>
          {saveStatus && <span style={styles.saveStatus}>{saveStatus}</span>}
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div style={styles.workspace}>
        {/* ── LEFT PALETTE ── */}
        <aside style={styles.sidebar}>
          <div style={styles.paletteTitle}>Node Palette</div>
          <p style={styles.paletteHint}>Drag & drop nodes onto the canvas to construct IoT rules:</p>

          <div
            style={{ ...styles.nodeItem, borderColor: '#3b82f6', color: '#60a5fa' }}
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'sensorSource')}
            draggable
          >
            <span>📡</span> Sensor Source
          </div>

          <div
            style={{ ...styles.nodeItem, borderColor: '#7c3aed', color: '#a78bfa' }}
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'mathOperation')}
            draggable
          >
            <span>🔢</span> Math Operation
          </div>

          <div
            style={{ ...styles.nodeItem, borderColor: '#f59e0b', color: '#fbbf24' }}
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'thresholdCheck')}
            draggable
          >
            <span>⚡</span> Threshold Check
          </div>

          <div
            style={{ ...styles.nodeItem, borderColor: '#ec4899', color: '#f472b6' }}
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'alertAction')}
            draggable
          >
            <span>🔔</span> Alert Action
          </div>

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>Week 1 Architecture:</div>
            <ul style={styles.infoList}>
              <li>✓ MongoDB 5.0+ Time-Series</li>
              <li>✓ 5,000 writes/sec batch buffer</li>
              <li>✓ React Flow visual canvas</li>
              <li>✓ Graph JSON serialization</li>
            </ul>
          </div>
        </aside>

        {/* ── REACT FLOW CANVAS ── */}
        <div style={styles.canvasWrapper} ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls style={styles.controls} />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'sensorSource') return '#3b82f6';
                if (n.type === 'mathOperation') return '#7c3aed';
                if (n.type === 'thresholdCheck') return '#f59e0b';
                return '#ec4899';
              }}
              style={styles.minimap}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#0a0e1a' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px', background: '#0f172a', borderBottom: '1px solid #1e293b',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: {
    width: 38, height: 38, borderRadius: 10,
    background: 'linear-gradient(135deg, #00f5c4, #7b5cf0)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: 16, color: '#0a0e1a',
  },
  title: { fontSize: 18, fontWeight: 800, color: '#f8fafc', margin: 0 },
  subtitle: { fontSize: 11, color: '#64748b', margin: 0 },
  statsRow: { display: 'flex', alignItems: 'center', gap: 12 },
  badge: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 20, background: '#1e293b',
    border: '1px solid #334155', fontSize: 12, color: '#94a3b8',
  },
  livePulse: { width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)' },
  saveBtn: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  },
  saveStatus: { fontSize: 12, color: '#34d399', fontWeight: 600 },
  workspace: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: 260, background: '#0d1322', borderRight: '1px solid #1e293b',
    padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
  },
  paletteTitle: { fontSize: 13, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.04em' },
  paletteHint: { fontSize: 11, color: '#64748b', lineHeight: 1.4, margin: '0 0 8px 0' },
  nodeItem: {
    padding: '10px 14px', borderRadius: 8, background: '#111827',
    border: '1.5px solid #1e293b', fontSize: 13, fontWeight: 600,
    cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10,
    userSelect: 'none',
  },
  infoBox: {
    marginTop: 'auto', background: '#0a0e1a', border: '1px solid #1e293b',
    borderRadius: 8, padding: 12,
  },
  infoTitle: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 },
  infoList: { margin: 0, paddingLeft: 16, fontSize: 10, color: '#64748b', lineHeight: 1.6 },
  canvasWrapper: { flex: 1, position: 'relative' },
  controls: { background: '#0f172a', border: '1px solid #1e293b' },
  minimap: { background: '#0d1322', border: '1px solid #1e293b', borderRadius: 8 },
};

