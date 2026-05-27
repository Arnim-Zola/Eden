/**
 * PipelineStepper.jsx — Eden Intelligence Platform
 * Cold Intelligence / Forensic Terminal aesthetic
 * All hook logic, state, and prop signatures preserved exactly.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Circle, Radio, Terminal } from "lucide-react";

/* ─── Font injection ──────────────────────────────────────────── */
(function injectFonts() {
  if (typeof document === "undefined") return;
  const id = "eden-pipeline-fonts";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `
    @keyframes eden-spin { to { transform: rotate(360deg); } }
    @keyframes eden-pulse-ring {
      0%   { transform: scale(1);   opacity: 0.7; }
      100% { transform: scale(2.2); opacity: 0;   }
    }
    @keyframes eden-scanline {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }
    @keyframes eden-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes eden-flicker { 0%,100% { opacity:1; } 92% { opacity:1; } 93% { opacity:0.7; } 94% { opacity:1; } 97% { opacity:0.85; } }
    .eden-log-scroll::-webkit-scrollbar { width: 4px; }
    .eden-log-scroll::-webkit-scrollbar-track { background: transparent; }
    .eden-log-scroll::-webkit-scrollbar-thumb { background: #1e2a38; border-radius: 2px; }
  `;
  document.head.appendChild(style);
})();

/* ─── Constants ───────────────────────────────────────────────── */

const STAGES = [
  {
    key: "acquire",
    label: "ACQUIRE",
    sublabel: "Target Retrieval",
    logLines: [
      "Resolving DNS target endpoint...",
      "Establishing secure tunnel [TLS 1.3]",
      "Fetching content manifest...",
      "Validating content signatures...",
      "Asset acquisition complete.",
    ],
  },
  {
    key: "decode",
    label: "DECODE",
    sublabel: "Media Parsing",
    logLines: [
      "Initializing codec detection pipeline...",
      "Demuxing video container...",
      "Extracting keyframes [GOP analysis]",
      "Decoding audio streams...",
      "Frame buffer loaded — ready for analysis.",
    ],
  },
  {
    key: "transcribe",
    label: "TRANSCRIBE",
    sublabel: "Speech Extraction",
    logLines: [
      "Loading acoustic model v4.1...",
      "Speaker diarization: detecting voices...",
      "Running forced alignment pass...",
      "Generating word-level timestamps...",
      "Transcription corpus assembled.",
    ],
  },
  {
    key: "extract",
    label: "EXTRACT",
    sublabel: "Multimodal OCR",
    logLines: [
      "Initializing visual intelligence engine...",
      "Scanning frames for embedded text...",
      "Bounding box detection: active...",
      "OCR confidence threshold: 92.4%",
      "Text extraction finalized.",
    ],
  },
  {
    key: "analyze",
    label: "ANALYZE",
    sublabel: "Claim Corroboration",
    logLines: [
      "Cross-referencing intelligence corpus...",
      "Querying verified source database...",
      "Scoring claim credibility vectors...",
      "Building evidence graph...",
      "Analysis complete — generating report.",
    ],
  },
];

const phaseToStageIndex = (phase) => {
  if (!phase) return 0;
  const p = phase.toLowerCase();
  if (p.includes("acquir") || p.includes("fetch") || p.includes("download")) return 0;
  if (p.includes("decod") || p.includes("parse") || p.includes("extract_media")) return 1;
  if (p.includes("transcrib") || p.includes("speech") || p.includes("audio")) return 2;
  if (p.includes("ocr") || p.includes("visual") || p.includes("extract_text")) return 3;
  if (p.includes("analyz") || p.includes("correlat") || p.includes("report") || p.includes("complet")) return 4;
  return 0;
};

/* ─── Custom Hooks (logic preserved exactly) ─────────────────── */

function useElapsed() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return elapsed;
}

function useStageTimers(activeStageIndex) {
  const [timers, setTimers] = useState({});
  const prevIndex = useRef(activeStageIndex);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (activeStageIndex !== prevIndex.current) {
      prevIndex.current = activeStageIndex;
      setTimers((t) => ({ ...t, [activeStageIndex]: 0 }));
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimers((t) => ({
        ...t,
        [activeStageIndex]: (t[activeStageIndex] || 0) + 1,
      }));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [activeStageIndex]);

  return timers;
}

