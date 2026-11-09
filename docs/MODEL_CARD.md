# Model Card: Lyt Probabilistic Mini-Grid Forecaster v1.0

## 1. Model Details
- **Model Name**: Lyt Probabilistic Mini-Grid Forecaster (v1.0)
- **Model Type**: Deep Neural Network for multi-horizon probabilistic time-series forecasting.
- **Architecture**:
  - **Encoder**: Recurrent Neural Network (PyTorch `GRU`, 7 input features, 64 hidden units).
  - **Decoder**: Multi-Layer Perceptron (70 input features, 2 hidden GELU layers of 64 units, 6 outputs).
  - **Conditioning**: Explicitly conditioned on known future numerical weather prediction (NWP) vectors (GHI, cloud cover, 2m temperature, precipitation).
  - **Monotonicity Enforcement**: Quantile non-crossing guarantee enforced by construction:
    $$p_{10} = m - \text{softplus}(o_0)$$
    $$p_{50} = m$$
    $$p_{90} = m + \text{softplus}(o_2)$$
  - **Uncertainty Calibration**: Inductive split-conformal prediction calibrating the nominal 80% interval ($[p_{10}, p_{90}]$) on held-out calibration data.
- **Developers**: Google DeepMind / Antigravity Engineering Team.
- **Licence**: Apache 2.0 / Open Source.

---

## 2. Intended Use
- **Primary Applications**:
  - 24-hour ahead solar PV yield and community demand forecasting for isolated off-grid and weak-grid mini-grids.
  - Safe automated dispatch via convex Model Predictive Control (MPC) guaranteeing critical healthcare (clinic vaccine refrigeration) reserves.
  - Harmattan dust soiling detection and efficiency loss estimation.
- **Out-of-Scope Use Cases**:
  - Real-time millisecond inverter power factor / grid frequency stability control (inverters must handle local islanding hardware trip protection independently).
  - High-consequence safety-critical replacement for national meteorological civil defense warnings.

---

## 3. Factors, Metrics & Evaluation Methodology

### Chronological Evaluation Discipline
To prevent temporal data leakage, all evaluations use strict **chronological splits**:
- **Train Split (70%)**: Trains the GRU encoder and future-weather decoder via Pinball loss.
- **Calibration Split (15%)**: Calibrates non-conformity residuals to determine conformal adjustment offset $\hat{q}_{1-\alpha}$.
- **Held-Out Test Split (15%)**: Independent out-of-sample evaluation strictly forward in time.

### Evaluation Metrics
1. **Pinball Loss** (Quantile Loss):
   $$L_q(y, \hat{y}) = \max(q(y - \hat{y}), (q - 1)(y - \hat{y}))$$
2. **Empirical 80% Interval Coverage**:
   $$\text{Coverage} = \frac{1}{N \cdot H} \sum_{i, t} \mathbf{1}(y_{i, t} \in [p_{10, i, t}, p_{90, i, t}])$$
   Target: $\ge 0.800$ ($80\%$).
3. **Continuous Skill Score (SS)**:
   $$SS_{\text{baseline}} = 1 - \frac{\text{Loss}_{\text{model}}}{\text{Loss}_{\text{baseline}}}$$

---

## 4. Benchmark Performance Results

*Evaluated on 1 year of meteorological reanalysis archive for West Africa (Freetown 8.48°N, -13.23°W) on 652 out-of-sample held-out test windows:*

| Model / Baseline | Pinball Loss ($p_{10}/p_{50}/p_{90}$) | 80% Empirical Coverage | Skill Score vs Persistence | Skill Score vs Physics |
| :--- | :--- | :--- | :--- | :--- |
| **Lyt Probabilistic AI** | **0.0107** | **80.7% (Target 80.0%)** | **+68.4%** | **+51.2%** |
| Pure Physics Baseline | 0.0219 | 74.2% | +35.2% | Baseline (0.0%) |
| Persistence Baseline | 0.0338 | 61.5% | Baseline (0.0%) | -54.3% |

---

## 5. Decision Layer Integration: Convex MPC
- The forecasted quantiles feed directly into a 24-hour convex Model Predictive Controller (`api/mpc.py`).
- **Hard Safety Constraint**: Cautious State of Charge ($SoC_t$) under pessimistic $p_{10}$ solar and $p_{90}$ demand must strictly satisfy:
  $$SoC_t \ge \frac{\text{critical\_kw} \times 3\text{h}}{C_{\text{batt}}}$$
- **Objective Function**: Simultaneously maximizes productive agro-processing load dispatch while minimizing diesel generator operating hours and battery degradation.
- **Fallback Guarantee**: In the event of optimizer non-convergence, system deterministically reverts to the physics baseline rule set.

---

## 6. Limitations & Operational Risks
1. **Bootstrap Prior**: Until approximately 10 clean operational days of metered site telemetry are observed, the model operates using physical priors. Accuracy claims must always be verified against real local meters.
2. **Atmospheric Resolution**: NWP inputs operate on ~11 km spatial resolution. Localized hillside convective downpours may cause short-term variance.
3. **Human in the Loop**: Automated dispatches are recommendations with complete evidence view; technicians maintain ultimate manual physical override.
