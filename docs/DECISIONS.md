# Lyt: Architectural & Engineering Decisions Log (ADR)

This document records key technical, product, and AI decisions, their rationale, and alternatives considered.

---

## ADR 001: Architecture Boundary & Monorepo Structure
- **Date**: 2026-11-06
- **Decision**: Adopt a monorepo partitioned cleanly into:
  - `web/`: Next.js 14 App Router, Bun runtime, strict TypeScript.
  - `api/`: FastAPI asynchronous microservice for telemetry ingest, TimescaleDB persistence, and WebSocket broadcasting.
  - `ml/`: Model training, calibration, backtesting, and model cards.
  - `edge/`: Standalone Rust agent for on-premise gateway store-and-forward and offline inference.
  - `infra/`: Docker Compose configurations, Mosquitto broker setup, and GitHub Actions CI.
  - `docs/`: Source tracking (`SOURCES.md`), architecture decisions (`DECISIONS.md`), model cards (`MODEL_CARD.md`), and policy pitching (`PITCH.md`).
- **Rationale**: Isolates deployment artifacts while enabling unified types and shared simulation tools.

---

## ADR 002: Deterministic Monotonicity & Quantile Bounds in Forecaster
- **Date**: 2026-11-06
- **Decision**: Neural architecture decoder outputs median $m$, and non-negative offsets $\Delta_{10} = \text{softplus}(o_0)$, $\Delta_{90} = \text{softplus}(o_2)$.
  The outputs are stacked as:
  $$p_{10} = m - \text{softplus}(o_0)$$
  $$p_{50} = m$$
  $$p_{90} = m + \text{softplus}(o_2)$$
- **Rationale**: Eliminates quantile crossing violations that can corrupt downstream battery dispatch optimization.
- **Alternatives Considered**: Independent linear projection heads with post-hoc sorting (unstable for gradient optimization).

---

## ADR 003: Model Storage & Dynamic Hidden Dimension Serialization
- **Date**: 2026-11-06
- **Decision**: Save `hid` parameter alongside weights and calibration arrays in `Bundle.save()`. In `Bundle.load()`, extract `hid` (defaulting to 64 for backward compatibility) and explicitly specify `weights_only=False` to handle NumPy array payloads cleanly.
- **Rationale**: Fixes state dictionary shape mismatches when fine-tuning or loading heterogeneous checkpoint variations.

---

## ADR 004: Docker Volume Mount for Developer Agility
- **Date**: 2026-11-06
- **Decision**: Mount `./api:/srv` in `docker-compose.yml`.
- **Rationale**: Allows instant execution of test suites, migrations, and model scripts without needing a multi-minute Docker container rebuild on every code edit.

---

## ADR 005: Strict Secrets Isolation
- **Date**: 2026-11-06
- **Decision**: Create comprehensive root `.gitignore`, sample environment template `.env.example`, and local web environment `.env.local.example`. Never commit actual API keys or broker passwords.
- **Rationale**: Prevents accidental credential leaks and complies with open-source security best practices.

---

## ADR 006: Local Geographic Data Bundling
- **Date**: 2026-11-07
- **Decision**: Bundle Natural Earth 1:50m West African country boundaries locally (`public/data/west-africa.json`) and project using `d3-geo`.
- **Rationale**: Eliminates reliance on external map tile servers (Mapbox, OSM, Google Maps), allowing the Regional Atlas to operate with zero runtime API keys, low latency, and offline support.

---

## ADR 007: Client-Side What-If Dispatch Simulation
- **Date**: 2026-11-07
- **Decision**: Implement `simulateWhatIf` in TypeScript mirroring the physics baseline and conformal dispatch logic.
- **Rationale**: Provides instant (<16ms) interactive feedback for operators exploring storage expansions, load shifts, and dust soiling without requiring server roundtrips over spotty 2G connections.

---

## ADR 008: Non-Dismissible Native-Speaker Review Flagging
- **Date**: 2026-11-07
- **Decision**: All local language strings (Krio, Hausa, Portuguese) are flagged with an explicit `⚠️ Native Review Flag` warning banner until verified by certified native-speaker mini-grid operators.
- **Rationale**: Prevents accidental misinterpretation of critical electrical safety advice in multilingual operating environments.

