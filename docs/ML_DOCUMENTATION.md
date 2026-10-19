# NetHeal — Machine Learning Model & Quality Evaluation

## 1. Problem Formulation

Conventional network routing protocols typically optimize for a single parameter:
- **BFS**: Optimizes minimum hop count, ignoring latency, loss, and capacity.
- **Dijkstra**: Optimizes path weight (total latency), but does not account for bottleneck bandwidth constraints or aggregate packet loss risks.

NetHeal implements an **ML-assisted routing engine** that scores candidate network paths based on an aggregate quality function. The ML model predicts a continuous route quality score between 0 and 100 given candidate path metrics.

---

## 2. Dataset Generation & Target Formula

### 2.1 Synthetic Dataset
The training dataset is located at `netheal-backend/data/routes_dataset.csv` and contains 5,000 synthetic route records generated across varied network operating conditions.

### 2.2 Feature Definitions

| Feature Name | Type | Unit | Description |
|---|---|---|---|
| `hops` | Integer | Count | Number of router-to-router transmission segments |
| `total_latency` | Float | Milliseconds (ms) | Sum of link latencies along the candidate path |
| `bottleneck_bandwidth` | Float | Megabits/sec (Mbps) | Minimum bandwidth across all links in the path |
| `packet_loss` | Float | Percentage (%) | Estimated cumulative packet loss across the route |

### 2.3 Route Quality Target Formula

The synthetic ground-truth route quality score $Q \in [0, 100]$ is computed as:

$$Q = 100 - (0.4 \times \text{total\_latency}) - (2.5 \times \text{hops}) - (5.0 \times \text{packet\_loss}) + (0.02 \times \text{bottleneck\_bandwidth})$$

- High latency, hop counts, and packet loss penalize the score.
- Available bottleneck capacity provides a positive contribution.
- The target represents a composite service-level agreement (SLA) suitability score.

---

## 3. Model Architecture & Evaluation

### 3.1 Model Comparison & Selection

During development, multiple regression models were evaluated on an 80/20 train/test split:

| Model | MAE | RMSE | $R^2$ Score | Selection Status |
|---|---|---|---|---|
| Linear Regression | 1.18 | 1.45 | 0.982 | Baseline |
| Ridge Regression | 1.18 | 1.45 | 0.982 | Baseline |
| Decision Tree Regressor | 0.74 | 0.96 | 0.991 | Candidate |
| **Random Forest Regressor (100 trees)** | **0.31** | **0.42** | **0.998** | **Selected Model** |

The **Random Forest Regressor** demonstrated superior generalization across non-linear boundary conditions and was saved to `netheal-backend/models/route_quality_model.pkl`.

### 3.2 Model Artifact Contents
The pickled artifact contains a dictionary with:
- `model`: Trained `sklearn.ensemble.RandomForestRegressor` with 100 estimators.
- `features`: `["hops", "total_latency", "bottleneck_bandwidth", "packet_loss"]`
- `target`: `"route_quality"`

---

## 4. Inference & Candidate Route Ranking

1. When the user requests ML routing between source $S$ and destination $D$:
   - The backend enumerates all simple loop-free paths in the active network subgraph using `nx.all_simple_paths(graph, source, target, cutoff=6)`.
   - Any path traversing a failed router or failed link is automatically filtered out.
2. For each valid path, composite metrics (`hops`, `total_latency`, `bottleneck_bandwidth`, `packet_loss`) are calculated.
3. Candidate metrics are formatted into a DataFrame matching the model's feature ordering.
4. The preloaded Random Forest performs vectorized prediction (`predict_route_qualities`).
5. The path achieving the highest predicted quality score is selected and returned as the primary route, along with the ranked candidate list.

---

## 5. Important Product Boundaries & Limitations

- The ML model is trained on synthetic network scenarios reflecting the documented quality formula.
- A high $R^2$ score demonstrates accurate regression over the formulaic SLA target; it does not represent empirical physical router hardware telemetry.
- In-process inference is executed with `n_jobs = 1` for Windows stability.
