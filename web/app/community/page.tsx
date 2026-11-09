"use client";

import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { useApp } from "../context";
import {
  SunIcon,
  PhoneIcon,
  MessageSquareIcon,
  HashIcon,
  BatteryIcon,
  ClinicIcon,
  PumpIcon,
  ZapIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "../components/Icons";

interface TerminalLogEntry {
  id: string;
  time: string;
  tag: string;
  tagType: "smpp-in" | "smpp-out" | "ussd" | "core" | "dlr" | "warn";
  category: "smpp" | "ussd" | "broadcast" | "core";
  content: string;
}

export default function CommunityPage() {
  const { locale, setLocale } = useApp();
  const [highContrast, setHighContrast] = useState(false);
  const [phoneChannel, setPhoneChannel] = useState<"sms" | "ussd" | "whatsapp">("sms");
  const [terminalFilter, setTerminalFilter] = useState<"all" | "smpp" | "ussd" | "broadcast">("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ch = params.get("channel");
      if (ch === "ussd" || ch === "whatsapp" || ch === "sms") {
        setPhoneChannel(ch);
      }
    }
  }, []);

  // USSD Interactive Session State
  const [ussdInput, setUssdInput] = useState("");
  const [ussdScreen, setUssdScreen] = useState<"root" | "opt1" | "opt2" | "opt3" | "opt4" | "lang" | "invalid">("root");

  // SMS Interactive Chat History
  const [smsChat, setSmsChat] = useState<Array<{ sender: "bot" | "user"; text: string; time: string }>>([
    {
      sender: "bot",
      text: "LAYT ALERT [Kambia Mini-Grid]: Power tomorrow is GOOD. Sun is strong. Water pump & mill window: 10:00 to 15:00. Clinic fridges fully protected. Reply 1 for details, 2 for hours, 3 for clinic reserve.",
      time: "11:40 AM",
    },
  ]);
  const [smsInputText, setSmsInputText] = useState("");

  const smsTexts: Record<string, string> = {
    en: "LAYT ALERT [Kambia Mini-Grid]: Power tomorrow is GOOD. Sun is strong. Water pump & mill window: 10:00 to 15:00. Clinic fridges fully protected. Questions? Reply 1.",
    fr: "ALERTE LAYT [Mini-Réseau]: L'électricité demain sera BONNE. Ensoleillement fort. Pompes et moulins : 10h-15h. Dispensaire protégé à 100%. Répondez 1 pour plus d'infos.",
    kri: "LAYT ALAT: Pawa tɔmɔro go bɛtɛ! Sɔn go kɔmɔt fayn. Rɔn yu wata pɔmp ɛn mil frɔm 10:00 te 15:00. Klinik batri gɛt pawa fɔ ful nɛt. Tɛp 1 fɔ no mɔ.",
    ha: "LAYT SANARWA: Hasken wuta gobe zai yi kyau sosai. Za a iya kunna injin ban ruwa daga karfe 10:00 zuwa 15:00. Asibiti yana da tabbacin wuta. Latsa 1 domin karin bayani.",
  };

  // WhatsApp Interactive Chat History
  const [whatsappChat, setWhatsappChat] = useState<Array<{ sender: "bot" | "user"; text: string; time: string }>>([
    {
      sender: "bot",
      text: smsTexts[locale] || smsTexts.en,
      time: "11:40 AM",
    },
  ]);
  const [whatsappInputText, setWhatsappInputText] = useState("");

  // Live Telecom Terminal Logs (SMPP v3.4 / GSM USSD Traces)
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>([
    {
      id: "log-1",
      time: "11:39:58",
      tag: "SMPP-BIND",
      tagType: "core",
      category: "core",
      content: "Transceiver bound to smpp.africastalking.com:2775 (SystemID: layt_sl_gw, system_type: mini-grid)",
    },
    {
      id: "log-2",
      time: "11:40:02",
      tag: "DISPATCH-AI",
      tagType: "core",
      category: "core",
      content: "Site Brain Kambia Hub: MPC forecast solved (p10=4.8kW, p50=6.2kW, SoC=88%, Genset=0h)",
    },
    {
      id: "log-3",
      time: "11:40:03",
      tag: "SMPP-SUBMIT",
      tagType: "smpp-out",
      category: "smpp",
      content: "submit_sm (pdu_len=148, seq=0x0000004a, src='3845', dst='+23276123456', dcs=0x00 [GSM-7])",
    },
    {
      id: "log-4",
      time: "11:40:04",
      tag: "DLR-RECEIPT",
      tagType: "dlr",
      category: "smpp",
      content: "deliver_sm receipt: 'id:SL-GW-901842 sub:001 dlvrd:001 stat:DELIVRD err:000' (Orange SL 619-01, 114ms)",
    },
  ]);

  const addTerminalLog = (
    tag: string,
    tagType: TerminalLogEntry["tagType"],
    category: TerminalLogEntry["category"],
    content: string
  ) => {
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setTerminalLogs((prev) => [
      ...prev.slice(-45),
      {
        id: `log-${Date.now()}-${Math.random()}`,
        time: nowTime,
        tag,
        tagType,
        category,
        content,
      },
    ]);
  };

  // Power tomorrow status
  const powerStatus = {
    rating: "GOOD" as "GOOD" | "LIMITED" | "AT_RISK",
    label: "POWER TOMORROW: ABUNDANT",
    krioLabel: "PAWA TƆMƆRO: I GO PLENTI",
    frenchLabel: "ÉLECTRICITÉ DEMAIN : BONNE DISPONIBILITÉ",
    windows: [
      { name: "Clinic & Fridges", time: "24 Hours (Guaranteed)", status: "Protected", icon: <ClinicIcon size={16} className="text-mist" /> },
      { name: "Pumps & Grain Mills", time: "10:00 – 15:00", status: "Recommended", icon: <PumpIcon size={16} className="text-sun" /> },
      { name: "Home & Shop Lights", time: "18:30 – 23:00", status: "Stable", icon: <ZapIcon size={16} className="text-sand" /> },
    ],
  };

  const handleUssdSubmit = (e?: React.FormEvent, directVal?: string) => {
    if (e) e.preventDefault();
    const val = (directVal !== undefined ? directVal : ussdInput).trim();
    if (!val) return;

    addTerminalLog(
      "USSD-REQ",
      "ussd",
      "ussd",
      `MAP_PROCESS_UNSTRUCTURED_SS_REQ (invoke_id=14, op_code=59, msisdn=+23276123456, str="${val}")`
    );

    if (val === "1") {
      setUssdScreen("opt1");
      addTerminalLog(
        "USSD-RESP",
        "core",
        "ussd",
        "MAP_UNSTRUCTURED_SS_RESP (CON: Power Tomorrow: GOOD, 5.4 kWh/kWp, Clinic: 100% Protected, Genset: 0h)"
      );
    } else if (val === "2") {
      setUssdScreen("opt2");
      addTerminalLog(
        "USSD-RESP",
        "core",
        "ussd",
        "MAP_UNSTRUCTURED_SS_RESP (CON: Clinic Cold Chain: PROTECTED, 3.4h continuous safety reserve locked)"
      );
    } else if (val === "3") {
      setUssdScreen("opt3");
      addTerminalLog(
        "USSD-RESP",
        "core",
        "ussd",
        "MAP_UNSTRUCTURED_SS_RESP (CON: Productive Window: 10:00-15:00 recommended for mills and irrigation pumps)"
      );
    } else if (val === "4") {
      setUssdScreen("opt4");
      addTerminalLog(
        "USSD-RESP",
        "warn",
        "ussd",
        "MAP_UNSTRUCTURED_SS_RESP (END: Outage Report Logged. Auto-ticket #TK-849 assigned to Kambia sector duty tech)"
      );
    } else if (val === "0") {
      setUssdScreen("lang");
      addTerminalLog(
        "USSD-RESP",
        "core",
        "ussd",
        "MAP_UNSTRUCTURED_SS_RESP (CON: Select Language: 1=English, 2=Krio, 3=Français, 4=Hausa)"
      );
    } else if (ussdScreen === "lang" && (val === "1" || val === "2" || val === "3" || val === "4")) {
      const langMap: Record<string, string> = { "1": "en", "2": "kri", "3": "fr", "4": "ha" };
      setLocale(langMap[val] as any);
      setUssdScreen("root");
      addTerminalLog(
        "USSD-RESP",
        "core",
        "ussd",
        `MAP_UNSTRUCTURED_SS_RESP (CON: Locale updated to '${langMap[val]}'. Returning to root menu *384*529#)`
      );
    } else {
      setUssdScreen("invalid");
      addTerminalLog(
        "USSD-WARN",
        "warn",
        "ussd",
        `MAP_UNSTRUCTURED_SS_RESP (END: Invalid selection '${val}'. Session closing)`
      );
    }
    setUssdInput("");
  };

  const handleSmsSubmit = (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const textToSend = directText || smsInputText;
    if (!textToSend.trim()) return;

    const userMsg = textToSend.trim();
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    addTerminalLog(
      "SMPP-DELIVER",
      "smpp-in",
      "smpp",
      `deliver_sm (src='+23276123456', dst='3845', esm=0x00, msg="${userMsg}")`
    );

    let botReply = "LAYT: Thank you. Your message has been logged for the mini-grid duty technician.";
    if (userMsg === "1" || userMsg.toUpperCase().includes("STATUS") || userMsg.toUpperCase().includes("POWER") || userMsg.toUpperCase().includes("PAWA")) {
      botReply = "LAYT: Power tomorrow: GOOD. Solar expected at 5.4 kWh/kWp. Clinic vaccine fridges guaranteed 24h. No diesel planned.";
    } else if (userMsg === "2" || userMsg.toUpperCase().includes("HOURS") || userMsg.toUpperCase().includes("TIME") || userMsg.toUpperCase().includes("MIL")) {
      botReply = "LAYT: Recommended productive load hours: 10:00 to 15:00 for grain mills and irrigation pumps during peak sun.";
    } else if (userMsg === "3" || userMsg.toUpperCase().includes("CLINIC") || userMsg.toUpperCase().includes("FRIDGE")) {
      botReply = "LAYT: Clinic vaccine cold chain buffer is at 100%. Hard reserve of 3+ hours continuously enforced by MPC.";
    } else if (userMsg === "4" || userMsg.toUpperCase().includes("HELP") || userMsg.toUpperCase().includes("FAULT")) {
      botReply = "LAYT: Outage ticket created. Field technician assigned to Kambia sector 2. Emergency phone: +232 76 999111.";
    }

    setTimeout(() => {
      addTerminalLog(
        "SMPP-SUBMIT",
        "smpp-out",
        "smpp",
        `submit_sm -> dst='+23276123456' | seg=1/1 | text="${botReply.slice(0, 48)}..."`
      );
      addTerminalLog(
        "DLR-RECEIPT",
        "dlr",
        "smpp",
        "SMSC status: DELIVRD (Orange SL gateway latency 112ms)"
      );
    }, 180);

    setSmsChat((prev) => [
      ...prev,
      { sender: "user", text: userMsg, time: nowTime },
      { sender: "bot", text: botReply, time: nowTime },
    ]);
    setSmsInputText("");
  };

  const handleWhatsappSend = (text: string) => {
    if (!text.trim()) return;
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const userMsg = text.trim();

    addTerminalLog(
      "WHATSAPP-IN",
      "smpp-in",
      "smpp",
      `HTTP/2 POST /webhooks/whatsapp | from="+23276123456" | text="${userMsg}"`
    );

    let reply = "LAYT MINI-GRID: Thank you for your inquiry. Our automated dispatcher is monitoring the Kambia feeder cell.";
    if (userMsg.includes("1") || userMsg.toUpperCase().includes("POWER") || userMsg.toUpperCase().includes("TOMORROW")) {
      reply = "LAYT: Power tomorrow is rated ABUNDANT. Solar forecast: 5.4 kWh/kWp. Battery reserve: 88%. Clinic vaccine freezers guaranteed 24h.";
    } else if (userMsg.includes("2") || userMsg.toUpperCase().includes("MILL") || userMsg.toUpperCase().includes("PUMP")) {
      reply = "LAYT: Peak solar window is 10:00 to 15:00. Grain mills, cassava grinding, and community irrigation pumps are scheduled to run at subsidized tariffs.";
    } else if (userMsg.includes("3") || userMsg.toUpperCase().includes("CLINIC") || userMsg.toUpperCase().includes("BUFFER")) {
      reply = "LAYT: Clinic vaccine cold chain status is NOMINAL at 3.9°C. Hard reserve of 3.4 hours is locked into battery storage under p10 pessimistic sky.";
    }

    setTimeout(() => {
      addTerminalLog(
        "WHATSAPP-OUT",
        "smpp-out",
        "smpp",
        `WhatsApp Cloud API -> 200 OK | to="+23276123456" | status="sent"`
      );
      addTerminalLog(
        "WHATSAPP-DLR",
        "dlr",
        "smpp",
        `WhatsApp delivery receipt: "delivered" (read status: double-blue-check)`
      );
    }, 200);

    setWhatsappChat((prev) => [
      ...prev,
      { sender: "user", text: userMsg, time: nowTime },
      { sender: "bot", text: reply, time: nowTime },
    ]);
    setWhatsappInputText("");
  };

  const handleKeypadPress = (val: string) => {
    if (phoneChannel === "ussd") {
      if (val === "CALL" || val === "#") {
        handleUssdSubmit(undefined, ussdInput || "1");
      } else if (val === "END") {
        setUssdScreen("root");
        setUssdInput("");
        addTerminalLog("USSD-END", "warn", "ussd", "User pressed END key. Session terminated.");
      } else if (val === "*") {
        setUssdInput((p) => p + "*");
      } else {
        setUssdInput((p) => p + val);
      }
    } else if (phoneChannel === "sms") {
      if (val === "CALL") {
        handleSmsSubmit(undefined, smsInputText || "1");
      } else if (val === "END") {
        setSmsInputText("");
      } else {
        setSmsInputText((p) => p + val);
      }
    } else if (phoneChannel === "whatsapp") {
      if (val === "CALL") {
        handleWhatsappSend(whatsappInputText || "1");
      } else if (val === "END") {
        setWhatsappInputText("");
      } else {
        setWhatsappInputText((p) => p + val);
      }
    }
  };

  const simulateBroadcast = (type: "blackout" | "surplus" | "clinic") => {
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (type === "blackout") {
      addTerminalLog(
        "BROADCAST",
        "warn",
        "broadcast",
        "EMERGENCY BLAST: Convective squall incoming (15:30-18:00). 420 subscribers queued across Kambia cells."
      );
      addTerminalLog(
        "SMPP-OUT",
        "smpp-out",
        "broadcast",
        "Bulk submit_sm broadcast initiated (420 SMS packets queued to Orange SL SMSC)."
      );
      const alertMsg = "⚠ LAYT CRITICAL ALERT: Heavy convective squall incoming (15:30-18:00). Clinic reserve locked. Productive loads pause now.";
      setSmsChat((prev) => [...prev, { sender: "bot", text: alertMsg, time }]);
      setWhatsappChat((prev) => [...prev, { sender: "bot", text: alertMsg, time }]);
    } else if (type === "surplus") {
      addTerminalLog(
        "BROADCAST",
        "smpp-out",
        "broadcast",
        "SURPLUS WINDOW: Battery SoC >85% and solar yield 6.4 kW. Triggering mill & pump alert."
      );
      addTerminalLog(
        "SMPP-OUT",
        "smpp-out",
        "broadcast",
        "Bulk submit_sm broadcast sent to 86 agro-processing and irrigation subscribers."
      );
      const surplusMsg = "⚡ LAYT SURPLUS: Battery full & strong sun. Grain mills and cassava processing open until 15:30 at subsidized rate.";
      setSmsChat((prev) => [...prev, { sender: "bot", text: surplusMsg, time }]);
      setWhatsappChat((prev) => [...prev, { sender: "bot", text: surplusMsg, time }]);
    } else {
      addTerminalLog(
        "CLINIC-PING",
        "core",
        "broadcast",
        "TELEMETRY PING: Kambia Community Health Centre vaccine fridge monitored at 3.9°C (Safe 2-8°C)."
      );
      addTerminalLog(
        "SMPP-OUT",
        "smpp-out",
        "broadcast",
        "SMS dispatched to Head Nurse (+23276999111): Vaccine buffer safe. 3.4h hard reserve locked."
      );
      const clinicMsg = "🏥 LAYT CLINIC: Vaccine cold chain status NORMAL (3.9°C). 3.4h continuous reserve locked under p10 pessimistic sun.";
      setSmsChat((prev) => [...prev, { sender: "bot", text: clinicMsg, time }]);
      setWhatsappChat((prev) => [...prev, { sender: "bot", text: clinicMsg, time }]);
    }
  };

  const filteredLogs = terminalLogs.filter((log) => {
    if (terminalFilter === "all") return true;
    if (terminalFilter === "smpp") return log.category === "smpp";
    if (terminalFilter === "ussd") return log.category === "ussd";
    if (terminalFilter === "broadcast") return log.category === "broadcast";
    return true;
  });

  return (
    <main className={`app-main ${highContrast ? "high-contrast-sunlight" : ""}`}>
      <Header />

      {/* Sunlight Glare Mode Toggle */}
      <div className="community-toolbar">
        <button
          type="button"
          className={`btn-pill flex items-center gap-2 ${highContrast ? "active" : ""}`}
          onClick={() => setHighContrast(!highContrast)}
        >
          <SunIcon size={14} className="btn-icon text-sun" />
          <span>{highContrast ? "Standard Contrast" : "Sunlight Glare Mode (High Contrast)"}</span>
        </button>

        <span className="dim text-sm hide-mobile">
          Designed for outdoor readability under direct West African sunlight on low-cost devices.
        </span>
      </div>

      {/* One Huge Glanceable Village Status Card */}
      <section className="village-glance-card">
        <div className="village-badge flex items-center gap-2 justify-center">
          <ShieldCheckIcon size={14} className="text-mist btn-icon" />
          <span>Village Clinic & Market Board</span>
        </div>
        <h1 className="huge-status-text flex items-center justify-center gap-3">
          <SunIcon size={36} className="text-sun btn-icon" />
          <span>
            {locale === "kri"
              ? powerStatus.krioLabel
              : locale === "fr"
              ? powerStatus.frenchLabel
              : powerStatus.label}
          </span>
        </h1>

        <p className="status-subhead">
          Strong sunshine forecast. No diesel generator required. Clinic vaccine cold chain operates without interruption.
        </p>

        {/* Essential Windows in Large Glanceable Type */}
        <div className="windows-grid">
          {powerStatus.windows.map((w, idx) => (
            <div key={idx} className="window-card">
              <span className="window-role flex items-center gap-2">
                <span className="btn-icon">{w.icon}</span>
                <span>{w.name}</span>
              </span>
              <b className="window-time">{w.time}</b>
              <span className="window-badge flex items-center gap-1.5">
                <CheckCircleIcon size={12} className="btn-icon" />
                <span>{w.status}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* SMS / USSD / WhatsApp Dual-Terminal Cockpit */}
      <section className="feature-phone-section">
        <div className="feature-phone-header">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <PhoneIcon size={18} className="text-mist btn-icon" />
              <span>Multi-Channel Community Dispatch & Telecom Gateway Terminal</span>
            </h3>
            <p className="dim text-sm">
              Live hardware simulation of rural feature phones paired side-by-side with the real SMPP & USSD carrier network packet terminal.
            </p>
          </div>

          <div className="btn-group" role="group" aria-label="Channel selection">
            <button
              type="button"
              className={`btn-toggle-sm flex items-center justify-center gap-1.5 ${phoneChannel === "sms" ? "active" : ""}`}
              onClick={() => {
                setPhoneChannel("sms");
                addTerminalLog("CHANNEL", "core", "core", "Channel switched to SMS (Shortcode 3845 via SMPP v3.4 transceiver).");
              }}
            >
              <MessageSquareIcon size={13} className="btn-icon" />
              <span>SMS Broadcast</span>
            </button>
            <button
              type="button"
              className={`btn-toggle-sm flex items-center justify-center gap-1.5 ${phoneChannel === "ussd" ? "active" : ""}`}
              onClick={() => {
                setPhoneChannel("ussd");
                addTerminalLog("CHANNEL", "ussd", "ussd", "Channel switched to Interactive USSD (*384*529# GSM session handler).");
              }}
            >
              <HashIcon size={13} className="btn-icon" />
              <span>USSD (*384#)</span>
            </button>
            <button
              type="button"
              className={`btn-toggle-sm flex items-center justify-center gap-1.5 ${phoneChannel === "whatsapp" ? "active" : ""}`}
              onClick={() => {
                setPhoneChannel("whatsapp");
                addTerminalLog("CHANNEL", "core", "core", "Channel switched to WhatsApp Business Cloud API (Webhook: 200 OK).");
              }}
            >
              <PhoneIcon size={13} className="btn-icon" />
              <span>WhatsApp Bot</span>
            </button>
          </div>
        </div>

        {/* Dual Cockpit Grid: Phone Chassis on Left + Real Gateway Terminal on Right */}
        <div className="dispatch-cockpit-grid">
          {/* =========================================================
              LEFT: Authentic Hardware Phone Chassis Simulator
              ========================================================= */}
          <div className="hardware-phone-chassis">
            <div className="phone-speaker-slit" />

            <div className="phone-display-bezel">
              {/* Top Hardware Status Bar */}
              <div className="phone-status-bar">
                <span className="flex items-center gap-1">
                  <ZapIcon size={11} className="text-[#F59E0B]" />
                  <span>Orange SL 2G</span>
                </span>
                <span className="font-mono text-[10px] text-[#94A3B8]">11:42 AM</span>
                <span className="flex items-center gap-1">
                  <BatteryIcon size={12} className="text-[#10B981]" />
                  <span>85%</span>
                </span>
              </div>

              {/* -------------------- 1. SMS CHANNEL -------------------- */}
              {phoneChannel === "sms" && (
                <div className="sms-view-container">
                  {/* Carrier Shortcode Banner */}
                  <div className="sms-carrier-card">
                    <span className="font-semibold text-[#FFFFFF] flex items-center gap-1.5 text-xs">
                      <ShieldCheckIcon size={14} className="text-[#10B981]" />
                      <span>LAYT-ALERT (3845)</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#F59E0B] bg-[#141824] px-2 py-0.5 rounded border border-[#283347]">
                      SMPP v3.4 · GSM-7
                    </span>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="sms-thread">
                    {smsChat.map((msg, i) => (
                      <div
                        key={i}
                        className={`sms-bubble ${msg.sender === "bot" ? "bot" : "user"}`}
                      >
                        {msg.sender === "bot" && (
                          <div className="sms-bubble-sender">LAYT-ALERT [Kambia]</div>
                        )}
                        <div>{msg.text}</div>
                        <div className="sms-bubble-meta">
                          <span>{msg.time}</span>
                          {msg.sender === "bot" && <CheckCircleIcon size={11} className="text-[#10B981]" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Interactive Keyword Chips */}
                  <div className="sms-quick-pills">
                    <button
                      type="button"
                      onClick={() => handleSmsSubmit(undefined, "1")}
                      className="sms-quick-btn"
                    >
                      1: Status
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSmsSubmit(undefined, "2")}
                      className="sms-quick-btn"
                    >
                      2: Mill Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSmsSubmit(undefined, "3")}
                      className="sms-quick-btn"
                    >
                      3: Clinic Reserve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSmsSubmit(undefined, "4")}
                      className="sms-quick-btn"
                    >
                      4: Report Fault
                    </button>
                  </div>

                  {/* SMS Input Bar */}
                  <form onSubmit={handleSmsSubmit} className="sms-form">
                    <input
                      type="text"
                      value={smsInputText}
                      onChange={(e) => setSmsInputText(e.target.value)}
                      placeholder="Reply '1', '2', or question..."
                      className="sms-input"
                    />
                    <button type="submit" className="sms-btn-send">
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* -------------------- 2. USSD CHANNEL -------------------- */}
              {phoneChannel === "ussd" && (
                <div className="ussd-view-container">
                  {/* Authentic GSM Flash USSD Dialog */}
                  <div className="ussd-screen-card">
                    <div>
                      <div className="ussd-header-row">
                        <span className="text-[#F59E0B] font-bold">*384*529# (LAYT)</span>
                        <span className="text-[#94A3B8]">Orange SL Flash</span>
                      </div>

                      {ussdScreen === "root" && (
                        <div className="ussd-menu-body">
                          <p className="ussd-title">LAYT MINI-GRID (Kambia)</p>
                          <div className="ussd-item"><span className="ussd-num">1.</span> Power Tomorrow Outlook</div>
                          <div className="ussd-item"><span className="ussd-num">2.</span> Clinic Vaccine Cold Chain</div>
                          <div className="ussd-item"><span className="ussd-num">3.</span> Productive Window (Mills &amp; Pumps)</div>
                          <div className="ussd-item"><span className="ussd-num">4.</span> Report Grid Fault or Outage</div>
                          <div className="ussd-item"><span className="ussd-num" style={{ color: "#38BDF8" }}>0.</span> Language (Krio / Français)</div>
                        </div>
                      )}

                      {ussdScreen === "opt1" && (
                        <div className="ussd-menu-body">
                          <p style={{ color: "#10B981", fontWeight: 700, marginBottom: "8px" }}>END Power Tomorrow: ABUNDANT</p>
                          <p>Expected Solar: 5.4 kWh/kWp (p50)</p>
                          <p>Clinic Cold Chain: 100% Protected</p>
                          <p>Diesel Genset: ZERO HOURS PLANNED</p>
                        </div>
                      )}

                      {ussdScreen === "opt2" && (
                        <div className="ussd-menu-body">
                          <p style={{ color: "#10B981", fontWeight: 700, marginBottom: "8px" }}>END Clinic Cold Chain: PROTECTED</p>
                          <p>Vaccine refrigerators secured at 3.9°C.</p>
                          <p>Hard reserve active: 3.4h safety buffer enforced under pessimistic p10 sun.</p>
                        </div>
                      )}

                      {ussdScreen === "opt3" && (
                        <div className="ussd-menu-body">
                          <p style={{ color: "#F59E0B", fontWeight: 700, marginBottom: "8px" }}>END Productive Window:</p>
                          <p>10:00 - 15:00 for cassava mills, grain processing, and water pumps during peak solar surplus.</p>
                        </div>
                      )}

                      {ussdScreen === "opt4" && (
                        <div className="ussd-menu-body">
                          <p style={{ color: "#F43F5E", fontWeight: 700, marginBottom: "8px" }}>END Outage Report Logged</p>
                          <p>Ticket #TK-849 assigned to Kambia sector 2 technician on duty. Thank you.</p>
                        </div>
                      )}

                      {ussdScreen === "lang" && (
                        <div className="ussd-menu-body">
                          <p style={{ color: "#38BDF8", fontWeight: 700, marginBottom: "8px" }}>SELECT LANGUAGE:</p>
                          <div className="ussd-item"><span className="ussd-num">1.</span> English</div>
                          <div className="ussd-item"><span className="ussd-num">2.</span> Krio (Sierra Leone)</div>
                          <div className="ussd-item"><span className="ussd-num">3.</span> Français</div>
                          <div className="ussd-item"><span className="ussd-num">4.</span> Hausa</div>
                        </div>
                      )}

                      {ussdScreen === "invalid" && (
                        <div className="ussd-menu-body">
                          <p style={{ color: "#F43F5E", fontWeight: 700, marginBottom: "8px" }}>END Invalid Selection</p>
                          <p>Please redial *384*529# to start over.</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Tap Pills for USSD */}
                    {ussdScreen === "root" && (
                      <div className="sms-quick-pills" style={{ padding: "6px 0 2px" }}>
                        <button type="button" onClick={() => handleUssdSubmit(undefined, "1")} className="sms-quick-btn">1: Power</button>
                        <button type="button" onClick={() => handleUssdSubmit(undefined, "2")} className="sms-quick-btn">2: Clinic</button>
                        <button type="button" onClick={() => handleUssdSubmit(undefined, "3")} className="sms-quick-btn">3: Mills</button>
                        <button type="button" onClick={() => handleUssdSubmit(undefined, "4")} className="sms-quick-btn">4: Fault</button>
                        <button type="button" onClick={() => handleUssdSubmit(undefined, "0")} className="sms-quick-btn">0: Lang</button>
                      </div>
                    )}

                    {/* USSD In-Dialog Action Row */}
                    <div className="ussd-action-row">
                      {ussdScreen === "root" || ussdScreen === "lang" ? (
                        <form onSubmit={(e) => handleUssdSubmit(e)} style={{ display: "flex", gap: "6px", width: "100%" }}>
                          <input
                            type="text"
                            value={ussdInput}
                            onChange={(e) => setUssdInput(e.target.value)}
                            placeholder="Option (0-4)..."
                            className="ussd-input"
                          />
                          <button type="submit" className="ussd-btn-send">
                            Send
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUssdScreen("root");
                            addTerminalLog("USSD-RESET", "ussd", "ussd", "Session reset to root menu *384*529#.");
                          }}
                          className="ussd-btn-back"
                        >
                          ← Dial *384*529# Again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- 3. WHATSAPP CHANNEL -------------------- */}
              {phoneChannel === "whatsapp" && (
                <div className="whatsapp-view-container">
                  {/* WhatsApp Emerald Header */}
                  <div className="whatsapp-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="whatsapp-avatar">L</div>
                      <div>
                        <div className="whatsapp-title">
                          <span>Layt Mini-Grid</span>
                          <CheckCircleIcon size={13} className="text-[#10B981]" />
                        </div>
                        <div className="whatsapp-subtitle">Official Business Account · Online</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "10px", color: "#8696A0", fontFamily: "var(--font-mono)" }}>GSM 2G</span>
                  </div>

                  {/* WhatsApp Chat Messages */}
                  <div className="whatsapp-chat-body">
                    <div className="whatsapp-encryption-notice">
                      🔒 Messages are end-to-end encrypted. Layt AI Gateway.
                    </div>

                    {whatsappChat.map((msg, i) => (
                      <div key={i} className={`whatsapp-msg-card ${msg.sender === "user" ? "user" : ""}`}>
                        {msg.sender === "bot" && (
                          <div style={{ color: "#F59E0B", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <ZapIcon size={13} className="text-sun" />
                            <span>Daily Community Power Dispatch</span>
                          </div>
                        )}
                        <div>{msg.text}</div>
                        <div style={{ fontSize: "9.5px", color: msg.sender === "user" ? "#A7F3D0" : "#8696A0", textAlign: "right", marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "3px" }}>
                          <span>{msg.time}</span>
                          <span style={{ color: msg.sender === "user" ? "#A7F3D0" : "#53BDEB" }}>✓✓</span>
                        </div>
                      </div>
                    ))}

                    {/* WhatsApp Action Buttons */}
                    <div className="whatsapp-btn-group">
                      <button
                        type="button"
                        onClick={() => handleWhatsappSend("1: Check Tomorrow's Power")}
                        className="whatsapp-action-btn"
                      >
                        <ZapIcon size={12} />
                        <span>⚡ Check Tomorrow&apos;s Power</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWhatsappSend("2: Grain Mill & Water Pump Hours")}
                        className="whatsapp-action-btn"
                      >
                        <PumpIcon size={12} />
                        <span>🌾 Grain Mill &amp; Pump Hours</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWhatsappSend("3: Clinic Vaccine Buffer Status")}
                        className="whatsapp-action-btn"
                      >
                        <ClinicIcon size={12} />
                        <span>🏥 Clinic Vaccine Buffer</span>
                      </button>
                    </div>
                  </div>

                  {/* Audio Note Preview Bar */}
                  <div className="whatsapp-audio-bar">
                    <button
                      type="button"
                      onClick={() => addTerminalLog("AUDIO-VOICE", "core", "core", "Streaming 14s Krio regional voice note broadcast: Pawa Tɔmɔro.")}
                      className="whatsapp-play-btn"
                      title="Play Voice Note"
                    >
                      ▶
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#E9EDEF", marginBottom: "2px" }}>
                        <span>Voice Note (Krio): Pawa Tɔmɔro</span>
                        <span style={{ color: "#8696A0", fontSize: "9.5px" }}>0:14</span>
                      </div>
                      <div className="whatsapp-waveform">
                        {[4, 8, 14, 6, 12, 16, 10, 14, 8, 12, 4, 10, 14, 8, 6, 12, 14, 8, 4].map((h, idx) => (
                          <span key={idx} className={`waveform-bar ${idx < 7 ? "active" : ""}`} style={{ height: `${h}px` }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Message Input */}
                  <form onSubmit={(e) => { e.preventDefault(); handleWhatsappSend(whatsappInputText); }} className="sms-form" style={{ background: "#1F2C34", padding: "6px 10px" }}>
                    <input
                      type="text"
                      value={whatsappInputText}
                      onChange={(e) => setWhatsappInputText(e.target.value)}
                      placeholder="Type a message or question..."
                      className="sms-input"
                      style={{ background: "#2A3942", borderColor: "#3B4E5A" }}
                    />
                    <button type="submit" className="sms-btn-send" style={{ background: "#00A884", color: "#FFFFFF" }}>
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Hardware T9 Keypad (Tactile numeric input for feature phone) */}
            <div className="hardware-keypad" role="group" aria-label="Feature phone physical keypad">
              <button type="button" onClick={() => handleKeypadPress("1")} className="keypad-btn">
                <span className="key-num">1</span>
                <span className="key-sub">STATUS</span>
              </button>
              <button type="button" onClick={() => handleKeypadPress("2")} className="keypad-btn">
                <span className="key-num">2</span>
                <span className="key-sub">ABC / MILL</span>
              </button>
              <button type="button" onClick={() => handleKeypadPress("3")} className="keypad-btn">
                <span className="key-num">3</span>
                <span className="key-sub">DEF / CLINIC</span>
              </button>

              <button type="button" onClick={() => handleKeypadPress("4")} className="keypad-btn">
                <span className="key-num">4</span>
                <span className="key-sub">GHI / FAULT</span>
              </button>
              <button type="button" onClick={() => handleKeypadPress("5")} className="keypad-btn">
                <span className="key-num">5</span>
                <span className="key-sub">JKL</span>
              </button>
              <button type="button" onClick={() => handleKeypadPress("6")} className="keypad-btn">
                <span className="key-num">6</span>
                <span className="key-sub">MNO</span>
              </button>

              <button type="button" onClick={() => handleKeypadPress("7")} className="keypad-btn">
                <span className="key-num">7</span>
                <span className="key-sub">PQRS</span>
              </button>
              <button type="button" onClick={() => handleKeypadPress("8")} className="keypad-btn">
                <span className="key-num">8</span>
                <span className="key-sub">TUV</span>
              </button>
              <button type="button" onClick={() => handleKeypadPress("9")} className="keypad-btn">
                <span className="key-num">9</span>
                <span className="key-sub">WXYZ</span>
              </button>

              <button type="button" onClick={() => handleKeypadPress("*")} className="keypad-btn">
                <span className="key-num">*</span>
                <span className="key-sub">STAR</span>
              </button>
              <button type="button" onClick={() => handleKeypadPress("0")} className="keypad-btn">
                <span className="key-num">0</span>
                <span className="key-sub">LANG</span>
              </button>
              <button type="button" onClick={() => handleKeypadPress("#")} className="keypad-btn">
                <span className="key-num">#</span>
                <span className="key-sub">SEND</span>
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress("CALL")}
                className="keypad-btn key-call"
                title="Send / Call"
              >
                <span className="key-num text-xs">📞 SEND / CALL</span>
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress("END")}
                className="keypad-btn key-end"
                title="End / Clear"
              >
                <span className="key-num text-xs">END</span>
              </button>
            </div>
          </div>

          {/* =========================================================
              RIGHT: The Actual Live Telecom Gateway & SMPP Terminal
              ========================================================= */}
          <div className="gateway-terminal-panel">
            {/* Title Bar */}
            <div className="gateway-terminal-titlebar">
              <div className="flex items-center gap-2">
                <div className="terminal-window-dots">
                  <span className="dot-red" />
                  <span className="dot-amber" />
                  <span className="dot-green" />
                </div>
                <span className="terminal-title-text font-mono">
                  layt@edge-gateway: /var/log/telecom/smpp.log · 115200 baud
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                GATEWAY ONLINE (114ms)
              </span>
            </div>

            {/* Telecom Hardware & Protocol Chips */}
            <div className="terminal-telecom-chips">
              <div className="telecom-chip status-green">
                <i />
                <span>Africa&apos;s Talking: ACTIVE (HTTP/2)</span>
              </div>
              <div className="telecom-chip status-green">
                <i />
                <span>Twilio SMPP: BOUND_TRX (Port 2775)</span>
              </div>
              <div className="telecom-chip status-amber">
                <i />
                <span>SIM7600G Modem: RS232 (-74 dBm)</span>
              </div>
              <div className="telecom-chip">
                <span>GSM-7 SMSC Encoding: VALIDATED</span>
              </div>
            </div>

            {/* Carrier Filter HUD */}
            <div className="terminal-filter-hud">
              <div className="terminal-filter-tabs">
                <button
                  type="button"
                  onClick={() => setTerminalFilter("all")}
                  className={`terminal-filter-btn ${terminalFilter === "all" ? "active" : ""}`}
                >
                  All PDUs ({terminalLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter("smpp")}
                  className={`terminal-filter-btn ${terminalFilter === "smpp" ? "active" : ""}`}
                >
                  SMPP SMS
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter("ussd")}
                  className={`terminal-filter-btn ${terminalFilter === "ussd" ? "active" : ""}`}
                >
                  USSD GSM
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter("broadcast")}
                  className={`terminal-filter-btn ${terminalFilter === "broadcast" ? "active" : ""}`}
                >
                  Broadcasts
                </button>
              </div>
              <span className="terminal-rate-counter">
                ● RX: 1.4 kbps · CSQ: 25/31
              </span>
            </div>

            {/* Rolling Terminal Body */}
            <div className="gateway-terminal-body">
              {filteredLogs.map((log) => (
                <div key={log.id} className="terminal-line">
                  <span className="line-time">[{log.time}]</span>
                  <span className={`line-tag tag-${log.tagType}`}>[{log.tag}]</span>
                  <span className="line-content">{log.content}</span>
                </div>
              ))}
            </div>

            {/* Terminal Control Actions Bar */}
            <div className="gateway-terminal-toolbar">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => simulateBroadcast("blackout")}
                  className="btn-terminal-squall"
                >
                  <AlertTriangleIcon size={13} className="text-[#F43F5E]" />
                  <span>Simulate Squall Broadcast</span>
                </button>
                <button
                  type="button"
                  onClick={() => simulateBroadcast("surplus")}
                  className="btn-terminal-surplus"
                >
                  <ZapIcon size={13} className="text-[#10B981]" />
                  <span>Simulate Surplus Mill Alert</span>
                </button>
                <button
                  type="button"
                  onClick={() => simulateBroadcast("clinic")}
                  className="btn-terminal-clinic"
                >
                  <ClinicIcon size={13} className="text-[#38BDF8]" />
                  <span>Clinic Telemetry Ping</span>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    setTerminalLogs([
                      {
                        id: `log-${Date.now()}`,
                        time: now,
                        tag: "NOC-RESET",
                        tagType: "core",
                        category: "core",
                        content: "Terminal buffer cleared. Gateway transceiver listening on smpp:2775...",
                      },
                    ]);
                  }}
                  className="btn-ghost-sm text-xs font-mono"
                >
                  Clear Buffer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const raw = filteredLogs.map((l) => `[${l.time}] [${l.tag}] ${l.content}`).join("\n");
                    navigator.clipboard?.writeText(raw);
                    addTerminalLog("CLIPBOARD", "dlr", "core", "Copied raw SMPP/USSD packet stream to clipboard.");
                  }}
                  className="btn-pill text-xs font-mono"
                >
                  Copy Log (PDU)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