---

## ADR 009: Convex Model Predictive Control (MPC) Decision Layer
- **Date**: 2026-11-07
- **Decision**: Formulate 24-hour mini-grid dispatch as a convex linear program solved via the HiGHS solver (`scipy.optimize.linprog`) over probabilistic quantiles ($p_{10}$ cautious scenario). Enforce a hard constraint reserving $\ge 3$ hours of critical load ($SoC_t \ge \text{critical\_reserve}$) at all hours.
- **Rationale**: Eliminates ad-hoc heuristic thresholds while guaranteeing that rural clinic cold-chain loads are mathematically protected even under worst-case weather scenarios.
- **Fallback**: Automatically falls back to deterministic physics rule set if optimizer experiences infeasibility or solver failure.

---

## ADR 010: Robust Residual Anomaly Detection
- **Date**: 2026-11-07
- **Decision**: Monitor inverter and array health by tracking residuals between metered telemetry and NOCT clear-sky physics models during sun hours ($GHI > 200\text{ W/m}^2$). Compute rolling median and Median Absolute Deviation (MAD) z-scores to flag string dropouts ($z < -3.2$) and inverter saturation clipping.
- **Rationale**: Provides early detection of electrical faults and harmattan dust accumulation without requiring heavy multi-gigabyte deep learning autoencoders on low-spec edge hardware.

---

## ADR 011: Strict Chronological Backtesting Protocol
- **Date**: 2026-11-07
- **Decision**: Evaluate all forecasting models using chronological time splits (70% train, 15% calibration, 15% test forward in time) and report Pinball loss, Continuous Ranked Probability Score (CRPS), and empirical coverage against persistence and physics-only baselines.
- **Rationale**: Prevents future-to-past temporal data contamination and ensures published model card metrics reflect true real-world forecasting skill.

---

## ADR 012: Comprehensive Native SVG Icon System
- **Date**: 2026-11-07
- **Decision**: Replace all raw platform-dependent unicode emojis with an inline 24px SVG icon library (`web/app/components/Icons.tsx`) styled with consistent 2px strokes and semantic tokens.
- **Rationale**: Guarantees visual consistency across desktop operating systems, low-cost Android smartphones, and sunlight-readable field displays without font-rendering discrepancies or visual degradation.

---

## ADR 013: Hybrid Offline Vector & Real-Time Geographic Terrain Mapping
- **Date**: 2026-11-07
- **Decision**: Architect `MapAtlas.tsx` with a triple-mode geographic visualization engine:
  1. *Living Vector Atlas*: D3-geo Natural Earth vectors with Harmattan dust particle flow, operating 100% offline with zero external runtime tile dependencies.
  2. *Topographic Terrain*: Elevation contours, highland massifs (Fouta Djallon, Jos Plateau), and animated river networks for the Niger, Senegal, Volta, and Benue basins.
  3. *Multispectral Satellite Layer*: True-color vegetation and Saharan sand gradients.
- **Rationale**: Provides high-resolution hydrological and topographical context for mini-grid flood planning while guaranteeing offline low-data operation.

---

## ADR 014: Standalone Rust Edge Agent with Store-and-Forward SQLite Buffer
- **Date**: 2026-11-07
- **Decision**: Build `edge/` (`lyt-edge`) in Rust using Tokio, Rumqttc, and bundled SQLite. Telemetry is committed to local SQLite before transmission; during network outages, readings queue safely and drain chronologically upon reconnect. Local rule-based physics dispatch operates autonomously with a hard 3-hour healthcare reserve constraint.
- **Rationale**: Meets the mission brief requirement for Raspberry Pi gateways surviving 30+ minute cellular dropouts without telemetry loss.


---

