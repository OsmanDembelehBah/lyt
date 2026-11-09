#!/usr/bin/env bash
set -euo pipefail

echo "=== [1/5] Checking Web Types & Production Build ==="
cd web
bun run typecheck
bun run build
cd ..

echo "=== [2/5] Checking API, MPC & Anomaly Tests (28 Pytest Tests) ==="
docker compose exec -e PYTHONPATH=/srv api pytest tests/ -v

echo "=== [3/5] Checking Probabilistic Model Training Pipeline ==="
docker compose exec api python train.py --synthetic --epochs 4 --out /tmp/check_model.pt

echo "=== [4/5] Checking Chronological Benchmark Backtest ==="
docker compose exec -e PYTHONPATH=/srv api python /srv/tools/backtest.py --synthetic --epochs 3 --out /srv/docs/backtest_results.json

echo "=== [5/5] Checking Rust Edge Agent Store-and-Forward Tests ==="
cd edge
cargo test --quiet
cd ..

echo "=== All AI Depth, Web, Edge & Infrastructure Checks Passed Cleanly! ==="