function useSignalLog(activeStageIndex, processingPhase) {
  const [lines, setLines] = useState([]);
  const firedStages = useRef(new Set());
  const phaseRef = useRef(null);

  const pushLine = useCallback((text, type = "info") => {
    const ts = new Date();
    const hh = String(ts.getHours()).padStart(2, "0");
    const mm = String(ts.getMinutes()).padStart(2, "0");
    const ss = String(ts.getSeconds()).padStart(2, "0");
    const ms = String(ts.getMilliseconds()).padStart(3, "0");
    setLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        text,
        type,
        timestamp: `${hh}:${mm}:${ss}.${ms}`,
        addr: `0x${Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .toUpperCase()
          .padStart(6, "0")}`,
      },
    ]);
  }, []);

  useEffect(() => {
    if (firedStages.current.has(activeStageIndex)) return;
    firedStages.current.add(activeStageIndex);
    const stage = STAGES[activeStageIndex];
    if (!stage) return;
    stage.logLines.forEach((line, i) => {
      setTimeout(() => pushLine(line, i === stage.logLines.length - 1 ? "success" : "info"), i * 620 + 180);
    });
  }, [activeStageIndex, pushLine]);

  useEffect(() => {
    if (!processingPhase || processingPhase === phaseRef.current) return;
    phaseRef.current = processingPhase;
    pushLine(`[BACKEND] Phase transition → ${processingPhase}`, "phase");
  }, [processingPhase, pushLine]);

  return lines;
}

/* ─── Visual Atoms ────────────────────────────────────────────── */