## ADR 015: Earth-Light Palette Harmonization & Systemic Visual Rhythm
- **Date**: 2026-11-07
- **Decision**: Fully orchestrate the visual design language using the warm Sahelian earth palette:
  - Deep Espresso (`#3B2F2A`) as the base foundation canvas and card surface foundation.
  - Golden Wheat / Sahara Sun (`#D7B38C`) for primary interactive accents, active navigation pills, and energy metrics.
  - Clay Bronze (`#8A6A4F`) for structural borders, muted tags, and secondary lines.
  - Sparse Obsidian (`#14110f`) strictly isolated to functional micro-wells: battery liquid reservoir floor, USSD feature phone screen interior, and backdrop blurs.
  - Sand Ivory (`#FAF3EB`) for high-contrast, WCAG AA compliant text and headings.
  - Terracotta Rust (`#D96B43`) dedicated exclusively to critical climate/storm warnings and healthcare battery reserve line.
  - Completely eliminate green and teal tones across all 7 views.
- **Header & Layout Architecture**:
  - Restructure global navigation with generous vertical breathing room (`22px 0 32px; margin-bottom: 44px`).
  - Standardize 8-10px optical gap between SVG icons and adjacent text labels.
  - Enforce `flex-shrink: 0` on all icons and unified 14px sizes in interactive buttons/pills to prevent density collapse on 1024-1366px viewports.
---

## ADR 016: Complete Elimination of Muted Earth Browns & Full Adoption of Homebrew Terminal Aesthetic
- **Date**: 2026-11-07
- **Decision**: Fully purge legacy low-contrast brown shades (`#3B2F2A`, `#8A6A4F`, `#483933`, `#2A201C`, `#D7B38C`, `#FAF3EB`) across all web interfaces (`/`, `/site`, `/planner`, `/community`, `/trust`, `/agent`). Adopt the clean **Homebrew Terminal** design system:
  - Deep Obsidian Carbon (`#0B0D13`) canvas and Terminal Slate (`#141824`, `#1B2234`) elevated cards.
  - Crisp Pure White (`#FFFFFF`, WCAG AAA) for primary text and metric titles.
  - Cool Slate (`#94A3B8`, WCAG AA) for secondary labels and metadata.
  - Brew Amber / Gold (`#F59E0B`) for primary interactive accents and solar resource highlights.
  - Terminal Emerald (`#10B981`) for battery health, grid-connected status, and success badges.
- **Rationale**: Eliminates muddy low-contrast readability issues and provides a sleek, futuristic developer and operator aesthetic.

---

## ADR 017: Expanded Geographic Map Container Viewport & Negative Space
- **Date**: 2026-11-07
- **Decision**: Enlarge the map SVG coordinate plane from 840x480 to 960x540 with generous padding `[32, 26]` around the West Africa landmass. Expand the layout grid `.atlas-grid` to `minmax(0, 1.35fr) minmax(380px, 440px)` with 36px gap and container `max-width: 1520px`. Topographic features scale proportionally using mathematical SVG group transforms.
- **Rationale**: Provides open negative space around coastal mini-grid hubs and gives the contextual 3-question hub sheet ample breathing room.

---

## ADR 018: In-Built Global Terminal AI Copilot Widget
- **Date**: 2026-11-07
- **Decision**: Integrate a persistent, global in-built assistant (`InBuiltAssistant.tsx`) mounted in `RootLayout`. Includes a floating Homebrew prompt pill (`>_lyt@copilot_`), keyboard shortcut `⌘K` / `Ctrl+K`, quick-action recipe chips (Solar Outlook, Clinic Cold Chain, Soiling Check, MPC Dispatch), and live connection to `/api/agent`.
- **Rationale**: Empowers field operators and planners to inspect mini-grid status, run dispatch, or verify clinic cold-chain safety from any page without navigating away.

---

## ADR 019: Rust Edge Agent Clippy & Dead Code Remediation
- **Date**: 2026-11-07
- **Decision**: Cleaned up all rustc and clippy warnings in `edge/` (`lyt-edge`). Added `#[cfg(test)]` to in-memory store initialization, annotated store-and-forward batch draining routines with `#[allow(dead_code)]` for asynchronous queue integration, and converted redundant `format!` string allocations to static string slices.
- **Rationale**: Enforces zero compiler warnings and maintains strict production safety across edge binaries.
