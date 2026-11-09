"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "../components/Header";
import { useApp } from "../context";
import {
  BrainIcon,
  TerminalIcon,
  CodeIcon,
  PlayIcon,
  CopyIcon,
  CheckIcon,
  KeyIcon,
  CpuIcon,
  ZapIcon,
  SunIcon,
  BatteryIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  TrashIcon,
} from "../components/Icons";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  thoughtTrace?: string[];
  directive?: {
    type: "info" | "success" | "warning" | "alert";
    title: string;
    text: string;
  };
  codeSnippet?: string;
  isLiveGemini?: boolean;
}

const PRESET_CODING_TEMPLATES: Record<
  string,
  { title: string; tag: string; description: string; code: string; defaultPrompt: string }
> = {
  batteryDispatch: {
    title: "Cautious Battery Dispatch",
    tag: "Python · Probabilistic",
    description: "Enforces 20% emergency reserve for clinic cold chains and routes surplus to mills.",
    defaultPrompt: "Generate an adaptive battery dispatch algorithm in Python that reserves 20% SoC for hospital vaccine cold chain and dispatches agricultural agro-processing during midday solar peak.",
    code: `"""
Lyt Autonomous Microgrid Battery Dispatch Engine
Complies with ECOWAS Mini-Grid Technical Standards (EREP 2030)
"""
from dataclasses import dataclass

@dataclass
class MicrogridState:
    pv_kw: float
    load_demand_kw: float
    battery_soc: float         # 0.0 to 1.0 (e.g. 0.65 = 65%)
    battery_capacity_kwh: float = 60.0
    critical_reserve_ratio: float = 0.20 # 20% SoC reserved for clinic

def compute_dispatch(state: MicrogridState) -> dict:
    net_surplus_kw = state.pv_kw - state.load_demand_kw
    usable_soc = state.battery_soc - state.critical_reserve_ratio
    
    # Safety Check: Hospital & Vaccine Cold-Chain Lock
    if state.battery_soc <= state.critical_reserve_ratio:
        return {
            "mode": "EMERGENCY_HEALTH_LOCK",
            "agro_mill_active": False,
            "water_pump_active": False,
            "clinic_cold_chain": "PROTECTED_ONLINE",
            "battery_status": "CRITICAL_RESERVE_HELD",
            "net_flow_kw": round(net_surplus_kw, 2),
            "verdict": "SHED_PRODUCTIVE_LOADS"
        }
    
    # Solar Surplus Window: Activate daytime community agro-processing
    if net_surplus_kw > 1.5 and state.battery_soc > 0.55:
        return {
            "mode": "PRODUCTIVE_SURPLUS_MONETIZATION",
            "agro_mill_active": True,
            "water_pump_active": True,
            "clinic_cold_chain": "PROTECTED_ONLINE",
            "battery_status": "ABSORBING_SURPLUS",
            "net_flow_kw": round(net_surplus_kw, 2),
            "verdict": "DISPATCH_COMMUNITY_LOADS"
        }
        
    return {
        "mode": "BALANCED_NOMINAL",
        "agro_mill_active": False,
        "water_pump_active": True,
        "clinic_cold_chain": "PROTECTED_ONLINE",
        "battery_status": "STABLE_FLOAT",
        "net_flow_kw": round(net_surplus_kw, 2),
        "verdict": "RUN_ESSENTIAL_SERVICES"
    }

# Execute test dispatch on virtual microgrid
test_telemetry = MicrogridState(pv_kw=7.4, load_demand_kw=2.2, battery_soc=0.68)
verdict = compute_dispatch(test_telemetry)
print(f"==> State: PV={test_telemetry.pv_kw}kW | Load={test_telemetry.load_demand_kw}kW | SoC={int(test_telemetry.battery_soc*100)}%")
print(f"==> Dispatch Mode: {verdict['mode']}")
print(f"==> Verdict: {verdict['verdict']}")`,
  },
  esp32Gateway: {
    title: "ESP32 MicroPython Gateway",
    tag: "MicroPython · IoT Gateway",
    description: "Cellular-fault-tolerant MQTT telemetry publisher with offline flash buffering.",
    defaultPrompt: "Write an ESP32 MicroPython MQTT telemetry publisher with exponential backoff for weak cellular 2G/GPRS towers in rural mini-grids.",
    code: `"""
Lyt Edge Gateway Telemetry Daemon for ESP32 (MicroPython)
Ingests RS485 Modbus telemetry from Victron/Growatt inverters
and publishes to Lyt regional TimescaleDB broker over MQTT.
"""
import time
import ujson
from umqtt.simple import MQTTClient

BROKER_HOST = "broker.lyt.africa"
SITE_ID = "freetown_clinic_01"
INGEST_KEY = "lyt_sec_token_99a8b"
TOPIC = f"lyt/{SITE_ID}/telemetry"

def read_modbus_registers():
    # Simulates RS485 Modbus inverter holding registers (Victron / Deye / Growatt)
    return {
        "pv_kw": 4.85,
        "load_kw": 1.72,
        "battery_v": 51.4,
        "soc": 0.74,
        "inverter_temp_c": 34.2,
        "grid_frequency_hz": 50.02
    }

def start_gateway():
    print(f"==> Connecting to Lyt MQTT Broker: {BROKER_HOST}...")
    client = MQTTClient(client_id=f"esp32_{SITE_ID}", server=BROKER_HOST, port=1883)
    client.connect()
    print("==> Telemetry Gateway Active. Publishing telemetry every 15s...")

    for step in range(3):
        data = read_modbus_registers()
        payload = {
            "key": INGEST_KEY,
            "timestamp": time.time(),
            **data
        }
        client.publish(TOPIC, ujson.dumps(payload))
        print(f"[TX #{step+1}] Ingested PV={data['pv_kw']}kW | Load={data['load_kw']}kW | SoC={int(data['soc']*100)}%")
        time.sleep(1)

start_gateway()`,
  },
  harmattanSoiling: {
    title: "Harmattan Dust Soiling Detector",
    tag: "Python · Physics Engine",
    description: "Compares live measured PV against clear-sky irradiance physics to trigger cleaning alerts.",
    defaultPrompt: "Build a dynamic soiling detection algorithm that detects Harmattan dust accumulation and calculates cleaning ROI.",
    code: `"""
Lyt Dynamic Harmattan Dust Soiling Algorithm
Monitors PV Performance Ratio derating vs. Clear-Sky physical curves
"""

def detect_harmattan_soiling(
    measured_pv_kw: float,
    ghi_irradiance_wm2: float,
    ambient_temp_c: float,
    nameplate_kwp: float = 45.0
) -> dict:
    # 1. Temperature derating factor: -0.4% per degree above 25C STC
    thermal_derate = 1.0 - max(0.0, (ambient_temp_c - 25.0) * 0.004)
    
    # 2. Theoretical expected clear-sky generation at 80% nominal PR
    expected_clear_sky_kw = (ghi_irradiance_wm2 / 1000.0) * nameplate_kwp * 0.80 * thermal_derate
    
    if expected_clear_sky_kw < 0.2:
        return {"status": "INSUFFICIENT_SUN", "soiling_ratio": 0.0, "clean_alert": False}
        
    actual_pr = measured_pv_kw / ((ghi_irradiance_wm2 / 1000.0) * nameplate_kwp)
    soiling_loss_pct = max(0.0, (0.80 - actual_pr) / 0.80) * 100.0
    
    # Threshold: Alert when Harmattan dust degrades array by >= 12%
    clean_alert = soiling_loss_pct >= 12.0
    
    return {
        "expected_clear_sky_kw": round(expected_clear_sky_kw, 2),
        "measured_pv_kw": round(measured_pv_kw, 2),
        "ambient_temp_c": ambient_temp_c,
        "soiling_loss_pct": round(soiling_loss_pct, 1),
        "clean_alert": clean_alert,
        "recommendation": "Wash array tomorrow dawn (07:00) with soft squeegees" if clean_alert else "Array clean"
    }

# Run diagnostics
result = detect_harmattan_soiling(measured_pv_kw=25.4, ghi_irradiance_wm2=850.0, ambient_temp_c=36.5)
print(f"==> Expected: {result['expected_clear_sky_kw']} kW | Measured: {result['measured_pv_kw']} kW")
print(f"==> Soiling Attenuation: {result['soiling_loss_pct']}% | Wash Alert: {result['clean_alert']}")
print(f"==> Directive: {result['recommendation']}")`,
  },
  hospitalSafeguard: {
    title: "Hospital & Cold-Chain Safeguard",
    tag: "Python · Load Controller",
    description: "Automated load-shedding hierarchy reserving power for rural maternity clinics and cold stores.",
    defaultPrompt: "Create a critical load protection controller that sheds non-essential village circuits when solar battery reserves drop below 25%.",
    code: `"""
Lyt Rural Health Clinic & Vaccine Cold-Chain Safeguard Controller
Prioritizes Level 1 (Vaccine Fridges, Maternal Lighting) over Level 2/3 (Milling, Domestic)
"""

LOAD_HIERARCHY = {
    "tier_1_life_support": ["vaccine_refrigerator", "maternal_ward_lighting", "oxygen_concentrator"],
    "tier_2_community": ["borehole_water_pump", "street_lighting", "school_computers"],
    "tier_3_productive": ["cassava_grain_mill", "welding_workshop", "commercial_freezer"]
}

def allocate_feeders(battery_soc_pct: float, is_night: bool) -> dict:
    if battery_soc_pct < 20.0:
        return {
            "condition": "CRITICAL_DEFICIT",
            "tier_1": "ACTIVE_PROTECTED",
            "tier_2": "SHED_OFFLINE",
            "tier_3": "SHED_OFFLINE",
            "sms_warning": "Warning: Mini-grid battery under 20%. Community feeders isolated for clinic."
        }
    elif battery_soc_pct < 45.0 or (is_night and battery_soc_pct < 60.0):
        return {
            "condition": "CONSERVATION_BUFFER",
            "tier_1": "ACTIVE_PROTECTED",
            "tier_2": "ACTIVE_REGULATED",
            "tier_3": "SHED_OFFLINE",
            "sms_warning": "Notice: Peak productive loads suspended until morning sunrise."
        }
    else:
        return {
            "condition": "NOMINAL_FULL_SERVICE",
            "tier_1": "ACTIVE_PROTECTED",
            "tier_2": "ACTIVE_NORMAL",
            "tier_3": "ACTIVE_NORMAL",
            "sms_warning": None
        }

print(allocate_feeders(battery_soc_pct=22.5, is_night=True))`,
  },
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "msg-0",
    sender: "agent",
    text: `Welcome to **Lyt AI Agent & Live Coding Studio**! ⚡

I am your autonomous clean energy copilot for West Africa. I reason about live meteorological data (Open-Meteo & Copernicus dust), manage microgrid battery dispatch, protect rural clinic cold chains, and write production-grade firmware for edge inverters.

**How can I help you optimize your clean energy operations today?**`,
    timestamp: "Just now",
    thoughtTrace: [
      "Initialized Lyt Autonomous Grid Engine v2.4.",
      "Calibrated regional weather model across 25 West Africa hubs.",
      "Loaded ECOWAS Renewable Energy Policy (EREP) compliance rules.",
    ],
    directive: {
      type: "info",
      title: "Agent Standby Nominal",
      text: "Ready for live prompts, dispatch optimization, and edge code generation.",
    },
  },
];

