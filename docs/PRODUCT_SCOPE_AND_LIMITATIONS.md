# NetHeal — Product Scope, Boundaries & System Limitations

## 1. Intended Purpose & Product Boundaries

**NetHeal** is an educational, research-oriented network simulation and demonstration platform. It allows engineers and researchers to study network routing behaviors, failure recovery dynamics, and machine-learning-assisted path optimization in software.

### What NetHeal IS:
- A software-based network simulation using NetworkX.
- An interactive web application with real-time API communication.
- A functional ML-assisted routing engine using a pre-trained Random Forest model.
- A multi-scenario benchmark platform with measured runtimes.

### What NetHeal is NOT:
- **Not a physical network management system**: It does not configure physical Cisco, Juniper, or Linux kernel routing tables (e.g., via BGP, OSPF, or Netlink).
- **Not a real-world telemetry collector**: It does not ingest SNMP traps, NetFlow, or telemetry streams from real hardware.
- **Not a packet transmission engine**: Route latencies and packet losses are computed from deterministic graph edge attributes; individual IP packets are not encapsulated or transmitted over wire.

---

## 2. Machine Learning & Dataset Limitations

1. **Synthetic Data Origin**:
   - The Random Forest model was trained on 5,000 synthetic route records generated from a mathematical quality formula.
   - The model learns to approximate this SLA score. It should not be interpreted as empirical packet delivery guarantees on physical fiber or copper backbones.
2. **Topology Coupling**:
   - While the regression model takes path-level metrics (`hops`, `latency`, `bandwidth`, `loss`) independent of router labels, the path enumerator is optimized for small-to-medium graphs (up to ~50 routers). On large enterprise topologies, exhaustive path enumeration ($O(V!)$) requires bounding with heuristic k-shortest paths.
3. **Single-Threaded Windows Configuration**:
   - The model is loaded with `n_jobs = 1` to prevent Windows multiprocessing lockups. High-throughput multi-user deployments should run under Linux/gunicorn workers.

---

## 3. State Management & Concurrency Limitations

1. **In-Memory Graph State**:
   - Network topology and failure states are maintained in process memory.
   - Restarting the backend server resets the network to pristine status.
2. **Single-Tenant Simulator**:
   - If multiple browser tabs or clients connect to the same FastAPI instance, they share the same in-memory topology state. Mutations from one client immediately affect the shared graph.
3. **Thread Safety**:
   - Thread locking (`network_lock`) guards concurrent endpoint access in the backend, preventing race conditions during topology mutations.

---

## 4. Future Enhancements

- **BGP / SDN Integration**: Exporting calculated self-healing routes to Software-Defined Networking (SDN) controllers (such as OpenFlow / ONOS).
- **Dynamic Link Congestion**: Simulating dynamic traffic load spikes and queue buildup across links.
- **Deep Reinforcement Learning**: Training a PPO/DQN agent to dynamically balance link loads and avoid congestion hotspots over time.
- **Persistent Audit Logging**: Adding a lightweight SQLite or PostgreSQL database for durable historical failure tracking.
