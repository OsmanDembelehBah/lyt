"""PyTorch forecaster: GRU encoder over history + MLP decoder over *known future weather*; p10/p50/p90 for PV and load;
split-conformal calibration; per-site fine-tuning on real telemetry."""
import copy, os, numpy as np, torch, torch.nn as nn, torch.nn.functional as F
from physics import PAST, H, prep

Q = torch.tensor([.1, .5, .9])

class Net(nn.Module):
    def __init__(s, hid=64):
        super().__init__(); s.hid = hid; s.enc = nn.GRU(7, hid, batch_first=True)
        s.dec = nn.Sequential(nn.Linear(hid + 6, hid), nn.GELU(), nn.Linear(hid, hid), nn.GELU(), nn.Linear(hid, 6))
    def forward(s, past, fut):                       # (B,PAST,7), (B,H,6) -> (B,H,2,3)
        _, h = s.enc(past); h = h[-1].unsqueeze(1).expand(-1, fut.size(1), -1)
        o = s.dec(torch.cat([h, fut], -1)).view(past.size(0), fut.size(1), 2, 3); m = o[..., 1]
        return torch.stack([m - F.softplus(o[..., 0]), m, m + F.softplus(o[..., 2])], -1)   # quantiles cannot cross

def pinball(p, y):
    e = y.unsqueeze(-1) - p; return torch.maximum(Q * e, (Q - 1) * e).mean()

class Bundle:
    def __init__(s, net, cal): s.net, s.cal = net.eval(), np.asarray(cal, "f4")
    @staticmethod
    def load(path):
        if not os.path.exists(path): return None
        d = torch.load(path, map_location="cpu", weights_only=False)
        hid = d.get("hid", 64)
        n = Net(hid=hid); n.load_state_dict(d["net"]); return Bundle(n, d["cal"])
    def save(s, path): os.makedirs(os.path.dirname(path) or ".", exist_ok=True); torch.save({"net": s.net.state_dict(), "cal": s.cal, "hid": getattr(s.net, "hid", 64)}, path)
    def export_torchscript(s, path):
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        sample_past = torch.randn(1, PAST, 7)
        sample_fut = torch.randn(1, H, 6)
        traced = torch.jit.trace(s.net, (sample_past, sample_fut))
        torch.jit.save(traced, path)
        return path
    @torch.no_grad()
    def predict(s, past, fut):
        q = s.net(torch.tensor(past)[None], torch.tensor(fut)[None])[0].numpy().copy()
        q[..., 0] -= s.cal; q[..., 2] += s.cal                    # conformal widening, shape (2,) over (H,2)
        return np.clip(q, 0, None)

def windows(cfg, tel, wx, stride=1, min_real=.9):
    P, Fu, Y = [], [], []
    for now in range(min(tel) + PAST, max(tel) - H, stride):
        fh = range(now + 1, now + H + 1)
        if not all(h in tel for h in fh): continue
        p, f, real, _, _ = prep(cfg, tel, wx, now)
        if real < min_real: continue
        P.append(p); Fu.append(f); Y.append([[tel[h][0] / cfg["kwp"], tel[h][1] / cfg["peak_kw"]] for h in fh])
    return tuple(torch.tensor(np.array(a), dtype=torch.float32) for a in (P, Fu, Y)) if P else None

def fit(net, P, Fu, Y, epochs, lr):
    opt = torch.optim.AdamW(net.parameters(), lr); net.train()
    for _ in range(epochs):
        for b in torch.randperm(len(P)).split(64):
            opt.zero_grad(); pinball(net(P[b], Fu[b]), Y[b]).backward(); opt.step()
    return net.eval()

@torch.no_grad()
def calibrate(net, P, Fu, Y, alpha=.2):
    q = net(P, Fu); s = torch.maximum(q[..., 0] - Y, Y - q[..., 2]); lvl = min(1., (1 - alpha) * (1 + 1 / len(P)))
    return torch.stack([torch.quantile(s[..., k].flatten(), lvl) for k in range(2)]).numpy()

def coverage(b, P, Fu, Y):
    with torch.no_grad(): q = b.net(P, Fu)
    lo, hi = q[..., 0] - torch.tensor(b.cal), q[..., 2] + torch.tensor(b.cal)
    return float(((Y >= lo) & (Y <= hi)).float().mean())

def finetune(b, cfg, tel, wx, epochs=8):
    """Adapt a bundle to one site's real telemetry. Returns None until there is enough clean data."""
    w = windows(cfg, tel, wx)
    if w is None or len(w[0]) < 80: return None
    P, Fu, Y = w; n = int(.8 * len(P)); net = fit(copy.deepcopy(b.net), P[:n], Fu[:n], Y[:n], epochs, 1e-4)
    return Bundle(net, calibrate(net, P[n:], Fu[n:], Y[n:]) if len(P) - n >= 20 else b.cal)
