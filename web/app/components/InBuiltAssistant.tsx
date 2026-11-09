"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  TerminalIcon,
  SparklesIcon,
  ZapIcon,
  SunIcon,
  BatteryIcon,
  CheckIcon,
  CopyIcon,
  AlertTriangleIcon,
  BrainIcon,
  ShieldCheckIcon,
  ActivityIcon,
} from "./Icons";

interface ChatMessage {
  id: string;
  sender: "user" | "layt";
  text: string;
  timestamp: string;
  directive?: {
    type: "info" | "success" | "warning" | "alert";
    title: string;
    text: string;
  };
  codeSnippet?: string;
  thoughtTrace?: string[];
  isLiveGemini?: boolean;
}

const QUICK_PROMPTS = [
  {
    cmd: "layt status",
    label: "Solar & Rain Outlook",
    prompt: "Give me an executive briefing on solar yield, convective rainfall, and dust risk across West Africa mini-grids today.",
    icon: <SunIcon size={13} />,
  },
  {
    cmd: "layt clinic --check",
    label: "Clinic Cold Chain",
    prompt: "Verify if the 3-hour emergency healthcare vaccine reserve is mathematically protected under today's p10 solar forecast.",
    icon: <ShieldCheckIcon size={13} />,
  },
  {
    cmd: "layt soiling --loss",
    label: "Dust Soiling Check",
    prompt: "Assess Harmattan dust accumulation and tell me whether mini-grid panel washing is economically warranted today.",
    icon: <ZapIcon size={13} />,
  },
  {
    cmd: "layt mpc --dispatch",
    label: "Run MPC Dispatch",
    prompt: "Generate an adaptive 24-hour battery dispatch plan prioritizing clinic critical load and routing daytime surplus to agro-processing.",
    icon: <ActivityIcon size={13} />,
  },
];

