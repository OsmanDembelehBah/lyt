import os
import tempfile
import numpy as np
import torch
import pytest
from model import Net, pinball, Bundle, windows, calibrate, coverage, finetune
from physics import PAST, H

def test_net_shapes_and_monotonicity():
    net = Net(hid=32)
    B = 4
    past = torch.randn(B, PAST, 7)
    fut = torch.randn(B, H, 6)
    
    out = net(past, fut)
    assert out.shape == (B, H, 2, 3)
    
    # Check monotonicity across all batches, forecast horizons, and target series (PV, Load)
    p10 = out[..., 0]
    p50 = out[..., 1]
    p90 = out[..., 2]
    
    assert torch.all(p10 <= p50), "p10 must be <= p50"
    assert torch.all(p50 <= p90), "p50 must be <= p90"

def test_pinball_loss():
    # Targets
    y = torch.tensor([[1.0, 2.0]])
    # Perfect predictions at all quantiles
    pred_exact = torch.stack([y, y, y], dim=-1)
    loss_exact = pinball(pred_exact, y)
    assert loss_exact.item() == 0.0

    # Overprediction
    pred_high = pred_exact + 1.0
    loss_high = pinball(pred_high, y)
    assert loss_high.item() > 0.0

    # Underprediction
    pred_low = pred_exact - 1.0
    loss_low = pinball(pred_low, y)
    assert loss_low.item() > 0.0

def test_bundle_save_load_and_predict():
    net = Net(hid=16)
    cal = np.array([0.05, 0.08], dtype=np.float32)
    b = Bundle(net, cal)
    
    past = np.random.randn(PAST, 7).astype(np.float32)
    fut = np.random.randn(H, 6).astype(np.float32)
    
    pred = b.predict(past, fut)
    assert pred.shape == (H, 2, 3)
    assert np.all(pred >= 0.0)  # Clipped at 0

    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "model.pt")
        b.save(path)
        assert os.path.exists(path)
        
        loaded = Bundle.load(path)
        assert loaded is not None
        assert np.allclose(loaded.cal, cal)
        
        pred_loaded = loaded.predict(past, fut)
        assert np.allclose(pred, pred_loaded, atol=1e-5)

        # TorchScript export test
        ts_path = os.path.join(tmpdir, "model_edge.pt")
        b.export_torchscript(ts_path)
        assert os.path.exists(ts_path)
        ts_loaded = torch.jit.load(ts_path)
        p_t = torch.tensor(past)[None]
        f_t = torch.tensor(fut)[None]
        ts_out = ts_loaded(p_t, f_t)
        assert ts_out.shape == (1, H, 2, 3)

def test_calibrate_and_coverage():
    net = Net(hid=16)
    N = 50
    P = torch.randn(N, PAST, 7)
    Fu = torch.randn(N, H, 6)
    Y = torch.rand(N, H, 2)
    
    cal = calibrate(net, P, Fu, Y, alpha=0.2)
    assert cal.shape == (2,)
    
    bundle = Bundle(net, cal)
    cov = coverage(bundle, P, Fu, Y)
    assert 0.0 <= cov <= 1.0

def test_finetune_requires_sufficient_data():
    net = Net(hid=16)
    cal = np.array([0.05, 0.05], dtype=np.float32)
    bundle = Bundle(net, cal)
    cfg = dict(kwp=18.0, peak_kw=6.0, batt_kwh=40.0, critical_kw=2.5, tz=0)
    
    # Empty or small telemetry should return None
    tel = {h: (2.0, 1.0) for h in range(50)}
    wx = {h: (500.0, 10.0, 25.0, 0.0) for h in range(100)}
    res = finetune(bundle, cfg, tel, wx)
    assert res is None
