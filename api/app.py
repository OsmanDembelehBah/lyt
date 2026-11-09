"""Lyt API: HTTP + MQTT telemetry ingest -> TimescaleDB; live NWP weather; AI forecast + dispatch; WebSocket push."""
import asyncio, hashlib, hmac, json, logging, os, time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import asyncpg, httpx, aiomqtt
from fastapi import FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import physics, weather
try: import model as M
except ImportError: M = None                      # no torch -> physics baseline mode, still serves

log = logging.getLogger("lyt"); logging.basicConfig(level=logging.INFO)
sha = lambda k: hashlib.sha256(k.encode()).hexdigest()
ok = lambda k, h: hmac.compare_digest(sha(k or ""), h)
MODEL_DIR = os.getenv("MODEL_DIR", "/models")

SCHEMA = """
create table if not exists sites(id text primary key, name text, lat float, lon float, tz int default 0, kwp float,
  batt_kwh float, critical_kw float, peak_kw float, ingest_hash text, read_hash text);
create table if not exists telemetry(ts timestamptz not null, site_id text not null, pv_kw float, load_kw float, soc float);
create index if not exists tel_site_ts on telemetry(site_id, ts desc);
create table if not exists forecasts(ts timestamptz default now(), site_id text, payload jsonb);
create table if not exists audit(ts timestamptz default now(), site_id text, event text, detail text);
"""

class Reading(BaseModel):
    ts: float | None = None
    pv_kw: float = Field(ge=0, le=1000); load_kw: float = Field(ge=0, le=1000); soc: float = Field(ge=0, le=1)
class Batch(BaseModel): readings: list[Reading] = Field(min_length=1, max_length=500)

async def site(sid): return await app.state.pool.fetchrow("select * from sites where id=$1", sid)

async def store(sid, rs):
    now = time.time()
    await app.state.pool.executemany("insert into telemetry values($1,$2,$3,$4,$5)",
        [(datetime.fromtimestamp(min(r.ts or now, now + 60), timezone.utc), sid, r.pv_kw, r.load_kw, r.soc) for r in rs])

async def push(sid, msg):
    for w in list(app.state.subs.get(sid, ())):
        try: await w.send_json(msg)
        except Exception: app.state.subs[sid].discard(w)

async def mqtt_loop(app):
    """Devices publish JSON to lyt/<site>/telemetry: {"key":"...","pv_kw":3.2,"load_kw":1.1,"soc":0.62,"ts":<epoch s, optional>}"""
    while True:
        try:
            async with aiomqtt.Client(os.getenv("MQTT_HOST", "mosquitto"), username=os.getenv("MQTT_USER"), password=os.getenv("MQTT_PASS")) as c:
                await c.subscribe("lyt/+/telemetry")
                async for m in c.messages:
                    try:
                        sid = str(m.topic).split("/")[1]; d = json.loads(m.payload); s = await site(sid)
                        if not s or not ok(d.pop("key", ""), s["ingest_hash"]): continue
                        r = Reading(**d); await store(sid, [r]); await push(sid, {"type": "reading", **r.model_dump()})
                    except Exception as e: log.warning("bad mqtt message: %s", e)
        except Exception as e: log.error("mqtt: %s; retrying", e); await asyncio.sleep(5)

async def weather_loop(app):
    async with httpx.AsyncClient(timeout=30) as hc:
        while True:
            for s in await app.state.pool.fetch("select * from sites"):
                try: app.state.wx[s["id"]] = await weather.forecast(s["lat"], s["lon"], hc); app.state.wxts[s["id"]] = time.time()
                except Exception as e: log.warning("weather %s: %s", s["id"], e)
            await asyncio.sleep(1800)

async def telemetry_hourly(sid):
    rows = await app.state.pool.fetch("""select (extract(epoch from date_trunc('hour',ts))/3600)::bigint h, avg(pv_kw) pv, avg(load_kw) ld
        from telemetry where site_id=$1 and ts>now()-interval '14 days' group by 1""", sid)
    return {int(r["h"]): (r["pv"], r["ld"]) for r in rows}