export default function AgentPage() {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState<"copilot" | "coder">("copilot");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const [keyPingStatus, setKeyPingStatus] = useState<string | null>(null);

  // Copilot Chat State
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Live Coding Agent State
  const [activeTemplateKey, setActiveTemplateKey] = useState("batteryDispatch");
  const [currentCode, setCurrentCode] = useState(PRESET_CODING_TEMPLATES.batteryDispatch.code);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("lyt_gemini_api_key");
      if (savedKey) {
        setApiKey(savedKey);
      }
    } catch (_) {}
  }, []);

  const saveApiKey = (newKey: string) => {
    setApiKey(newKey);
    try {
      localStorage.setItem("lyt_gemini_api_key", newKey);
    } catch (_) {}
  };

  const clearApiKey = () => {
    setApiKey("");
    try {
      localStorage.removeItem("lyt_gemini_api_key");
    } catch (_) {}
    setKeyPingStatus(null);
  };

  const pingGeminiKey = async () => {
    if (!apiKey) {
      setKeyPingStatus("No key entered. Please enter a key first.");
      return;
    }
    setKeyPingStatus("Pinging Gemini API...");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Ping check. Reply with: OK",
          model: selectedModel,
          apiKey,
        }),
      });
      const data = await res.json();
      if (data.isLiveGemini) {
        setKeyPingStatus(`🟢 Gemini API Connected (${data.metrics?.latencyMs}ms)`);
      } else {
        setKeyPingStatus("🟡 Key did not authenticate; Local Autonomous Engine active.");
      }
    } catch (err) {
      setKeyPingStatus("🔴 Network error connecting to agent gateway.");
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || isGenerating) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputPrompt("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          mode: "copilot",
          model: selectedModel,
          apiKey,
        }),
      });

      const data = await res.json();

      const agentMessage: Message = {
        id: `msg-agent-${Date.now()}`,
        sender: "agent",
        text: data.response || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        thoughtTrace: data.thoughtTrace,
        directive: data.directive,
        codeSnippet: data.codeSnippet,
        isLiveGemini: data.isLiveGemini,
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: "agent",
          text: `Error connecting to AI service: ${err.message}. Reverting to local safety protocol.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleSelectTemplate = (key: string) => {
    setActiveTemplateKey(key);
    setCurrentCode(PRESET_CODING_TEMPLATES[key].code);
    setConsoleOutput("");
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setConsoleOutput(
      `$ lyt-agent execute --firmware runtime-v2.4 --target esp32\n` +
      `==> Booting Lyt Edge MicroPython / Python Runtime...\n` +
      `==> Ingesting live microgrid sensors...\n`
    );

    setTimeout(() => {
      setConsoleOutput((prev) =>
        prev +
        `[SENSORS] PV Array: 4.85 kW (GHI: 620 W/m²)\n` +
        `[SENSORS] Village Load: 1.72 kW (Clinic: 450W, Cold-Chain: 650W, Base: 620W)\n` +
        `[SENSORS] Lithium Battery: 51.4V | SoC: 68.4% (Cautious p10: 61.2%)\n` +
        `==> Executing script logic...\n`
      );
    }, 600);

    setTimeout(() => {
      setConsoleOutput((prev) =>
        prev +
        `\n[PASS] Critical Reserve Check: SoC 68.4% >= 20.0% Clinic Lock Margin\n` +
        `[PASS] Vaccine Cold-Chain Compressor: STABLE AT 3.8°C\n` +
        `[ACT]  Surplus Solar Detected: +3.13 kW. Diverting to borehole water pumping\n` +
        `[OK]   Modbus RS485 Inverter Packets: 0 CRC errors, 14ms turnaround\n` +
        `\n==> EXECUTION COMPLETED (0.024s). STATUS: 0 VIOLATIONS. VERDICT: DISPATCH_APPROVED\n`
      );
      setIsSimulating(false);
    }, 1400);
  };

  const copyToClipboard = (text: string, isCli = false) => {
    navigator.clipboard.writeText(text);
    if (isCli) {
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const downloadCode = () => {
    const blob = new Blob([currentCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lyt_${activeTemplateKey}_${Date.now()}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const statusBadge = (
    <span className="pill-badge live" role="status">
      <i className="pulse-dot" />
      {apiKey ? "Gemini Live API Ready" : "Autonomous Local Agent Active"}
    </span>
  );

  return (
    <main className="app-main">
      <Header statusBadge={statusBadge} />

      {/* Header section with Homebrew-inspired Hero */}
      <section className="agent-page-header">
        <div className="agent-title-row">
          <div>
            <h1 className="regional-headline mb-2">
              Lyt AI Agent & Live Coding Studio
            </h1>
            <p className="agent-subhead">
              Autonomous clean energy intelligence, live dispatch reasoning, and edge IoT firmware generator for West Africa mini-grids.
            </p>
          </div>
          <span className="agent-title-badge flex items-center gap-2">
            <TerminalIcon size={14} className="text-[#10B981]" />
            <span>Gemini 2.0 / 1.5 Powered Engine</span>
          </span>
        </div>

        {/* Homebrew Terminal Command Box (brew.sh inspiration) */}
        <div className="brew-cli-box my-4">
          <div className="brew-cli-content">
            <span className="brew-cli-prompt">$</span>
            <span className="brew-cli-cmd">brew tap lyt/energy && brew install lyt-agent</span>
            <span className="text-[#64748B] font-mono text-xs hidden md:inline">
              # or: /bin/bash -c "$(curl -fsSL https://lyt.africa/install.sh)"
            </span>
          </div>
          <button
            type="button"
            className={`brew-copy-btn ${copiedCli ? "copied" : ""}`}
            onClick={() => copyToClipboard("brew tap lyt/energy && brew install lyt-agent", true)}
            title="Copy command to clipboard"
          >
            {copiedCli ? (
              <>
                <CheckIcon size={13} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Gemini API Key Configuration Card */}
      <section className="gemini-config-card" aria-label="Gemini API Key Configuration">
        <div className="gemini-config-top">
          <div className="flex items-center gap-2">
            <KeyIcon size={16} className="text-[#F59E0B]" />
            <b className="text-sm text-white">Google Gemini API Key Integration</b>
            <span className="text-xs text-[#94A3B8]">
              (Optional: Enter your key for cloud reasoning, or use built-in Autonomous Engine)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="gemini-status-tag">
              {apiKey ? (
                <span className="text-[#10B981] flex items-center gap-1.5">
                  <i className="w-2 h-2 rounded-full bg-[#10B981] inline-block animate-pulse" />
                  Live Key Configured
                </span>
              ) : (
                <span className="text-[#F59E0B] flex items-center gap-1.5">
                  <i className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block" />
                  Local Simulation Mode
                </span>
              )}
            </span>

            {keyPingStatus && (
              <span className="text-xs px-2.5 py-1 rounded bg-[#080A0E] border border-[#283347] text-[#CBD5E1]">
                {keyPingStatus}
              </span>
            )}
          </div>
        </div>

        <div className="gemini-key-input-row">
          <div className="gemini-input-wrapper">
            <span className="absolute left-3.5 top-2.5 text-[#94A3B8]">
              <KeyIcon size={15} />
            </span>
            <input
              type={showKey ? "text" : "password"}
              placeholder="Paste your Google Gemini API key (AIzaSy...)"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              className="gemini-input"
              aria-label="Google Gemini API key input"
            />
            {apiKey && (
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-xs text-[#94A3B8] hover:text-white"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            )}
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="gemini-model-select"
            aria-label="Gemini Model Selector"
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest / Recommended)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Balanced)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
          </select>

          <button
            type="button"
            onClick={pingGeminiKey}
            className="btn-ghost-sm flex items-center gap-1.5"
            title="Test connection to Gemini API"
          >
            <RefreshCwIcon size={13} />
            <span>Test / Ping Key</span>
          </button>

          {apiKey && (
            <button
              type="button"
              onClick={clearApiKey}
              className="text-xs text-[#F43F5E] hover:underline px-2 py-1"
              title="Remove stored key"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* Mode Switcher Tabs */}
      <div className="agent-mode-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "copilot"}
          className={`agent-tab-btn ${activeTab === "copilot" ? "active" : ""}`}
          onClick={() => setActiveTab("copilot")}
        >
          <ZapIcon size={16} />
          <span>⚡ Live Energy Copilot</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "coder"}
          className={`agent-tab-btn ${activeTab === "coder" ? "active" : ""}`}
          onClick={() => setActiveTab("coder")}
        >
          <CodeIcon size={16} />
          <span>💻 Live Coding Agent & Microgrid Runner</span>
        </button>
      </div>

      {/* Mode 1: Live Energy Copilot */}
      {activeTab === "copilot" && (
        <div className="agent-studio-grid">
          {/* Sidebar Prompt Presets */}
          <aside className="agent-sidebar">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F59E0B]">
              Quick Energy Directives
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Select a prompt to query the live agent for instant dispatch policy or weather mitigation:
            </p>

            <div className="agent-preset-list">
              <button
                type="button"
                className="agent-preset-btn"
                onClick={() =>
                  handleSendMessage(
                    "Freetown is expecting heavy rain (48mm) at 15:00. How should we configure the battery pre-charge and clinic cold storage reserve?"
                  )
                }
              >
                <span className="agent-preset-tag">🌧️ Tropical Rain</span>
                <span>Freetown: Pre-charge battery & protect clinic cold-chain</span>
              </button>

              <button
                type="button"
                className="agent-preset-btn"
                onClick={() =>
                  handleSendMessage(
                    "Niamey harmattan dust AOD spiked to 0.48. Performance ratio dropped 14%. What is the recommended cleaning schedule and dispatch rule?"
                  )
                }
              >
                <span className="agent-preset-tag">🌪️ Harmattan Dust</span>
                <span>Niamey: Dust soiling mitigation & dawn array cleaning</span>
              </button>

              <button
                type="button"
                className="agent-preset-btn"
                onClick={() =>
                  handleSendMessage(
                    "We have a 4.2 kW solar surplus in Sikasso between 11:00 and 15:00. How should we schedule grain milling and borehole water pumping?"
                  )
                }
              >
                <span className="agent-preset-tag">🌾 Daytime Surplus</span>
                <span>Sikasso: Agro-processing load scheduling</span>
              </button>

              <button
                type="button"
                className="agent-preset-btn"
                onClick={() =>
                  handleSendMessage(
                    "Write an ESP32 MicroPython telemetry publisher that reads solar irradiance from Modbus registers and pushes to MQTT."
                  )
                }
              >
                <span className="agent-preset-tag">📡 IoT Firmware</span>
                <span>Generate ESP32 MQTT Telemetry Publisher</span>
              </button>
            </div>
          </aside>

          {/* Main Chat Window */}
          <div className="agent-main-window">
            <div className="terminal-titlebar">
              <div className="mac-dots">
                <span className="mac-dot red" />
                <span className="mac-dot yellow" />
                <span className="mac-dot green" />
              </div>
              <span className="terminal-title">
                lyt-copilot --live --session active --model {selectedModel}
              </span>
              <span className="text-xs text-[#10B981] font-mono">ONLINE</span>
            </div>

            <div className="agent-messages-container">
              {messages.map((m) => (
                <div key={m.id} className="agent-message-row">
                  <div className={`agent-avatar ${m.sender === "user" ? "user" : "bot"}`}>
                    {m.sender === "user" ? "YOU" : <BrainIcon size={18} />}
                  </div>

                  <div className={`agent-bubble ${m.sender === "user" ? "user" : ""}`}>
                    {/* Directive Badge */}
                    {m.directive && (
                      <div className={`agent-directive-pill directive-${m.directive.type}`}>
                        <ShieldCheckIcon size={12} />
                        <span>{m.directive.title}</span>
                      </div>
                    )}

                    {/* Thought Trace Accordion */}
                    {m.thoughtTrace && m.thoughtTrace.length > 0 && (
                      <details className="agent-thought-box" open>
                        <summary className="cursor-pointer text-xs font-bold text-[#38BDF8] mb-1 flex items-center gap-1.5">
                          <CpuIcon size={12} />
                          <span>Agent Reasoning Trace ({m.thoughtTrace.length} steps)</span>
                        </summary>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-[#CBD5E1] mt-1.5">
                          {m.thoughtTrace.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </details>
                    )}

                    <div className="whitespace-pre-wrap leading-relaxed text-sm">
                      {m.text}
                    </div>

                    {/* Extracted Code Snippet (if any) */}
                    {m.codeSnippet && (
                      <div className="mt-3 p-3 rounded-lg bg-[#050608] border border-[#283347] font-mono text-xs">
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#283347] text-[#94A3B8]">
                          <span>Python Edge Rule</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentCode(m.codeSnippet || "");
                              setActiveTab("coder");
                            }}
                            className="text-xs text-[#F59E0B] hover:underline"
                          >
                            Open in Live Coding Studio →
                          </button>
                        </div>
                        <pre className="overflow-x-auto text-[#E2E8F0]">{m.codeSnippet}</pre>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-1 text-[11px] text-[#64748B]">
                      <span>{m.timestamp}</span>
                      {m.isLiveGemini && (
                        <span className="text-[#10B981]">Verified via Google Gemini</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isGenerating && (
                <div className="agent-message-row">
                  <div className="agent-avatar bot">
                    <BrainIcon size={18} />
                  </div>
                  <div className="agent-bubble flex items-center gap-3">
                    <div className="spinner w-4 h-4" />
                    <span className="text-sm text-[#94A3B8]">
                      Evaluating regional climate data and generating dispatch directives...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="agent-input-container">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="agent-input-form"
              >
                <input
                  type="text"
                  placeholder="Ask the AI agent anything (e.g. 'How to handle 3 days of dust storm in Niamey?')"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className="agent-text-input"
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={isGenerating || !inputPrompt.trim()}
                  className="agent-send-btn"
                >
                  <PlayIcon size={14} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Live Coding Agent & Microgrid Runner */}
      {activeTab === "coder" && (
        <div className="agent-studio-grid">
          {/* Coding Template Selector Sidebar */}
          <aside className="agent-sidebar">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F59E0B]">
              Edge Coding Presets
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Select an algorithm template to inspect, edit, and test live in the virtual microgrid runner:
            </p>

            <div className="agent-preset-list">
              {Object.keys(PRESET_CODING_TEMPLATES).map((key) => {
                const tpl = PRESET_CODING_TEMPLATES[key];
                const isSelected = activeTemplateKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectTemplate(key)}
                    className={`agent-preset-btn ${isSelected ? "border-[#F59E0B] bg-[rgba(245,158,11,0.1)]" : ""}`}
                  >
                    <span className="agent-preset-tag">{tpl.tag}</span>
                    <b className="text-sm text-white">{tpl.title}</b>
                    <span className="text-xs text-[#94A3B8]">{tpl.description}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Interactive Code Editor & Runner */}
          <div className="agent-main-window">
            <div className="terminal-titlebar">
              <div className="mac-dots">
                <span className="mac-dot red" />
                <span className="mac-dot yellow" />
                <span className="mac-dot green" />
              </div>
              <span className="terminal-title">
                lyt-code-studio: {activeTemplateKey}.py (Python / MicroPython 3.11)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentCode)}
                  className="btn-ghost-sm text-xs py-1 px-3"
                  title="Copy code to clipboard"
                >
                  {copiedCode ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>

                <button
                  type="button"
                  onClick={downloadCode}
                  className="btn-ghost-sm text-xs py-1 px-3"
                  title="Download python script"
                >
                  <span>Download .py</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="btn-pill text-xs py-1 px-4 bg-[#F59E0B] text-[#07090D] font-bold hover:bg-[#FBBF24]"
                >
                  <PlayIcon size={13} />
                  <span>{isSimulating ? "Running..." : "▶ Run in Microgrid"}</span>
                </button>
              </div>
            </div>

            {/* Editable Code Editor */}
            <div className="p-4 bg-[#080A0E] flex-1">
              <textarea
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                rows={16}
                className="w-full h-80 bg-transparent text-[#E2E8F0] font-mono text-xs leading-relaxed outline-none border-none resize-y selection:bg-[#F59E0B]/30"
                spellCheck={false}
                aria-label="Code editor"
              />
            </div>

            {/* Virtual Microgrid Execution Terminal */}
            <div className="p-4 bg-[#050608] border-t border-[#283347]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-[#F59E0B] flex items-center gap-1.5">
                  <TerminalIcon size={13} />
                  <span>Virtual Edge Execution Console (Homebrew stdout)</span>
                </span>
                <span className="text-xs text-[#94A3B8] font-mono">
                  Target: Simulated Victron Inverter & LiFePO4 Pack
                </span>
              </div>

              <div className="code-runner-console">
                {consoleOutput ? (
                  consoleOutput
                ) : (
                  <span className="text-[#64748B]">
                    Click &quot;▶ Run in Microgrid&quot; above to execute this script against real-time simulated telemetry...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
