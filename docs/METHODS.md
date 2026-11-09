# Lyt: Scientific Methodology & Mathematical Formulations

This document provides complete mathematical formulations and engineering principles for all analytical modules in Lyt.

---

## 1. Physics PV Generation Model (NOCT & Temperature Derating)

Solar photovoltaic power output is calculated using the Nominal Operating Cell Temperature (NOCT) model and crystalline silicon thermal derating:

$$T_{\text{cell}} = T_{\text{ambient}} + \left( \frac{\text{NOCT} - 20}{800} \right) \cdot \text{GHI}$$

Where:
- $\text{NOCT} = 45^\circ\text{C}$ (Standard open-rack mini-grid value).
- $\text{GHI}$: Global Horizontal Irradiance in $\text{W/m}^2$.

The temperature-derated PV output is:

$$P_{\text{PV}} = P_{\text{rated}} \cdot \left( \frac{\text{GHI}}{1000} \right) \cdot \left[ 1 + \gamma_{\text{temp}} \cdot (T_{\text{cell}} - 25^\circ\text{C}) \right] \cdot \eta_{\text{PR}}$$

Where:
- $\gamma_{\text{temp}} = -0.004\text{ / }^\circ\text{C}$ ($-0.4\%\text{ / }^\circ\text{C}$ silicon derating factor).
- $\eta_{\text{PR}} = 0.80$ (Nominal Performance Ratio incorporating cabling, dust, and inverter losses).

---

## 2. Probabilistic Neural Forecaster Architecture

The forecaster operates over a 48-hour historical lookback and produces multi-horizon forecasts over a 24-hour forward horizon ($H = 24$):

### Neural Architecture
1. **Recurrent Encoder**:
   - Gated Recurrent Unit ($\text{GRU}$) over 48 hours of historical readings:
     $$h_t = \text{GRU}(x_t, h_{t-1}), \quad h_t \in \mathbb{R}^{64}$$
   - Features: Normalized PV ($\text{kW}/\text{kWp}$), load ($\text{kW}/\text{peak\_kW}$), ambient temperature, GHI, precipitation, and diurnal harmonics ($\sin(2\pi h / 24), \cos(2\pi h / 24)$).

2. **Future Weather Conditioning & Monotonic MLP Decoder**:
   - Future numerical weather prediction vectors (NWP) for hours $t+1 \dots t+24$ are concatenated with the encoder state $h_{48}$.
   - Non-crossing quantile guarantees are enforced by construction:
     $$p_{50} = m$$
     $$p_{10} = m - \text{softplus}(o_0)$$
     $$p_{90} = m + \text{softplus}(o_2)$$
   - Prevents quantile inversion errors ($p_{10} \le p_{50} \le p_{90}$ is mathematically guaranteed).

3. **Loss Function (Pinball Loss)**:
   $$\mathcal{L}_{\text{Pinball}}(y, \hat{y}_\tau) = \frac{1}{N} \sum_{i=1}^N \max\left( \tau (y_i - \hat{y}_\tau), (\tau - 1)(y_i - \hat{y}_\tau) \right)$$
   Evaluated over $\tau \in \{0.10, 0.50, 0.90\}$.

---

## 3. Split-Conformal Calibration & Empirical Coverage

To guarantee calibrated predictive coverage without distributional assumptions, we apply split-conformal calibration on a held-out calibration split ($D_{\text{cal}}$):

1. Non-conformity score for the nominal $80\%$ interval $[p_{10}, p_{90}]$:
   $$s_i = \max(p_{10, i} - y_i, y_i - p_{90, i})$$

2. The conformal adjustment offset $\hat{q}_{1-\alpha}$ (with $\alpha = 0.20$) is the $(1 - \alpha)(1 + 1/|D_{\text{cal}}|)$-th empirical quantile of $\{s_i\}_{i=1}^{|D_{\text{cal}}|}$.

3. Calibrated interval:
   $$I_{\text{cal}}(x) = [p_{10}(x) - \hat{q}_{1-\alpha}, \; p_{90}(x) + \hat{q}_{1-\alpha}]$$

---

## 4. Convex Model Predictive Control (MPC) Decision Layer

The automated 24-hour battery scheduling problem is formulated as a convex Linear Program:

$$\min \sum_{t=1}^{24} \left[ c_{\text{shed}} \cdot \text{shed}_t - c_{\text{prod}} \cdot \text{prod}_t + c_{\text{batt}} \cdot (P_{\text{ch}, t} + P_{\text{dis}, t}) \right]$$

Subject to:
1. **Energy Balance**:
   $$\text{SoC}_{t} = \text{SoC}_{t-1} + \frac{\eta_{\text{ch}} P_{\text{ch}, t} - \frac{1}{\eta_{\text{dis}}} P_{\text{dis}, t}}{E_{\text{batt}}}$$
2. **Hard Critical Reserve Constraint**:
   $$\text{SoC}_t \ge \frac{3.0 \text{ h} \times P_{\text{critical}}}{E_{\text{batt}}}, \quad \forall t \in \{1 \dots 24\}$$
3. **Power Inverter & Flow Limits**:
   $$0 \le P_{\text{ch}, t} \le P_{\text{inverter, max}}$$
   $$0 \le P_{\text{dis}, t} \le P_{\text{inverter, max}}$$
   $$0 \le \text{prod}_t \le P_{\text{prod, max}}$$

Solved via the HiGHS simplex/interior-point solver in under 15 ms.

---

## 5. Anomaly & Dust Soiling Detection (Robust Residual Analysis)

To identify Harmattan dust accumulation and inverter degradation without deep autoencoders on edge hardware:

1. **Clear-Sky Performance Ratio (PR)**:
   $$\text{PR}_t = \frac{P_{\text{metered}, t}}{P_{\text{clear-sky NOCT}, t}}, \quad \forall t \text{ with } \text{GHI}_t > 200 \text{ W/m}^2$$

2. **Rolling Median & Median Absolute Deviation (MAD)**:
   $$\text{MAD} = \text{median}(|\text{PR}_t - \text{median}(\text{PR})|)$$
   $$z_t = \frac{\text{PR}_t - \text{median}(\text{PR})}{1.4826 \times \text{MAD}}$$

3. **Cleaning Trigger**:
   If rolling 3-day median PR is $> 8\%$ below nominal benchmark, a dust cleaning recommendation is issued with estimated kWh generation recovery.