function ScanlineOverlay({ opacity = 0.022 }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(74,184,232,${opacity}) 2px,rgba(74,184,232,${opacity}) 4px)`,
        zIndex: 0,
      }}
    />
  );
}

function GridBg() {
  return (
    <svg
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.04 }}
    >
      <defs>
        <pattern id="ps-grid" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#4ab8e8" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="ps-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="65%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="ps-mask">
          <rect width="100%" height="100%" fill="url(#ps-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#ps-grid)" mask="url(#ps-mask)" />
    </svg>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/* ─── Stage Node ──────────────────────────────────────────────── */

function StageNode({ stage, index, status, stageTime }) {
  // status: 'done' | 'active' | 'pending'
  const isActive = status === "active";
  const isDone = status === "done";
  const isPending = status === "pending";

  const nodeColor = isDone ? "#3cb878" : isActive ? "#4ab8e8" : "#1e2a38";
  const textColor = isDone ? "#3cb878" : isActive ? "#4ab8e8" : "#2a3a48";
  const sublabelColor = isDone ? "#256040" : isActive ? "#2a6080" : "#1a2530";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        minWidth: 90,
        position: "relative",
      }}
    >
      {/* Node circle with pulse rings */}
      <div style={{ position: "relative", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Pulse rings — active only */}
        {isActive && (
          <>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(74,184,232,0.5)",
                  animation: `eden-pulse-ring 1.8s ease-out ${i * 0.9}s infinite`,
                  transformOrigin: "center",
                }}
              />
            ))}
          </>
        )}

        {/* Outer ring */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: `1.5px solid ${nodeColor}`,
            background: isDone
              ? "rgba(60,184,120,0.1)"
              : isActive
              ? "rgba(74,184,232,0.08)"
              : "rgba(13,17,23,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isDone
              ? "0 0 18px rgba(60,184,120,0.25)"
              : isActive
              ? "0 0 22px rgba(74,184,232,0.3), 0 0 44px rgba(74,184,232,0.1)"
              : "none",
            transition: "all 0.5s ease",
            position: "relative",
            zIndex: 1,
          }}
        >
          {isDone ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              <CheckCircle2 size={20} color="#3cb878" style={{ filter: "drop-shadow(0 0 6px rgba(60,184,120,0.8))" }} />
            </motion.div>
          ) : isActive ? (
            <div style={{ animation: "eden-spin 1.4s linear infinite" }}>
              <Loader2 size={20} color="#4ab8e8" style={{ filter: "drop-shadow(0 0 6px rgba(74,184,232,0.9))" }} />
            </div>
          ) : (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: "#2a3a48",
                letterSpacing: "0.05em",
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: textColor,
            transition: "color 0.4s",
            textShadow: isActive ? "0 0 10px rgba(74,184,232,0.5)" : "none",
          }}
        >
          {stage.label}
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 8.5,
            letterSpacing: "0.1em",
            color: sublabelColor,
            marginTop: 2,
            transition: "color 0.4s",
          }}
        >
          {stage.sublabel}
        </div>
        {/* Stage timer */}
        {(isActive || isDone) && stageTime != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: isDone ? "#256040" : "#2a6080",
              marginTop: 4,
              letterSpacing: "0.08em",
            }}
          >
            {formatTime(stageTime)}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Connector({ done }) {
  return (
    <div
      style={{
        flex: 1,
        height: 1,
        position: "relative",
        marginTop: 25, // Patched: aligned properly with the center of the 52px node
        overflow: "hidden",
      }}
    >
      {/* Base line */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: done ? "#3cb878" : "#1e2a38",
          transition: "background 0.6s ease",
          boxShadow: done ? "0 0 6px rgba(60,184,120,0.4)" : "none",
        }}
      />
      {/* Animated shimmer on done */}
      {done && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent, rgba(60,184,120,0.6), transparent)",
          }}
        />
      )}
    </div>
  );
}

/* ─── Log Line ────────────────────────────────────────────────── */

function LogLine({ line, isLast }) {
  const colors = {
    info: "#4a6070",
    success: "#3cb878",
    phase: "#e8c84a",
    error: "#ff3b5c",
  };
  const prefixes = {
    info: "  ›",
    success: "  ✓",
    phase: "  ⬡",
    error: "  ✗",
  };

  return (
    <motion.div
      className="eden-log-line"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "baseline",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        lineHeight: 1.7,
        padding: "1px 0",
      }}
    >
      {/* Timestamp */}
      <span style={{ color: "#1e3040", fontSize: 9, flexShrink: 0, letterSpacing: "0.05em" }}>
        {line.timestamp}
      </span>
      {/* Address */}
      <span style={{ color: "#1a3040", fontSize: 9, flexShrink: 0 }}>
        {line.addr}
      </span>
      {/* Prefix glyph */}
      <span style={{ color: colors[line.type] || colors.info, flexShrink: 0 }}>
        {prefixes[line.type] || prefixes.info}
      </span>
      {/* Text */}
      <span style={{ color: colors[line.type] || colors.info }}>
        {line.text}
      </span>
      {/* Blinking cursor on last line */}
      {isLast && (
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: "#4ab8e8",
            verticalAlign: "text-bottom",
            animation: "eden-blink 1.1s step-start infinite",
            marginLeft: 2,
            boxShadow: "0 0 6px rgba(74,184,232,0.8)",
          }}
        />
      )}
    </motion.div>
  );
}

/* ─── Main Component ──────────────────────────────────────────── */

export default function PipelineStepper({ processingPhase, jobId }) {
  const activeStageIndex = phaseToStageIndex(processingPhase);
  const elapsed = useElapsed();
  const stageTimers = useStageTimers(activeStageIndex);
  const logLines = useSignalLog(activeStageIndex, processingPhase);

  const logEndRef = useRef(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logLines.length]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 860,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        animation: "eden-flicker 8s infinite",
      }}
    >
      {/* ── Top header bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "rgba(8,11,15,0.95)",
          border: "1px solid #1e2a38",
          borderBottom: "none",
          borderRadius: "10px 10px 0 0",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ScanlineOverlay opacity={0.018} />
        {/* Left: title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Radio size={14} color="#4ab8e8" style={{ filter: "drop-shadow(0 0 5px rgba(74,184,232,0.9))" }} />
          </motion.div>
          <div>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: "0.22em",
                color: "#c8dde8",
                lineHeight: 1,
              }}
            >
              INTELLIGENCE PIPELINE
            </div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8.5,
                letterSpacing: "0.15em",
                color: "#2a4050",
                marginTop: 3,
              }}
            >
              JOB · {jobId ? String(jobId).toUpperCase().slice(0, 20) : "—"}
            </div>
          </div>
        </div>

        {/* Right: elapsed timer */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "right" }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 24,
              fontWeight: 600,
              color: "#4ab8e8",
              letterSpacing: "0.12em",
              textShadow: "0 0 16px rgba(74,184,232,0.5)",
              lineHeight: 1,
            }}
          >
            {formatTime(elapsed)}
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8,
              letterSpacing: "0.18em",
              color: "#1e3040",
              marginTop: 3,
            }}
          >
            ELAPSED
          </div>
        </div>

        {/* Processing phase badge */}
        {processingPhase && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1,
            }}
          >
            <motion.div
              key={processingPhase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "#e8c84a",
                background: "rgba(232,200,74,0.06)",
                border: "1px solid rgba(232,200,74,0.2)",
                borderRadius: 4,
                padding: "4px 12px",
                textShadow: "0 0 8px rgba(232,200,74,0.4)",
              }}
            >
              {processingPhase.toUpperCase()}
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* ── Stepper panel ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{
          background: "rgba(10,14,22,0.97)",
          border: "1px solid #1e2a38",
          borderTop: "1px solid #141e28",
          borderBottom: "none",
          padding: "32px 32px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <GridBg />
        <ScanlineOverlay opacity={0.015} />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 0,
          }}
        >
          {STAGES.map((stage, i) => {
            const status =
              i < activeStageIndex ? "done" : i === activeStageIndex ? "active" : "pending";
            return (
              <div key={stage.key} style={{ display: "flex", alignItems: "flex-start", flex: i === STAGES.length - 1 ? "none" : 1 }}>
                <StageNode
                  stage={stage}
                  index={i}
                  status={status}
                  stageTime={stageTimers[i]}
                />
                {i < STAGES.length - 1 && (
                  <Connector done={i < activeStageIndex} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar under stepper */}
        <div
          style={{
            marginTop: 24,
            height: 2,
            background: "#0d1117",
            borderRadius: 1,
            overflow: "hidden",
            border: "1px solid #1e2a38",
          }}
        >
          <motion.div
            animate={{ width: `${((activeStageIndex + 0.5) / STAGES.length) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #1a4060, #4ab8e8)",
              boxShadow: "0 0 8px rgba(74,184,232,0.6)",
              borderRadius: 1,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8,
              color: "#1e3040",
              letterSpacing: "0.1em",
            }}
          >
            STAGE {activeStageIndex + 1} OF {STAGES.length}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8,
              color: "#1e3040",
              letterSpacing: "0.1em",
            }}
          >
            {Math.round(((activeStageIndex + 0.5) / STAGES.length) * 100)}% COMPLETE
          </span>
        </div>
      </motion.div>

      {/* ── Signal log terminal ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{
          background: "rgba(6,9,13,0.98)",
          border: "1px solid #1e2a38",
          borderTop: "1px solid #0d1520",
          borderRadius: "0 0 10px 10px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Terminal header bar */}
        <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid #111a24",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(8,11,15,0.8)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#ff3b5c", "#e8c84a", "#3cb878"].map((c) => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.5 }} />
              ))}
            </div>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                color: "#1e3040",
                letterSpacing: "0.15em",
                marginLeft: 4,
              }}
            >
              SIGNAL LOG — EDEN/FORENSIC-TERMINAL
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Terminal size={10} color="#1e3040" />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8,
                color: "#1e3040",
                letterSpacing: "0.1em",
              }}
            >
              {logLines.length} ENTRIES
            </span>
          </div>
        </div>

        {/* Log body */}
        <div
          className="eden-log-scroll"
          style={{
            height: 200,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 16px",
            position: "relative",
          }}
        >
          <ScanlineOverlay opacity={0.012} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Boot line */}
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: "#1a3040",
                marginBottom: 8,
                letterSpacing: "0.06em",
              }}
            >
              Eden Intelligence System v3.1 · Secure Channel · E2E Encrypted
              <br />
              ──────────────────────────────────────────────────────
            </div>

            <AnimatePresence initial={false}>
              {logLines.map((line, i) => (
                <LogLine key={line.id} line={line} isLast={i === logLines.length - 1} />
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}