"""Bootstrap training. Real weather history (Open-Meteo reanalysis) + physics-derived PV + village load profile.
This gives a *prior*; per-site fine-tuning on real meter data (app.py retrain loop) is what makes it accurate.
  python train.py --lat 8.48 --lon -13.23 --years 3 --out /models/global.pt        (needs internet)
  python train.py --synthetic --out /tmp/global.pt                                   (offline smoke test)"""
import argparse, datetime as dt, numpy as np, torch
import model as M, weather
from physics import phys_pv, PROFILE

CFG = dict(kwp=18., peak_kw=6., batt_kwh=40., critical_kw=2.5, tz=0)

def synth_weather(days, seed=0):
    r = np.random.default_rng(seed); out = {}
    for t in range(days * 24):
        h, d = t % 24, t / 24; clear = max(0., np.sin(np.pi * (h - 6) / 12)); dust = max(0., np.cos(2 * np.pi * (d - 15) / 365))
        cloud = float(np.clip(.7 + .25 * np.sin(d * 2.1) + r.normal(0, .15), .05, 1))
        out[t] = (1000 * clear * (1 - cloud * .75) * (1 - .25 * dust), cloud * 100, 27 + 8 * clear, max(0., .6 - cloud) * 12 * (1 - dust) * float(r.random() < .5))
    return out

def targets(wx, seed=1):
    r = np.random.default_rng(seed); tel = {}; fac = {}
    for t in sorted(wx):
        g, c, tmp, _ = wx[t]; day = t // 24; fac.setdefault(day, r.uniform(.85, 1.))        # slow dust loss, reset by rain/cleaning
        pv = float(phys_pv(np.float64(g), np.float64(tmp), CFG["kwp"])) * fac[day] * (1 + r.normal(0, .04))
        ld = PROFILE[t % 24] * CFG["peak_kw"] * .6 * (1 + r.normal(0, .12))
        tel[t] = (max(0., pv), max(0., ld))
    return tel

if __name__ == "__main__":
    a = argparse.ArgumentParser(); a.add_argument("--synthetic", action="store_true"); a.add_argument("--lat", type=float, default=8.48)
    a.add_argument("--lon", type=float, default=-13.23); a.add_argument("--years", type=int, default=3); a.add_argument("--epochs", type=int, default=12)
    a.add_argument("--out", default="/models/global.pt"); a = a.parse_args()
    if a.synthetic: wx = synth_weather(300)
    else:
        end = dt.date.today() - dt.timedelta(days=7); wx = weather.archive(a.lat, a.lon, str(end - dt.timedelta(days=365 * a.years)), str(end))
    P, Fu, Y = M.windows(CFG, targets(wx), wx, stride=2, min_real=1.)
    n1, n2 = int(.7 * len(P)), int(.85 * len(P))                  # chronological train | calibrate | test
    net = M.fit(M.Net(), P[:n1], Fu[:n1], Y[:n1], a.epochs, 2e-3)
    b = M.Bundle(net, M.calibrate(net, P[n1:n2], Fu[n1:n2], Y[n1:n2]))
    print(f"test pinball {M.pinball(net(P[n2:], Fu[n2:]), Y[n2:]).item():.4f} | 80% interval coverage {M.coverage(b, P[n2:], Fu[n2:], Y[n2:]):.3f} (target 0.80)")
    b.save(a.out); print("saved", a.out)