async def forecast_loop(app):
    await asyncio.sleep(3)
    while True:
        for s in await app.state.pool.fetch("select * from sites"):
            sid, wx = s["id"], app.state.wx.get(s["id"])
            if not wx: continue
            try:
                tel = await telemetry_hourly(sid)
                soc = await app.state.pool.fetchval("select soc from telemetry where site_id=$1 order by ts desc limit 1", sid)
                cfg = {k: s[k] for k in ("kwp", "peak_kw", "batt_kwh", "critical_kw", "tz")}
                mdl = app.state.models.get(sid) or app.state.default
                out = await asyncio.to_thread(physics.forecast, cfg, tel, wx, mdl, int(time.time() // 3600), .5 if soc is None else soc)
                out.update(generated=time.time(), weather_age_s=int(time.time() - app.state.wxts[sid]), site=sid)
                app.state.last[sid] = out
                await app.state.pool.execute("insert into forecasts(site_id,payload) values($1,$2)", sid, json.dumps(out))
                await push(sid, {"type": "forecast", **out})
            except Exception: log.exception("forecast %s", sid)
        await asyncio.sleep(300)

async def retrain_loop(app):
    """Daily: adapt the global model to each site's own telemetry (needs >= ~10 clean days)."""
    while M:
        await asyncio.sleep(86400)
        for s in await app.state.pool.fetch("select * from sites"):
            try:
                sid, wx = s["id"], app.state.wx.get(s["id"]); base = app.state.models.get(sid) or app.state.default
                if not wx or base is None: continue
                cfg = {k: s[k] for k in ("kwp", "peak_kw", "batt_kwh", "critical_kw", "tz")}
                nb = await asyncio.to_thread(M.finetune, base, cfg, await telemetry_hourly(sid), wx)
                if nb: nb.save(f"{MODEL_DIR}/{sid}.pt"); app.state.models[sid] = nb; await app.state.pool.execute("insert into audit(site_id,event) values($1,'model_finetuned')", sid)
            except Exception: log.exception("retrain %s", s["id"])

@asynccontextmanager
async def lifespan(app):
    app.state.pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=8)
    async with app.state.pool.acquire() as c:
        await c.execute(SCHEMA)
        try: await c.execute("select create_hypertable('telemetry','ts',if_not_exists=>true)")
        except Exception: log.info("TimescaleDB extension not available; using plain Postgres")
        if not await c.fetchval("select count(*) from sites"):
            await c.execute("insert into sites(id,name,lat,lon,tz,kwp,batt_kwh,critical_kw,peak_kw,ingest_hash,read_hash) values('demo','Demo mini-grid, Freetown',8.48,-13.23,0,18,40,2.5,6,$1,$2)",
                            sha(os.environ["DEMO_INGEST_KEY"]), sha(os.environ["DEMO_READ_KEY"]))
    app.state.subs, app.state.wx, app.state.wxts, app.state.last, app.state.models = {}, {}, {}, {}, {}
    app.state.default = M.Bundle.load(f"{MODEL_DIR}/global.pt") if M else None
    log.info("model: %s", "loaded" if app.state.default else "none (physics baseline)")
    ts = [asyncio.create_task(f(app)) for f in (mqtt_loop, weather_loop, forecast_loop, retrain_loop)]
    yield
    for t in ts: t.cancel()
    await app.state.pool.close()

app = FastAPI(title="Lyt", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","), allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    await app.state.pool.fetchval("select 1"); return {"ok": True, "model": app.state.default is not None, "sites_forecasting": list(app.state.last)}

@app.post("/v1/sites/{sid}/ingest")
async def ingest(sid: str, b: Batch, x_ingest_key: str = Header("")):
    s = await site(sid)
    if not s or not ok(x_ingest_key, s["ingest_hash"]): raise HTTPException(401, "invalid site or key")
    await store(sid, b.readings); await push(sid, {"type": "reading", **b.readings[-1].model_dump()}); return {"stored": len(b.readings)}

@app.get("/v1/sites/{sid}/state")
async def state(sid: str, x_read_key: str = Header("")):
    s = await site(sid)
    if not s or not ok(x_read_key, s["read_hash"]): raise HTTPException(401, "invalid site or key")
    if sid not in app.state.last: raise HTTPException(503, "first forecast not ready yet")
    return app.state.last[sid]

@app.websocket("/v1/sites/{sid}/live")
async def live(ws: WebSocket, sid: str, key: str = Query("")):
    s = await site(sid)
    if not s or not ok(key, s["read_hash"]): await ws.close(4401); return
    await ws.accept(); app.state.subs.setdefault(sid, set()).add(ws)
    if sid in app.state.last: await ws.send_json({"type": "forecast", **app.state.last[sid]})
    try:
        while True: await ws.receive_text()
    except WebSocketDisconnect: pass
    finally: app.state.subs[sid].discard(ws)
