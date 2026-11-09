# Lyt: Mini-Grid Operator Onboarding & Edge Gateway Installation Guide

This guide describes how to deploy Lyt on an existing off-grid mini-grid site within 60 minutes.

---

## 1. Prerequisites & Equipment
- **Mini-Grid Inverter / Data Logger**: Modbus RTU / TCP (Schneider Conext, Victron Venus GX, SMA Sunny Island, or Deye/Sunsynk).
- **Edge Gateway Hardware**: Raspberry Pi 4 / Compute Module 4 (or any Linux ARM/x86 gateway with $\ge 1\text{ GB RAM}$).
- **Connectivity**: 2G/3G/4G cellular modem or local Wi-Fi link.
- **Access Credentials**: Ingestion API Key and Read Key provisioned from Lyt Admin.

---

## 2. Step-by-Step Installation

### Step 1: Install the Standalone Rust Edge Agent
```bash
# On the Raspberry Pi gateway
curl -sSL https://get.lyt.energy/install.sh | bash

# Or build from source
git clone https://github.com/lyt-energy/lyt.git
cd lyt/edge
cargo build --release
sudo cp target/release/lyt-edge /usr/local/bin/
```

### Step 2: Configure Site Environment
Create `/etc/lyt/edge.env`:
```env
SITE_ID=kabala-01
SITE_NAME="Kabala Rural Health Hub"
EDGE_DB_PATH=/var/lib/lyt/edge_buffer.db
MQTT_HOST=cloud.lyt.energy
MQTT_PORT=8883
MQTT_USER=kabala-01
MQTT_PASS=xxxxxxxxxxxxxxxxxxxxxxxx
INGEST_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
READ_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
CRITICAL_KW=3.0
BATTERY_KWH=45.0
KWP=20.0
```

### Step 3: Enable the Gateway Systemd Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lyt-edge
sudo systemctl status lyt-edge
```

---

## 3. Telemetry Verification & Ingest Schema
The gateway publishes telemetry every 60 seconds to `lyt/<site_id>/telemetry`:
```json
{
  "key": "sha256_ingest_key",
  "pv_kw": 8.42,
  "load_kw": 2.15,
  "soc": 0.84,
  "ts": 1731000000
}
```

### Verification Checklist:
1. [ ] Gateway buffers data in SQLite when cellular antenna is disconnected.
2. [ ] Upon reconnection, SQLite queue drains without dropping any rows.
3. [ ] Cloud dashboard (`/site?id=kabala-01`) reflects live battery tide and 24h timeline.
4. [ ] Critical healthcare hard reserve (3.0 hours buffer) is locked in local relay logic.
5. [ ] Community USSD session dial `*384*529#` returns local language status.
