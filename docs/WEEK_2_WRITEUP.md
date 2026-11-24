# NexusFlow — Week 2 Engineering Write-up: Logic Compiler & Reactive Stream Engine

**Project:** NexusFlow (Visual IoT Telemetry & Rule Engine)  
**Author:** NagaLaxmi  
**Repository:** [https://github.com/laxmi9951886263-lgtm/nexusflow](https://github.com/laxmi9951886263-lgtm/nexusflow)  
**Milestone:** Mid-Review (Weeks 1 & 2)

---

## 1. Executive Summary
During Week 2, our development focus transitioned from ingestion infrastructure and visual canvas scaffolding to the core reactive computing layer. We engineered the Node.js **RxJS Stream Compiler**, designed stateful mathematical and signal filtering engines, implemented hysteresis anti-flapping logic to eliminate alert oscillations, and completed the visual node library on the React Flow canvas.

Additionally, we conducted the **Mid-Project Review Ingestion Audit**, validating that our MongoDB Time-Series architecture sustains over 5,000 writes/second with a ~70% reduced storage footprint compared to standard document collections.

---

## 2. Key Modules Delivered in Week 2

### A. Graph Serialization & Topological Execution Planner (`graphSerializer.js`)
- Implemented **Kahn's Algorithm for Directed Acyclic Graphs (DAG)** to compute strict topological ordering from raw React Flow visual graph representations.
- Added cycle detection to reject self-referential or recursive loops before compilation.
- Structured execution manifests mapping root sensor producers (`sensorSource`), intermediate transformers (`mathOperation`), conditional gates (`thresholdCheck`), and terminal sinks (`alertAction`).
- **Endpoints:** `POST /api/graphs/validate`, `GET /api/graphs/:id/export`, `POST /api/graphs/import`.
- **Test Suite:** `backend/scripts/testGraphSerialization.js` (10/10 tests passed).

### B. RxJS Reactive Stream Compiler (`streamCompiler.js`)
- Formed the backend compiler that translates serialized visual JSON pipelines into executable, non-blocking **RxJS Observables** (`telemetryBus$`).
- Utilized high-order operators:
  - `filter`: Matches targeted machine IDs and sensor types.
  - `map`: Applies mathematical and statistical signal transformations.
  - `filter`: Evaluates stateful threshold conditions with hysteresis buffers.
  - `tap`: Dispatches multi-channel outbound alerts (SMS, Webhooks, Emails) without interrupting stream flow.
- Built dynamic lifecycle controls (`activateRulePipeline`, `stopRulePipeline`, `getActivePipelines`) allowing factory operators to compile and stop visual rules at runtime with zero server restart.
- **Test Suite:** `backend/scripts/testStreamCompiler.js` (12/12 tests passed).

### C. Industrial Math & Signal Processing Engine (`mathEngine.js`)
- Designed sliding-window **Simple Moving Average (SMA)** and **Exponential Moving Average (EMA)** to filter transient machine sensor spikes.
- Implemented statistical outlier/glitch detection based on rolling standard deviations.
- Added bidirectional industrial unit conversion utilities:
  - Temperature: Celsius (°C) ↔ Fahrenheit (°F)
  - Pressure: Bar ↔ PSI
  - Flow Rate: Liters/min (L/min) ↔ Gallons/min (GPM)
  - Rotational Velocity: Revolutions per minute (RPM) ↔ Hertz (Hz)
- **Test Suite:** `backend/scripts/testMathEngine.js` (13/13 tests passed).

### D. Stateful Threshold Engine & Hysteresis Anti-Flapping (`thresholdEngine.js`)
- Developed condition evaluators for relational operators: `>`, `>=`, `<`, `<=`, `==`, `!=`, `between`, and `outside`.
- Implemented **hysteresis deadbands** (`delta`): Prevents "alert storms" caused by sensor readings jittering around critical boundary points.
- Enforced per-rule cooldown rate limiters to avoid flood dispatches.
- **Test Suite:** `backend/scripts/testThresholdEngine.js` (13/13 tests passed).

### E. Visual Node Library & Dynamic Wire Styling (`frontend/src/nodes`)
- Finalized custom node components for the React Flow visual canvas:
  - `SensorSourceNode`: Live reading indicator, calibrated target selector.
  - `MathOperationNode`: Configurable window sizes, operations, and dynamic formulas.
  - `ThresholdCheckNode`: Dual output ports (`true`/`false`) with instant visual status pill.
  - `AlertActionNode`: Multi-channel targets (SMS, Webhook URL, Email) with dynamic string templates.
- Enforced connection rules (`flowValidation.js`) to guarantee valid signal flow from sensors to actions.

---

## 3. Mid-Project Review Audit: Ingestion & Serialization

| Audit Requirement | SLA Benchmark | NexusFlow Result | Status |
| :--- | :--- | :--- | :--- |
| **Write Ingestion Throughput** | ≥ 5,000 writes/sec | ~370,000 ops/sec (in-memory buffer + batch bulkWrite) | ✅ Passed |
| **Storage Optimization** | Native bucketing | MongoDB 5.0+ Time-Series (`seconds` granularity) | ✅ Passed |
| **Graph Serialization** | Valid DAG JSON | Kahn's Algorithm topological manifest | ✅ Passed |
| **Real-time Compilation** | Instant activation | Dynamic RxJS Subscription in < 5ms | ✅ Passed |

---

## 4. Challenges & Engineering Solutions
1. **Challenge: High Data Velocity vs. Rule Processing Latency**  
   *Solution:* We decoupled the ingestion endpoint from the database write through an in-memory batch buffer (`writeBuffer`), while concurrently piping points into RxJS Observables in memory. This ensures sub-millisecond rule execution independent of database I/O latency.
2. **Challenge: Alert Flapping Near Boundary Thresholds**  
   *Solution:* Implemented a stateful hysteresis engine that requires the sensor value to drop below `(Threshold - Delta)` before the trigger state resets to normal.

---

## 5. Next Steps for Week 3 & Week 4
- **Week 3:** Connect live WebSocket feeds directly to compiled RxJS pipelines and build real-time Recharts dashboards for multi-sensor visualization.
- **Week 4:** Integrate external Webhook dispatchers and finalize canvas polish with glowing animated wires.
