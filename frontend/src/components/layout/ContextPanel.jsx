/**
 * ContextPanel.jsx — Eden Intelligence Platform
 * OSINT Mission Log · Cold Intelligence / Forensic Terminal aesthetic
 * God Mode+ revision: glassmorphism + holographic scanlines, animated
 * telemetry-style digit counters, staggered mission-log mount animation,
 * magnetic energy-sweep row hovers, and scramble-decode headers.
 * Props/data structures unchanged: operations, activeId, onClear.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  Clock,
  Trash2,
  Radio,
  Activity,
  ChevronRight,
  Lock,
  Wifi,
} from "lucide-react";

/* ─── Helpers ─────────────────────────────────────────────────── */

const RISK_CONFIG = {
  high: {
    color: "#ff3b5c",
    label: "HIGH",
    glow: "rgba(255,59,92,0.6)",
    bg: "rgba(255,59,92,0.08)",
    border: "rgba(255,59,92,0.25)",
  },
  medium: {
    color: "#e8c84a",
    label: "MED",
    glow: "rgba(232,200,74,0.5)",
    bg: "rgba(232,200,74,0.07)",
    border: "rgba(232,200,74,0.22)",
  },
  low: {
    color: "#4ab8e8",
    label: "LOW",
    glow: "rgba(74,184,232,0.5)",
    bg: "rgba(74,184,232,0.07)",
    border: "rgba(74,184,232,0.2)",
  },
  pending: {
    color: "#6b7f94",
    label: "PEND",
    glow: "rgba(107,127,148,0.3)",
    bg: "rgba(107,127,148,0.06)",
    border: "rgba(107,127,148,0.18)",
  },
};

function formatTs(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncateUrl(url, max = 24) {
  if (!url) return "Local Upload";
  try {
    const u = new URL(url);
    const s = u.hostname + u.pathname;
    return s.length > max ? s.slice(0, max) + "…" : s;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

/* ─── Scramble-decode text (used for header labels) ──────────── */
const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#0123456789";
function useScrambleText(text, trigger) {
  const [display, setDisplay] = useState(text);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!trigger) { setDisplay(text); return; }
    let frame = 0;
    const totalFrames = 14;
    const step = () => {
      frame += 1;
      const progress = frame / totalFrames;
      const revealCount = Math.floor(progress * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealCount) out += text[i];
        else if (text[i] === " ") out += " ";
        else out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      setDisplay(out);
      if (frame < totalFrames) {
        timeoutRef.current = setTimeout(step, 26);
      } else {
        setDisplay(text);
      }
    };
    step();
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, text]);

  return display;
}

/* ─── Animated telemetry digit counter ───────────────────────── */
function AnimatedCounter({ value, color }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) { setDisplay(to); return; }
    const duration = 420;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.4, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "inline-block", color, textShadow: `0 0 12px ${color}88` }}
    >
      {display}
    </motion.span>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function ScanlineOverlay() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(74,184,232,0.018) 2px, rgba(74,184,232,0.018) 4px)",
          zIndex: 0,
        }}
      />
      {/* traveling holographic scan band */}
      <motion.div
        aria-hidden
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "22%",
          background: "linear-gradient(180deg, transparent, rgba(74,184,232,0.05), transparent)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* faint grid */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.04,
          backgroundImage:
            "linear-gradient(rgba(74,184,232,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(74,184,232,0.8) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          zIndex: 0,
        }}
      />
    </>
  );
}

function LiveIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <motion.div
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#4ab8e8",
          boxShadow: "0 0 8px #4ab8e8",
        }}
      />
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.15em",
          color: "#4ab8e8",
          opacity: 0.8,
        }}
      >
        LIVE
      </span>
    </div>
  );
}

function RiskBadge({ riskLevel, riskScore, hovered }) {
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.pending;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 3,
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{
          boxShadow: hovered
            ? [`0 0 4px ${cfg.glow}`, `0 0 14px ${cfg.glow}`, `0 0 4px ${cfg.glow}`]
            : `0 0 0px ${cfg.glow}`,
        }}
        transition={{ duration: 1.2, repeat: hovered ? Infinity : 0, ease: "easeInOut" }}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.12em",
          color: cfg.color,
          textShadow: `0 0 ${hovered ? 12 : 8}px ${cfg.glow}`,
          fontWeight: 700,
          background: hovered ? cfg.bg.replace(/[\d.]+\)$/, "0.14)") : cfg.bg,
          border: `1px solid ${hovered ? cfg.color : cfg.border}`,
          borderRadius: 3,
          padding: "1px 5px",
          lineHeight: 1.6,
          transition: "background 0.2s, border-color 0.2s",
        }}
      >
        {cfg.label}
      </motion.div>
      {riskScore != null && (
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: cfg.color,
            opacity: 0.75,
          }}
        >
          {Math.round(riskScore * 100)}%
        </div>
      )}
    </div>
  );
}