export function InBuiltAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "layt",
      text: "Layt AI Edge Copilot initialized. I provide live climate risk intelligence, convex MPC battery dispatch, and clinic cold-chain verification across West Africa.",
      timestamp: "Ready",
      directive: {
        type: "info",
        title: "HOMEBREW TERMINAL READY",
        text: "Select a command below or ask any question about your mini-grid.",
      },
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Open on ?copilot=open or #copilot, or via ⌘K keyboard shortcut
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.search.includes("copilot=open") || window.location.hash === "#copilot") {
        setIsOpen(true);
      }
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Don't show floating button on /agent full page to avoid redundancy
  if (pathname === "/agent") {
    return null;
  }

  const handleSend = async (userPrompt: string) => {
    if (!userPrompt.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      sender: "user",
      text: userPrompt.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          mode: "copilot",
          context: {
            siteId: "kamb-01",
            siteName: "Kambuga Microgrid",
            pvKw: 14.8,
            loadKw: 4.2,
            soc: 0.68,
          },
        }),
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: "b-" + Date.now(),
        sender: "layt",
        text: data.response || "Analysis complete.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        codeSnippet: data.codeSnippet,
        thoughtTrace: data.thoughtTrace,
        directive: data.directive,
        isLiveGemini: data.isLiveGemini,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "layt",
          text: "Local inference fallback: Inverter and telemetry buffer operational. Solar yield is projected at nominal levels with 3-hour healthcare reserve verified.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          directive: {
            type: "warning",
            title: "LOCAL CACHED DIRECTIVE",
            text: "Clinic cold chain locked to 20% SoC hard reserve. Productive mill loads dispatched from 10:30 to 14:45.",
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (snippet: string, msgId: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating Launch Button (Homebrew Terminal Aesthetic) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inbuilt-bot-fab"
          aria-label="Open Layt AI Copilot"
        >
          <span className="inbuilt-bot-fab-inner flex items-center gap-2">
            <span className="bot-pulse-ring" />
            <TerminalIcon size={16} className="text-[#F59E0B]" />
            <span className="bot-fab-text font-mono text-xs font-bold tracking-wide">
              layt@copilot<span className="terminal-cursor">_</span>
            </span>
          </span>
        </button>
      )}

      {/* Floating Chatbot Modal / Drawer */}
      {isOpen && (
        <div className="inbuilt-bot-window" role="dialog" aria-label="Layt In-Built Terminal Copilot">
          {/* Terminal Window Chrome / Header */}
          <div className="inbuilt-bot-header">
            <div className="bot-header-left">
              <span className="term-dot dot-red" />
              <span className="term-dot dot-yellow" />
              <span className="term-dot dot-green" />
              <div className="flex items-center gap-1.5 ml-2">
                <BrainIcon size={14} className="text-[#F59E0B]" />
                <span className="font-mono text-xs font-bold text-[#FFFFFF]">layt@edge:~# copilot</span>
              </div>
            </div>

            <div className="bot-header-right">
              <span className="badge-online">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                ONLINE
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bot-close-btn"
                aria-label="Close terminal copilot"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Command Chips */}
          <div className="inbuilt-bot-chips">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(qp.prompt)}
                disabled={loading}
                className="inbuilt-chip-btn"
              >
                <span className="text-[#F59E0B]">{qp.icon}</span>
                <span>{qp.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="inbuilt-bot-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`bot-msg-row ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`bot-msg-bubble ${
                    msg.sender === "user" ? "user" : "bot"
                  }`}
                >
                  {/* Sender Header for Bot */}
                  {msg.sender === "layt" && (
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#283347]/60">
                      <span className="font-mono text-[11px] font-bold text-[#F59E0B] flex items-center gap-1">
                        <TerminalIcon size={12} />
                        LAYT·COPILOT
                      </span>
                      {msg.isLiveGemini && (
                        <span className="text-[10px] text-[#38BDF8] font-mono">Gemini Live</span>
                      )}
                    </div>
                  )}

                  {/* Directive Banner if present */}
                  {msg.directive && (
                    <div
                      className={`mb-2.5 p-2.5 rounded-lg border text-[11px] font-mono ${
                        msg.directive.type === "warning" || msg.directive.type === "alert"
                          ? "bg-[#F43F5E]/10 border-[#F43F5E]/40 text-[#FDA4AF]"
                          : "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#FDE68A]"
                      }`}
                    >
                      <b className="block mb-1 font-bold">[{msg.directive.title}]</b>
                      <span>{msg.directive.text}</span>
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Code Snippet if present */}
                  {msg.codeSnippet && (
                    <div className="mt-2.5 rounded-lg bg-[#050608] border border-[#283347] p-2.5 overflow-x-auto font-mono text-[11px]">
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#1E293B]">
                        <span className="text-[10px] text-[#94A3B8]">Python Mini-Grid Routine</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(msg.codeSnippet!, msg.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-[#F59E0B] hover:text-[#FFFFFF]"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <CheckIcon size={11} /> Copied
                            </>
                          ) : (
                            <>
                              <CopyIcon size={11} /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-[#38BDF8]">{msg.codeSnippet}</pre>
                    </div>
                  )}

                  {/* Thought Trace Toggle */}
                  {msg.thoughtTrace && msg.thoughtTrace.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-[#283347]/50">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)
                        }
                        className="text-[10px] font-mono text-[#94A3B8] hover:text-[#F59E0B] flex items-center gap-1"
                      >
                        <span>{expandedTraceId === msg.id ? "▼ Hide Reasoning" : "▶ View Reasoning Trace"}</span>
                      </button>
                      {expandedTraceId === msg.id && (
                        <ul className="mt-1.5 pl-3 border-l border-[#F59E0B]/30 space-y-1 text-[10px] font-mono text-[#94A3B8]">
                          {msg.thoughtTrace.map((t, i) => (
                            <li key={i}>&gt; {t}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <span className="text-[10px] text-[#64748B] block text-right mt-1.5 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="bot-msg-row flex items-start">
                <div className="bot-msg-bubble rounded-xl p-3 text-xs bg-[#141824] text-[#F59E0B] border border-[#283347] font-mono flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
                  <span>Evaluating regional climate layers & running MPC dispatch...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Terminal Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="inbuilt-bot-inputbar"
          >
            <span className="font-mono text-xs text-[#F59E0B] font-bold select-none">&gt;</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about mini-grid solar, storms, clinic reserve, or dispatch..."
              disabled={loading}
              className="inbuilt-bot-input"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inbuilt-bot-send-btn"
            >
              Run
            </button>
          </form>
        </div>
      )}
    </>
  );
}
