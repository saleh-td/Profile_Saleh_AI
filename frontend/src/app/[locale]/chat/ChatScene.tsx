"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Dictionary } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/locales";
import s from "./chat.module.css";

/* ── Types ── */
type Message = {
  id: string;
  role: "user" | "system" | "ai";
  content: string;
  ts: string;
};

type Props = { locale: Locale; dict: Dictionary };

/* ── Helpers ── */
const ts = () =>
  new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const hexId = () => Math.random().toString(16).slice(2, 6);

/* ═══════════════════════════════════════
   ChatScene — Neural Interface
   ═══════════════════════════════════════ */
export function ChatScene({ locale, dict }: Props) {
  const router = useRouter();
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTextRef = useRef("");

  /* ── State ── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [typingId, setTypingId] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [booted, setBooted] = useState(false);
  const [sessionId, setSessionId] = useState("0000");

  /* hydration-safe: generate random session id on client only */
  useEffect(() => { setSessionId(hexId()); }, []);

  /* ── Live metrics ── */
  const [metrics, setMetrics] = useState({
    latency: 42,
    tokenGen: 38,
    memory: 4.2,
    tokensUsed: 0,
  });

  /* ── Uptime ── */
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setUptime((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtUptime = useCallback(() => {
    const m = String(Math.floor(uptime / 60)).padStart(2, "0");
    const sec = String(uptime % 60).padStart(2, "0");
    return `00:${m}:${sec}`;
  }, [uptime]);

  /* ── Boot sequence ── */
  useEffect(() => {
    let cancelled = false;
    const boots = [
      dict.chat.boot1,
      dict.chat.boot2,
      dict.chat.boot3,
      dict.chat.boot4,
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    boots.forEach((text, i) => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setMessages((prev) => [
            ...prev,
            { id: `boot-${hexId()}-${i}`, role: "system", content: text, ts: ts() },
          ]);
          if (i === boots.length - 1) {
            setBooted(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }, 400 + i * 550)
      );
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setMessages([]);
      setBooted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Auto-scroll (smooth) ── */
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, typingText]);

  /* ── Typewriter effect ── */
  useEffect(() => {
    if (!typingId) return;
    const fullText = pendingTextRef.current;
    if (!fullText) return;

    let idx = 0;
    setTypingText("");

    const interval = setInterval(() => {
      idx++;
      setTypingText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(interval);
        setTypingId(null);
        setIsProcessing(false);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [typingId]);

  /* ── Metrics jitter ── */
  useEffect(() => {
    const t = setInterval(() => {
      setMetrics((p) => ({
        ...p,
        latency: Math.floor(Math.random() * 40 + 20),
        tokenGen: Math.floor(Math.random() * 30 + 25),
        memory: +(Math.random() * 0.5 + 4.0).toFixed(1),
      }));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  /* ── Send message ── */
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing || !booted) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      ts: ts(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);
    setMetrics((p) => ({
      ...p,
      tokensUsed: p.tokensUsed + trimmed.split(/\s+/).length * 3,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail =
          (typeof data.detail === "string" && data.detail) ||
          `HTTP_${res.status}`;
        throw new Error(detail);
      }

      const reply =
        data.response || data.reply || data.message || "No response received.";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: reply,
        ts: ts(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      pendingTextRef.current = reply;
      setTypingId(aiMsg.id);
      setMetrics((p) => ({
        ...p,
        tokensUsed: p.tokensUsed + reply.split(/\s+/).length * 3,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      const errText = `[ERR] ${msg}`;
      const errMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: errText,
        ts: ts(),
      };
      setMessages((prev) => [...prev, errMsg]);
      pendingTextRef.current = errText;
      setTypingId(errMsg.id);
    }
  };

  /* ── Disconnect ── */
  const handleDisconnect = () => {
    setIsDisconnecting(true);
    setTimeout(() => router.push(`/${locale}`), 250);
  };

  /* ── Key handler ── */
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Role → CSS class ── */
  const roleClass: Record<Message["role"], string> = {
    user: s.msgUser,
    system: s.msgSystem,
    ai: s.msgAi,
  };

  const rolePrefix: Record<Message["role"], string> = {
    user: "> ",
    system: "[SYS] ",
    ai: "[AI] ",
  };

  /* ═══════════════════════════════════
     Render
     ═══════════════════════════════════ */
  return (
    <>
      {/* Power-off overlay */}
      <AnimatePresence>
        {isDisconnecting && (
          <motion.div
            className={s.powerOff}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      <div className={`${s.scene} ${isProcessing ? s.thinking : ""}`}>
        {/* ── Background ── */}
        <div className={s.bgWrap}>
          <Image src="/bg.jpg" alt="" fill className={s.bgImg} priority />
          <div className={s.bgRadial} />
          <div
            className={`${s.bgPulse} ${isProcessing ? s.bgPulseActive : ""}`}
          />
        </div>

        {/* ── CRT scanline ── */}
        <div className={s.scanline} />

        {/* ── 3-column grid ── */}
        <div className={s.grid}>
          {/* LEFT — System Monitor */}
          <aside className={s.sidebar}>
            <div className={s.sidebarHead}>
              <span className={s.dot} />
              {dict.chat.sidebarTitle}
            </div>

            <div className={s.logGroup}>
              <LogRow k="MODEL" v={dict.chat.modelName} />
              <LogRow
                k="STATUS"
                v={isProcessing ? dict.chat.statusProcessing : dict.chat.statusIdle}
                active={isProcessing}
              />
              <LogRow k="LATENCY" v={`${metrics.latency}ms`} />
              <LogRow k="TOKEN_GEN" v={`${metrics.tokenGen}ms`} />
              <LogRow k="MEMORY" v={`${metrics.memory}GB`} />
              <LogRow k="TOKENS" v={`${metrics.tokensUsed}`} />
              <LogRow k="CTX_WIN" v="4096" />
              <LogRow k="TEMP" v="0.7" />
            </div>

            <div className={s.sidebarFooter}>
              <LogRow k={dict.chat.sessionLabel} v={`#${sessionId}`} />
              <LogRow k={dict.chat.uptimeLabel} v={fmtUptime()} />
            </div>
          </aside>

          {/* CENTER — Chat stream */}
          <main className={s.chatZone}>
            <div className={s.chatScroll} ref={chatRef}>
              <div className={s.chatContent}>
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`${s.msgRow} ${roleClass[msg.role]}`}
                    initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <span className={s.msgTs}>{msg.ts}</span>
                    <span className={s.msgPrefix}>{rolePrefix[msg.role]}</span>
                    <span className={s.msgText}>
                      {msg.id === typingId ? typingText : msg.content}
                      {msg.id === typingId && (
                        <span className={s.cursor}>_</span>
                      )}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* idle blinking cursor */}
              {booted && !isProcessing && (
                <div className={s.idleLine}>
                  <span className={s.cursor}>_</span>
                </div>
              )}
              </div>
            </div>

            {/* Input bar */}
            <div className={s.inputBar}>
              <span className={s.inputPrefix}>{dict.chat.inputPrefix}</span>
              <input
                ref={inputRef}
                type="text"
                className={s.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={dict.chat.inputPlaceholder}
                disabled={isProcessing || !booted}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </main>

          {/* RIGHT — Context panel */}
          <aside className={s.contextPanel}>
            <div className={s.contextHead}>{dict.chat.contextTitle}</div>

            <div className={s.contextBody}>
              <div className={s.contextSection}>
                <span className={s.contextLabel}>{dict.chat.sessionLabel}</span>
                <span className={s.contextVal}>#{sessionId}</span>
              </div>
              <div className={s.contextSection}>
                <span className={s.contextLabel}>{dict.chat.uptimeLabel}</span>
                <span className={s.contextVal}>{fmtUptime()}</span>
              </div>
              <div className={s.contextSection}>
                <span className={s.contextLabel}>TOKENS</span>
                <span className={s.contextVal}>{metrics.tokensUsed}</span>
              </div>

              <div className={s.contextDivider} />

              <div className={s.contextSection}>
                <span className={s.contextLabel}>SOURCES</span>
              </div>
              <div className={s.noSources}>{dict.chat.noSources}</div>
            </div>

            {/* Disconnect */}
            <button className={s.disconnect} onClick={handleDisconnect}>
              [{dict.chat.disconnect}]
            </button>
          </aside>
        </div>
        {/* ── Mobile FAB: disconnect ── */}
        <button className={s.disconnectFab} onClick={handleDisconnect} aria-label="Disconnect">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </button>
      </div>
    </>
  );
}

/* ── Small helper ── */
function LogRow({
  k,
  v,
  active,
}: {
  k: string;
  v: string;
  active?: boolean;
}) {
  return (
    <div className={s.logRow}>
      <span className={s.logKey}>{k}</span>
      <span className={`${s.logVal} ${active ? s.logValActive : ""}`}>{v}</span>
    </div>
  );
}