function RiskBar({ riskScore, riskLevel }) {
  if (riskScore == null) return null;
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.pending;
  return (
    <div
      style={{
        height: 2,
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 1,
        overflow: "hidden",
        marginTop: 6,
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${riskScore * 100}%` }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
        style={{
          height: "100%",
          background: cfg.color,
          boxShadow: `0 0 6px ${cfg.glow}`,
          borderRadius: 1,
        }}
      />
    </div>
  );
}

const rowVariants = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0 },
};

function OperationRow({ op, isActive }) {
  const cfg = RISK_CONFIG[op.riskLevel] || RISK_CONFIG.pending;
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/operation/${op.id}`}
      className="mission-log-row"
      style={{ textDecoration: "none", display: "block" }}
    >
      <motion.div
        variants={rowVariants}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        exit={{ opacity: 0, x: -8 }}
        animate={{
          x: hovered ? 4 : 0,
        }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        style={{
          position: "relative",
          padding: "10px 12px",
          borderRadius: 6,
          border: isActive
            ? `1px solid ${cfg.border}`
            : `1px solid ${hovered ? "rgba(74,184,232,0.2)" : "rgba(30,42,56,0.7)"}`,
          background: isActive
            ? cfg.bg
            : hovered
              ? "rgba(74,184,232,0.05)"
              : "rgba(8,11,15,0.5)",
          cursor: "pointer",
          transition: "border 0.2s, background 0.2s",
          overflow: "hidden",
          boxShadow: hovered ? `0 4px 20px -8px ${cfg.glow}` : "none",
        }}
      >
        {/* energy sweep on hover */}
        {hovered && (
          <motion.span
            key="row-sweep"
            initial={{ x: "-120%" }}
            animate={{ x: "220%" }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "45%",
              background: `linear-gradient(90deg, transparent, ${cfg.glow.replace(/[\d.]+\)$/, "0.14)")}, transparent)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Left accent strip */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: isActive || hovered ? cfg.color : "transparent",
            boxShadow: isActive || hovered ? `0 0 8px ${cfg.glow}` : "none",
            borderRadius: "6px 0 0 6px",
            transition: "background 0.2s",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          {/* Left: label + url */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "#4ab8e8",
                opacity: 0.65,
                marginBottom: 3,
                textTransform: "uppercase",
              }}
            >
              {op.label || `OP-${String(op.id).slice(0, 6).toUpperCase()}`}
            </div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5,
                color: hovered || isActive ? "#c8d8e8" : "#8fa3b4",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "color 0.2s",
                maxWidth: "100%",
              }}
            >
              {truncateUrl(op.url)}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginTop: 5,
              }}
            >
              <Clock size={9} color="#4a6070" />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  color: "#4a6070",
                  letterSpacing: "0.08em",
                }}
              >
                {formatTs(op.timestamp)}
              </span>
            </div>
          </div>

          {/* Right: risk badge */}
          <RiskBadge riskLevel={op.riskLevel} riskScore={op.riskScore} hovered={hovered} />
        </div>

        <RiskBar riskScore={op.riskScore} riskLevel={op.riskLevel} />

        {/* Hover chevron */}
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -4 }}
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
          }}
        >
          <ChevronRight size={10} color={cfg.color} />
        </motion.div>
      </motion.div>
    </Link>
  );
}

function StatCounter({ label, value, color = "#4ab8e8" }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        <AnimatedCounter value={value} color={color} />
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8,
          letterSpacing: "0.12em",
          color: "#3a5060",
          marginTop: 3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────── */

export default function ContextPanel({ operations = [], activeId = null, onClear }) {
  const scrollRef = useRef(null);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const eyebrowText = useScrambleText("EDEN", mounted);
  const subText = useScrambleText("OSINT OPS", headerHovered || mounted);
  const missionLabel = useScrambleText("MISSION LOG", mounted);

  const stats = {
    total: operations.length,
    high: operations.filter((o) => o.riskLevel === "high").length,
    cleared: operations.filter((o) => o.riskLevel === "low").length,
  };

  // Auto-scroll to top when a new operation is added
  useEffect(() => {
    if (scrollRef.current && operations.length > 0) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [operations.length]);

  const handleHeaderEnter = useCallback(() => setHeaderHovered(true), []);
  const handleHeaderLeave = useCallback(() => setHeaderHovered(false), []);

  return (
    <div
      style={{
        width: 240,
        minWidth: 240,
        height: "100vh",
        background: "linear-gradient(180deg, rgba(8,11,15,0.86) 0%, rgba(10,14,20,0.92) 100%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderRight: "1px solid #1e2a38",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <ScanlineOverlay />

      {/* ── Header ── */}
      <div
        onMouseEnter={handleHeaderEnter}
        onMouseLeave={handleHeaderLeave}
        style={{
          padding: "18px 16px 14px",
          borderBottom: "1px solid #1e2a38",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Top bar: logo mark + live indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div
              animate={{
                opacity: [0.7, 1, 0.7],
                boxShadow: [
                  "0 0 10px rgba(74,184,232,0.1) inset",
                  "0 0 18px rgba(74,184,232,0.25) inset",
                  "0 0 10px rgba(74,184,232,0.1) inset",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                width: 28,
                height: 28,
                border: "1px solid rgba(74,184,232,0.4)",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(74,184,232,0.06)",
              }}
            >
              <Shield size={14} color="#4ab8e8" />
            </motion.div>
            <div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#c8d8e8",
                  letterSpacing: "0.1em",
                  lineHeight: 1,
                  minWidth: 40,
                }}
              >
                {eyebrowText}
              </div>
              <div
                style={{
                  fontSize: 8,
                  letterSpacing: "0.1em",
                  color: "#3a5060",
                  marginTop: 1,
                  minWidth: 60,
                }}
              >
                {subText}
              </div>
            </div>
          </div>
          <LiveIndicator />
        </div>

        {/* Stats row — telemetry readouts */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
            alignItems: "center",
            background: "rgba(74,184,232,0.03)",
            border: "1px solid rgba(30,42,56,0.8)",
            borderRadius: 6,
            padding: "10px 0",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <StatCounter label="TOTAL" value={stats.total} color="#4ab8e8" />
          <div style={{ width: 1, height: 28, background: "#1e2a38" }} />
          <StatCounter label="HIGH" value={stats.high} color="#ff3b5c" />
          <div style={{ width: 1, height: 28, background: "#1e2a38" }} />
          <StatCounter label="CLEAR" value={stats.cleared} color="#3cb878" />
        </div>
      </div>

      {/* ── Section label ── */}
      <div
        style={{
          padding: "10px 16px 8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={10} color="#3a5060" />
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.16em",
              color: "#3a5060",
              textTransform: "uppercase",
              minWidth: 78,
              display: "inline-block",
            }}
          >
            {missionLabel}
          </span>
        </div>
        <AnimatePresence>
          {operations.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClear}
              style={{
                background: "rgba(255,59,92,0.08)",
                border: "1px solid rgba(255,59,92,0.2)",
                borderRadius: 4,
                padding: "3px 7px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "#ff3b5c",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8,
                letterSpacing: "0.12em",
              }}
            >
              <Trash2 size={8} />
              PURGE
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Operations List ── */}
      <div
        ref={scrollRef}
        className="mission-log-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 10px 16px",
          position: "relative",
          zIndex: 1,
          scrollbarWidth: "thin",
          scrollbarColor: "#1e2a38 transparent",
        }}
      >
        <AnimatePresence mode="popLayout">
          {operations.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 48,
                gap: 12,
              }}
            >
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Radio size={24} color="#1e2a38" />
              </motion.div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: "#2a3a48",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  AWAITING OPERATIONS
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "#1e2a38",
                    lineHeight: 1.6,
                    letterSpacing: "0.06em",
                  }}
                >
                  Submit a URL to begin
                  <br />
                  intelligence analysis
                </div>
              </div>
              {/* Dashed placeholder lines */}
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "85%",
                    height: 36,
                    border: "1px dashed #1a2530",
                    borderRadius: 5,
                    opacity: 1 - i * 0.18,
                  }}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              {operations.map((op) => (
                <OperationRow
                  key={op.id}
                  op={op}
                  isActive={String(op.id) === String(activeId)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid #1e2a38",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Lock size={9} color="#2a3a48" />
          <span
            style={{
              fontSize: 8,
              letterSpacing: "0.12em",
              color: "#2a3a48",
            }}
          >
            SECURE CHANNEL
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Wifi size={9} color="#2a3a48" />
          <span style={{ fontSize: 8, color: "#2a3a48", letterSpacing: "0.1em" }}>
            E2E
          </span>
        </div>
      </div>
    </div>
  );
}