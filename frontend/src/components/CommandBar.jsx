/**
 * CommandBar.jsx — Eden Intelligence Platform
 * Classified Intelligence Command Terminal · Hero Component
 * v5 — "God Mode+" pass: magnetic controls, glass-tilt mode cards,
 * matrix-decode telemetry, liquid glow feature cards, aperture tab morph.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Search,
  Upload,
  Cpu,
  Mic2,
  ScanLine,
  FileAudio,
  GitBranch,
  Zap,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Film,
  X,
  Eye,
  TerminalSquare,
  Lock,
  Radar,
  Activity,
} from "lucide-react";
import { uploadMedia } from "../services/api";

/* ─── Constants ───────────────────────────────────────────────── */

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
];
const ACCEPTED_EXTS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
const MAX_BYTES = 500 * 1024 * 1024; // 500MB

const FEATURE_CARDS = [
  {
    id: "ocr",
    icon: ScanLine,
    title: "Multimodal OCR",
    desc: "Extract & analyze embedded text across video frames, images, and overlays",
    tag: "VISUAL INTEL",
    color: "#4ab8e8",
    metrics: ["FRAME_RATE 29.97", "CONF 98.2%", "LANG AUTO"],
  },
  {
    id: "audio",
    icon: FileAudio,
    title: "Audio Transcription",
    desc: "Deep speech-to-text with speaker diarization and sentiment mapping",
    tag: "SIGNAL PROC",
    color: "#4ab8e8",
    metrics: ["SPKRS N+1", "SNR 42dB", "WER 3.1%"],
  },
  {
    id: "claims",
    icon: GitBranch,
    title: "Claim Corroboration",
    desc: "Cross-reference assertions against verified intelligence sources in real-time",
    tag: "VERIFICATION",
    color: "#4ab8e8",
    metrics: ["SRC 12.4K", "LATENCY 210ms", "XREF LIVE"],
  },
];

const PLACEHOLDERS = [
  "https://instagram.com/p/DYGPiYyRyvG/...",
  "https://instagram.com/reel/...",
];

const DECODE_CHARS = "!<>-_\\/[]{}—=+*^?#01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/* ─── Utility ─────────────────────────────────────────────────── */

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || !isFinite(bytesPerSec)) return "0.0 KB/s";
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function useTypingPlaceholder(strings, speed = 60, pause = 2200) {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = strings[idx % strings.length];
    if (!deleting) {
      if (charIdx < target.length) {
        const t = setTimeout(() => {
          setText(target.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        }, speed);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setDeleting(true), pause);
        return () => clearTimeout(t);
      }
    } else {
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setText(target.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        }, speed / 2.5);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setIdx((i) => (i + 1) % strings.length);
      }
    }
  }, [charIdx, deleting, idx, strings, speed, pause]);

  return text;
}

/**
 * Magnetic wrapper — the child subtly translates toward the cursor while
 * it's within the padded catcher zone, then springs back on release.
 * `range` extends the hoverable hit-area beyond the child's visual bounds
 * so the pull is felt slightly before the pointer actually touches it.
 */
function Magnetic({ children, strength = 0.35, range = 24, disabled = false }) {
  const outerRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 20, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 20, mass: 0.4 });

  const handleMove = (e) => {
    if (disabled) return;
    const el = outerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };
  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={outerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ padding: range, margin: -range, display: "inline-flex" }}
    >
      <motion.div style={{ x: sx, y: sy, display: "inline-flex" }}>{children}</motion.div>
    </div>
  );
}

/**
 * DecodeText — matrix-style staggered decrypt. Scrambles through random
 * glyphs before resolving to the target string, left to right.
 */
function DecodeText({ text, triggerKey, speed = 24, style }) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    let iteration = 0;
    const id = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < iteration) return text[i];
            return DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)];
          })
          .join("")
      );
      iteration += 0.6;
      if (iteration >= text.length) {
        clearInterval(id);
        setDisplay(text);
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, triggerKey, speed]);

  return <span style={style}>{display}</span>;
}

/* ─── Small visual atoms ──────────────────────────────────────── */

function ScanlineOverlay({ opacity = 0.025, speedUp = false }) {
  return (
    <motion.div
      aria-hidden
      animate={{ backgroundPositionY: ["0px", "40px"] }}
      transition={{ duration: speedUp ? 0.6 : 3.2, repeat: Infinity, ease: "linear" }}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(74,184,232,${opacity}) 2px, rgba(74,184,232,${opacity}) 4px)`,
        backgroundSize: "100% 40px",
        zIndex: 0,
      }}
    />
  );
}

function GridBackground({ offsetX = 0, offsetY = 0 }) {
  return (
    <svg
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.05 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={`translate(${offsetX}, ${offsetY})`}>
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4ab8e8" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="gridFade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="gridMask">
          <rect width="100%" height="100%" fill="url(#gridFade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" mask="url(#gridMask)" />
    </svg>
  );
}

function CornerAccent({ position = "tl", flared = false }) {
  const transform =
    position === "tr"
      ? "scale(-1,1) translate(-32,0)"
      : position === "br"
        ? "scale(-1,-1) translate(-32,-32)"
        : position === "bl"
          ? "scale(1,-1) translate(0,-32)"
          : "";
  return (
    <motion.svg
      aria-hidden
      width="40"
      height="40"
      viewBox="0 0 32 32"
      animate={{ filter: flared ? "drop-shadow(0 0 8px rgba(74,184,232,0.9))" : "drop-shadow(0 0 0px rgba(74,184,232,0))" }}
      transition={{ duration: 0.4 }}
      style={{
        position: "absolute",
        ...(position === "tl" && { top: 10, left: 10 }),
        ...(position === "tr" && { top: 10, right: 10 }),
        ...(position === "br" && { bottom: 10, right: 10 }),
        ...(position === "bl" && { bottom: 10, left: 10 }),
        pointerEvents: "none",
      }}
    >
      <motion.path
        d="M2 18 L2 2 L18 2"
        fill="none"
        stroke={flared ? "#4ab8e8" : "rgba(74,184,232,0.35)"}
        strokeWidth="1.5"
        transform={transform}
        animate={{ pathLength: flared ? [0.6, 1] : 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {flared && (
        <motion.circle
          cx="2"
          cy="2"
          r="1.5"
          fill="#4ab8e8"
          transform={transform}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0.6], scale: [0, 1.4, 1] }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.svg>
  );
}

function GlitchTitle() {
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    let timers = [];
    const cycle = () => {
      timers.push(setTimeout(() => setPhase("pre"), 0));
      timers.push(setTimeout(() => setPhase("peak"), 60));
      timers.push(setTimeout(() => setPhase("peak2"), 140));
      timers.push(setTimeout(() => setPhase("settle"), 220));
      timers.push(setTimeout(() => setPhase("idle"), 340));
    };
    const interval = setInterval(cycle, 4200 + Math.random() * 2800);
    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  const active = phase !== "idle";
  const jitter = { pre: 1, peak: -3, peak2: 2, settle: 0, idle: 0 }[phase] || 0;
  const scale = { pre: 1.0, peak: 1.015, peak2: 0.99, settle: 1.0, idle: 1 }[phase] || 1;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <motion.h1
        animate={{ x: jitter, scale }}
        transition={{ duration: 0.08 }}
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(52px, 8vw, 88px)",
          fontWeight: 800,
          letterSpacing: "0.18em",
          color: "#e8f4fc",
          margin: 0,
          lineHeight: 1,
          textShadow: active
            ? "2.5px 0 #4ab8e8, -2.5px 0 #ff3b5c, 0 0 34px rgba(74,184,232,0.7)"
            : "0 0 40px rgba(74,184,232,0.25), 0 0 80px rgba(74,184,232,0.1)",
          userSelect: "none",
        }}
      >
        EDEN
      </motion.h1>
      {active && (
        <>
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "clamp(52px, 8vw, 88px)",
              fontWeight: 800,
              letterSpacing: "0.18em",
              color: "#4ab8e8",
              opacity: 0.55,
              transform: `translate(${-3 - jitter}px, 1px)`,
              clipPath: "inset(30% 0 40% 0)",
              userSelect: "none",
            }}
          >
            EDEN
          </span>
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "clamp(52px, 8vw, 88px)",
              fontWeight: 800,
              letterSpacing: "0.18em",
              color: "#ff3b5c",
              opacity: 0.45,
              transform: `translate(${3 + jitter}px, -1px)`,
              clipPath: "inset(55% 0 15% 0)",
              userSelect: "none",
            }}
          >
            EDEN
          </span>
        </>
      )}
    </div>
  );
}

function StatusBar({ isSubmitted, isProcessing, isSubmitting, url }) {
  let icon, message, color;
  if (isProcessing || isSubmitting) {
    icon = <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />;
    message = "ANALYSIS IN PROGRESS — PROCESSING INTELLIGENCE";
    color = "#e8c84a";
  } else if (isSubmitted && url) {
    icon = <CheckCircle2 size={10} />;
    message = "OPERATION COMPLETE — RESULTS READY";
    color = "#3cb878";
  } else {
    icon = <Eye size={10} />;
    message = "AWAITING TARGET DESIGNATION — SYSTEM NOMINAL";
    color = "#4ab8e8";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        letterSpacing: "0.14em",
        color,
        padding: "5px 12px",
        background: `${color}10`,
        border: `1px solid ${color}22`,
        borderRadius: 4,
        transition: "all 0.4s ease",
      }}
    >
      {icon}
      <motion.span key={message} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {message}
      </motion.span>
      <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ marginLeft: 2 }}>
        █
      </motion.span>
    </div>
  );
}

function HoloScanner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6,8,11,0.55)",
        backdropFilter: "blur(3px)",
        pointerEvents: "none",
      }}
    >
      <div style={{ position: "relative", width: 120, height: 120 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [0.4, 1.4], opacity: [0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, border: "1px solid rgba(232,200,74,0.6)", borderRadius: "50%" }}
          />
        ))}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0%, rgba(232,200,74,0.5) 15%, transparent 30%)",
          }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Radar size={22} color="#e8c84a" style={{ filter: "drop-shadow(0 0 6px #e8c84a)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 18, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "#e8c84a" }}>
        <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>
          SYSTEM LOCKED · PROCESSING TARGET
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ─── ModeCard — glass slab, 3D tilt, glare ──────────────────────*/

function ModeCard({ mode, label, icon: Icon, desc, isSelected, onClick, locked }) {
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spx = useSpring(px, { stiffness: 200, damping: 22 });
  const spy = useSpring(py, { stiffness: 200, damping: 22 });

  const rotateX = useTransform(spy, [0, 1], [8, -8]);
  const rotateY = useTransform(spx, [0, 1], [-8, 8]);
  const glareX = useTransform(spx, (v) => `${v * 100}%`);
  const glareY = useTransform(spy, (v) => `${v * 100}%`);

  const [hovered, setHovered] = useState(false);

  const handleMove = (e) => {
    if (locked) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const handleLeave = () => {
    setHovered(false);
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div style={{ flex: 1, perspective: 900 }}>
      <motion.button
        ref={ref}
        onClick={() => !locked && onClick(mode)}
        onMouseMove={handleMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleLeave}
        disabled={locked}
        style={{
          width: "100%",
          padding: "16px 18px",
          background: isSelected ? "rgba(74,184,232,0.09)" : "rgba(13,17,23,0.7)",
          border: isSelected ? "1px solid rgba(74,184,232,0.45)" : "1px solid rgba(30,42,56,0.9)",
          borderRadius: 8,
          cursor: locked ? "not-allowed" : "pointer",
          textAlign: "left",
          position: "relative",
          overflow: "hidden",
          transformStyle: "preserve-3d",
          rotateX: hovered && !locked ? rotateX : 0,
          rotateY: hovered && !locked ? rotateY : 0,
          transition: "border 0.25s, background 0.25s, opacity 0.3s",
          boxShadow: isSelected
            ? "0 0 24px rgba(74,184,232,0.1) inset, 0 0 16px rgba(74,184,232,0.08)"
            : hovered
              ? "0 14px 30px -12px rgba(0,0,0,0.6)"
              : "none",
          opacity: locked ? 0.4 : 1,
        }}
      >
        {/* Glass glare that tracks the cursor */}
        {!locked && (
          <motion.div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.25s",
              background: useTransform(
                [glareX, glareY],
                ([gx, gy]) =>
                  `radial-gradient(220px circle at ${gx} ${gy}, rgba(255,255,255,0.14), rgba(74,184,232,0.06) 40%, transparent 70%)`
              ),
              transform: "translateZ(30px)",
            }}
          />
        )}

        {/* Thin specular edge highlight, like light hitting glass */}
        {!locked && (
          <motion.div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              borderRadius: 8,
              opacity: hovered ? 0.9 : 0,
              transition: "opacity 0.3s",
              background: useTransform(
                [glareX, glareY],
                ([gx, gy]) => `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) ${gx}, transparent 70%)`
              ),
              mixBlendMode: "screen",
            }}
          />
        )}

        {isSelected && (
          <>
            <motion.div
              layoutId="modeGlow"
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at 30% 50%, rgba(74,184,232,0.12) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            <svg aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12, pointerEvents: "none" }}>
              <defs>
                <pattern id={`egrid-${mode}`} width="14" height="14" patternUnits="userSpaceOnUse">
                  <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#4ab8e8" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#egrid-${mode})`} />
            </svg>
            <motion.div
              animate={{ x: ["-30%", "130%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "18%",
                background: "linear-gradient(90deg, transparent, rgba(74,184,232,0.12), transparent)",
                pointerEvents: "none",
              }}
            />
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, position: "relative", transform: "translateZ(20px)" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: isSelected ? "rgba(74,184,232,0.15)" : "rgba(30,42,56,0.6)",
              border: `1px solid ${isSelected ? "rgba(74,184,232,0.4)" : "rgba(30,42,56,0.8)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.25s",
              boxShadow: isSelected ? "0 0 12px rgba(74,184,232,0.2)" : "none",
            }}
          >
            <Icon
              size={15}
              color={isSelected ? "#4ab8e8" : "#3a5060"}
              style={{ filter: isSelected ? "drop-shadow(0 0 4px rgba(74,184,232,0.8))" : "none", transition: "all 0.25s" }}
            />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: isSelected ? "#c8dde8" : "#5a7080",
                transition: "color 0.25s",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8,
                letterSpacing: "0.14em",
                color: isSelected ? "#4ab8e8" : "#2a3a48",
                marginTop: 1,
              }}
            >
              {mode === "text" ? "TEXT ANALYSIS" : "AUDIO ANALYSIS"}
            </div>
          </div>
          {isSelected && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ marginLeft: "auto" }}>
              <motion.div
                animate={{ boxShadow: ["0 0 6px #4ab8e8", "0 0 14px #4ab8e8", "0 0 6px #4ab8e8"] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ab8e8" }}
              />
            </motion.div>
          )}
        </div>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: isSelected ? "#5a7a8a" : "#2a3a48",
            margin: 0,
            lineHeight: 1.6,
            transition: "color 0.25s",
            position: "relative",
            transform: "translateZ(14px)",
          }}
        >
          {desc}
        </p>
      </motion.button>
    </div>
  );
}

/* ─── FeatureCard — liquid morph glow ────────────────────────────*/

const BLOB_PATHS = [
  "M42,-58C54,-49,62,-35,66,-19C70,-4,69,13,61,27C53,41,38,52,21,59C4,65,-15,66,-31,59C-47,52,-59,38,-64,21C-70,4,-68,-15,-59,-32C-49,-48,-32,-62,-14,-66C4,-70,25,-67,42,-58Z",
  "M39,-52C51,-45,60,-32,65,-16C69,-1,68,17,60,31C53,46,38,57,21,63C5,68,-13,68,-30,62C-46,55,-60,42,-66,25C-73,8,-72,-13,-63,-30C-54,-46,-38,-58,-20,-64C-3,-69,15,-58,39,-52Z",
  "M45,-61C57,-52,64,-37,67,-21C70,-5,68,12,60,26C53,41,39,53,22,60C6,67,-14,68,-31,61C-49,54,-62,39,-68,21C-74,4,-72,-15,-63,-31C-55,-47,-39,-60,-21,-66C-3,-71,17,-70,45,-61Z",
];

function FeatureCard({ icon: Icon, title, desc, tag, color, index, metrics }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.1, ease: "easeOut" }}
      whileHover={{ scale: 1.015, y: -3 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 0,
        padding: "18px 16px",
        background: hovered ? "rgba(74,184,232,0.05)" : "rgba(8,11,15,0.6)",
        border: `1px solid ${hovered ? "rgba(74,184,232,0.22)" : "rgba(30,42,56,0.7)"}`,
        borderRadius: 8,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transition: "border 0.25s, background 0.25s",
      }}
    >
      {/* Liquid blob glow — morphs continuously, brightens on hover */}
      <motion.svg
        aria-hidden
        viewBox="-80 -80 160 160"
        style={{
          position: "absolute",
          top: "-40%",
          right: "-30%",
          width: "75%",
          height: "auto",
          opacity: hovered ? 0.22 : 0.08,
          transition: "opacity 0.4s",
          pointerEvents: "none",
          filter: "blur(6px)",
        }}
      >
        <motion.path
          fill={color}
          animate={{ d: BLOB_PATHS, rotate: hovered ? [0, 25] : [0, 8] }}
          transition={{
            d: { duration: 7, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
            rotate: { duration: 9, repeat: Infinity, repeatType: "mirror", ease: "linear" },
          }}
        />
      </motion.svg>

      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.18em", color: hovered ? color : "#2a3a48", marginBottom: 14, transition: "color 0.25s", position: "relative" }}>
        {tag}
      </div>

      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 7,
          background: hovered ? "rgba(74,184,232,0.12)" : "rgba(20,30,40,0.8)",
          border: `1px solid ${hovered ? "rgba(74,184,232,0.35)" : "#1e2a38"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          transition: "all 0.25s",
          boxShadow: hovered ? "0 0 16px rgba(74,184,232,0.18)" : "none",
          position: "relative",
        }}
      >
        <Icon size={17} color={hovered ? color : "#3a5060"} style={{ filter: hovered ? `drop-shadow(0 0 5px ${color})` : "none", transition: "all 0.25s" }} />
      </div>

      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: hovered ? "#c8dde8" : "#4a6070",
          marginBottom: 6,
          transition: "color 0.25s",
          position: "relative",
        }}
      >
        {title}
      </div>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: hovered ? "#4a6070" : "#2a3240", margin: 0, lineHeight: 1.65, transition: "color 0.25s", position: "relative" }}>
        {desc}
      </p>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              borderTop: "1px dashed rgba(74,184,232,0.15)",
              paddingTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {metrics?.map((m, i) => (
              <motion.div
                key={m}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "#3a5a6a", display: "flex", alignItems: "center", gap: 5 }}
              >
                <Activity size={8} color={color} />
                <DecodeText text={m} triggerKey={hovered} speed={14} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          transformOrigin: "center",
        }}
      />
    </motion.div>
  );
}

/* ─── URLInput — magnetic, liquid focus ring, decoded telemetry ─ */

function URLInput({ url, onUrlChange, onSubmit, onReset, isSubmitted, isProcessing, isSubmitting }) {
  const placeholder = useTypingPlaceholder(PLACEHOLDERS);
  const inputRef = useRef(null);
  const barRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const isActive = isProcessing || isSubmitting;
  const isValidFormat = /^https?:\/\/.+/.test(url || "");

  // Subtle 3D lean of the whole bar toward the cursor (glass-panel feel,
  // gentler than the mode cards since it holds live text).
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spx = useSpring(px, { stiffness: 150, damping: 20 });
  const spy = useSpring(py, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(spy, [0, 1], [1.4, -1.4]);
  const rotateY = useTransform(spx, [0, 1], [-1.4, 1.4]);

  const handleBarMove = (e) => {
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const handleBarLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div style={{ position: "relative", perspective: 1200 }}>
      <motion.div
        ref={barRef}
        onMouseMove={handleBarMove}
        onMouseLeave={handleBarLeave}
        animate={{
          boxShadow: isActive
            ? [
              "0 0 0 1px rgba(232,200,74,0.3), 0 0 20px rgba(232,200,74,0.08)",
              "0 0 0 1px rgba(232,200,74,0.5), 0 0 32px rgba(232,200,74,0.14)",
              "0 0 0 1px rgba(232,200,74,0.3), 0 0 20px rgba(232,200,74,0.08)",
            ]
            : focused
              ? [
                "0 0 0 1px rgba(74,184,232,0.55), 0 0 26px rgba(74,184,232,0.18)",
                "0 0 0 1px rgba(74,184,232,0.75), 0 0 36px rgba(74,184,232,0.26)",
                "0 0 0 1px rgba(74,184,232,0.55), 0 0 26px rgba(74,184,232,0.18)",
              ]
              : url
                ? "0 0 0 1px rgba(74,184,232,0.3), 0 0 20px rgba(74,184,232,0.08)"
                : "0 0 0 1px rgba(30,42,56,0.9)",
        }}
        transition={{ duration: isActive || focused ? 1.8 : 0.3, repeat: isActive || focused ? Infinity : 0 }}
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(8,11,15,0.8)",
          border: `1px solid ${isActive ? "rgba(232,200,74,0.4)" : focused ? "rgba(74,184,232,0.5)" : url ? "rgba(74,184,232,0.3)" : "#1e2a38"}`,
          borderRadius: 8,
          overflow: "hidden",
          transition: "border 0.3s",
          position: "relative",
          transformStyle: "preserve-3d",
          rotateX,
          rotateY,
        }}
      >
        {(isActive || (focused && url)) && (
          <motion.div
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: isActive ? 1.8 : 1.3, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "30%",
              background: `linear-gradient(90deg, transparent, ${isActive ? "rgba(232,200,74,0.08)" : "rgba(74,184,232,0.08)"}, transparent)`,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        )}

        <div style={{ padding: "0 14px", display: "flex", alignItems: "center", borderRight: "1px solid #1e2a38" }}>
          {isActive ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
              <Loader2 size={16} color="#e8c84a" />
            </motion.div>
          ) : (
            <Search size={16} color={url ? "#4ab8e8" : "#2a3a48"} style={{ transition: "color 0.25s" }} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url && !isActive) onSubmit();
          }}
          disabled={isActive}
          placeholder={`${placeholder}`}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12.5,
            letterSpacing: "0.04em",
            color: isActive ? "#e8c84a" : "#c8dde8",
            padding: "16px 12px",
            caretColor: "#4ab8e8",
          }}
        />

        {/* Matrix-decode telemetry: validity + length readout decrypts in */}
        {url && !isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingRight: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8.5,
              letterSpacing: "0.08em",
              color: isValidFormat ? "#3cb878" : "#e8934a",
              whiteSpace: "nowrap",
            }}
          >
            {isValidFormat ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
            <DecodeText
              text={`${isValidFormat ? "VALID" : "CHECK"} · LEN ${url.length.toString().padStart(3, "0")}`}
              triggerKey={isValidFormat}
              speed={18}
            />
          </motion.div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {(url || isSubmitted) && !isActive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1, rotate: -90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onReset}
              style={{ background: "transparent", border: "none", padding: "0 10px", cursor: "pointer", color: "#3a5060", display: "flex", alignItems: "center" }}
            >
              <X size={14} />
            </motion.button>
          )}

          <div style={{ margin: 6 }}>
            <Magnetic strength={0.3} range={18} disabled={!url || isActive}>
              <motion.button
                whileHover={!isActive && url ? { scale: 1.03 } : {}}
                whileTap={!isActive && url ? { scale: 0.94 } : {}}
                onClick={() => url && !isActive && onSubmit()}
                disabled={!url || isActive}
                style={{
                  padding: "9px 20px",
                  background: url && !isActive ? "rgba(74,184,232,0.15)" : "rgba(30,42,56,0.4)",
                  border: `1px solid ${url && !isActive ? "rgba(74,184,232,0.4)" : "rgba(30,42,56,0.6)"}`,
                  borderRadius: 6,
                  cursor: url && !isActive ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  transition: "all 0.25s",
                  boxShadow: url && !isActive ? "0 0 14px rgba(74,184,232,0.12)" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: url && !isActive ? "#4ab8e8" : "#2a3a48",
                    transition: "color 0.25s",
                  }}
                >
                  ANALYZE
                </span>
                <motion.span animate={url && !isActive ? { x: [0, 3, 0] } : {}} transition={{ duration: 1, repeat: Infinity }} style={{ display: "flex" }}>
                  <ChevronRight size={12} color={url && !isActive ? "#4ab8e8" : "#2a3a48"} />
                </motion.span>
              </motion.button>
            </Magnetic>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── UploadZone ──────────────────────────────────────────────── */

function UploadZone({ onUpload, selectedMode, isSubmitting: parentIsSubmitting }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const uploadStartRef = useRef(null);
  const [speed, setSpeed] = useState(0);

  const particles = useMemo(
    () =>
      new Array(16).fill(0).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.4,
        duration: 1.6 + Math.random() * 1.4,
      })),
    []
  );

  const validateFile = (f) => {
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXTS.includes(ext)) {
      setError("Unsupported format. Accepted: MP4, MOV, AVI, MKV, WEBM");
      return false;
    }
    if (f.size > MAX_BYTES) {
      setError(`File too large (${formatBytes(f.size)}). Maximum: 500 MB`);
      return false;
    }
    return true;
  };

  const handleFile = useCallback((f) => {
    setError(null);
    if (!validateFile(f)) return;
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleProgressUpdate = useCallback(
    (pct) => {
      if (!uploadStartRef.current) uploadStartRef.current = Date.now();
      const elapsed = (Date.now() - uploadStartRef.current) / 1000;
      if (elapsed > 0 && file) {
        const bytesDone = (file.size * pct) / 100;
        setSpeed(bytesDone / elapsed);
      }
      setProgress(pct);
    },
    [file]
  );

  const handleStartAnalysis = async () => {
    if (!file || isUploading || parentIsSubmitting) return;
    setError(null);
    setProgress(0);
    setSpeed(0);
    uploadStartRef.current = null;
    setIsUploading(true);
    try {
      const job = await uploadMedia(file, selectedMode, handleProgressUpdate);
      onUpload?.(job);
    } catch (err) {
      setError(err.message || "Upload failed.");
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const chunksTotal = 10;
  const chunksDone = Math.round((progress / 100) * chunksTotal);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !file && inputRef.current?.click()}
        animate={{
          borderColor: dragging
            ? "rgba(74,184,232,0.7)"
            : error
              ? "rgba(255,59,92,0.4)"
              : file
                ? "rgba(60,184,120,0.4)"
                : "rgba(30,42,56,0.9)",
          background: dragging
            ? "rgba(74,184,232,0.07)"
            : error
              ? "rgba(255,59,92,0.04)"
              : file
                ? "rgba(60,184,120,0.04)"
                : "rgba(8,11,15,0.6)",
          scale: dragging ? 1.015 : 1,
        }}
        transition={{ duration: 0.2 }}
        style={{
          border: "1px dashed rgba(30,42,56,0.9)",
          borderRadius: 10,
          padding: "36px 24px",
          cursor: file ? "default" : "pointer",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <AnimatePresence>
          {dragging && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
              <motion.div
                animate={{ backgroundPositionY: ["0px", "-32px"] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(74,184,232,0.09) 14px, rgba(74,184,232,0.09) 15px), repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(74,184,232,0.09) 14px, rgba(74,184,232,0.09) 15px)",
                }}
              />
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "-10%", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
                  style={{ position: "absolute", left: `${p.left}%`, width: 2, height: 2, borderRadius: "50%", background: "#4ab8e8", boxShadow: "0 0 6px #4ab8e8" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <input ref={inputRef} type="file" accept={ACCEPTED_EXTS.join(",")} onChange={handleInputChange} style={{ display: "none" }} />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: "rgba(60,184,120,0.12)",
                  border: "1px solid rgba(60,184,120,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <Film size={22} color="#3cb878" />
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: "#3cb878", marginBottom: 4 }}>
                {file.name}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#3a6050", letterSpacing: "0.1em" }}>
                {formatBytes(file.size)} · READY FOR ANALYSIS
              </div>
              {!isUploading && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError(null);
                    setProgress(0);
                  }}
                  style={{
                    marginTop: 12,
                    background: "rgba(255,59,92,0.08)",
                    border: "1px solid rgba(255,59,92,0.25)",
                    borderRadius: 5,
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: "#ff3b5c",
                  }}
                >
                  REMOVE
                </motion.button>
              )}

              {isUploading && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,184,232,0.15)", overflow: "hidden", position: "relative" }}>
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                      style={{ height: "100%", background: "linear-gradient(90deg, #1e6a8a, #4ab8e8, #83f3d0, #4ab8e8, #1e6a8a)", backgroundSize: "200% 100%", position: "relative" }}
                    >
                      <motion.div
                        animate={{ backgroundPositionX: ["0%", "200%"] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                        style={{ position: "absolute", inset: 0, background: "inherit", backgroundSize: "200% 100%" }}
                      />
                    </motion.div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, letterSpacing: "0.08em", color: "#4a7a90" }}>
                    <span>{formatSpeed(speed)}</span>
                    <motion.span key={progress} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} style={{ color: "#4ab8e8", fontWeight: 700, textShadow: "0 0 8px rgba(74,184,232,0.6)" }}>
                      {progress}%
                    </motion.span>
                    <span>
                      CHUNKS {chunksDone}/{chunksTotal}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div animate={dragging ? { y: [-4, 0, -4] } : { y: 0 }} transition={{ duration: 0.6, repeat: dragging ? Infinity : 0 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    background: dragging ? "rgba(74,184,232,0.12)" : "rgba(20,30,40,0.8)",
                    border: `1px solid ${dragging ? "rgba(74,184,232,0.5)" : "#1e2a38"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    transition: "all 0.25s",
                    boxShadow: dragging ? "0 0 20px rgba(74,184,232,0.2)" : "none",
                  }}
                >
                  <Upload size={24} color={dragging ? "#4ab8e8" : "#2a3a48"} style={{ transition: "color 0.25s" }} />
                </div>
              </motion.div>

              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", color: dragging ? "#4ab8e8" : "#3a5060", marginBottom: 6, transition: "color 0.25s" }}>
                {dragging ? "RELEASE TO LOAD" : "DRAG & DROP VIDEO FILE"}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#2a3a48", letterSpacing: "0.1em", marginBottom: 12 }}>or click to browse</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                {ACCEPTED_EXTS.map((ext) => (
                  <span
                    key={ext}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.12em", color: "#2a3a48", background: "#0d1117", border: "1px solid #1e2a38", borderRadius: 3, padding: "2px 6px" }}
                  >
                    {ext.toUpperCase()}
                  </span>
                ))}
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.12em", color: "#1e2a38", padding: "2px 0", alignSelf: "center" }}>· MAX 500MB</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: "#ff3b5c",
              background: "rgba(255,59,92,0.06)",
              border: "1px solid rgba(255,59,92,0.2)",
              borderRadius: 5,
              padding: "8px 12px",
            }}
          >
            <AlertCircle size={12} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {file && !isUploading && (
        <Magnetic strength={0.12} range={14} disabled={parentIsSubmitting}>
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartAnalysis}
            disabled={parentIsSubmitting}
            style={{
              width: "100%",
              padding: "14px",
              background: parentIsSubmitting ? "rgba(74,184,232,0.05)" : "rgba(74,184,232,0.1)",
              border: "1px solid rgba(74,184,232,0.35)",
              borderRadius: 8,
              cursor: parentIsSubmitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 0 20px rgba(74,184,232,0.08)",
              opacity: parentIsSubmitting ? 0.7 : 1,
            }}
          >
            <Zap size={15} color="#4ab8e8" />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: "0.16em", color: "#4ab8e8" }}>INITIATE ANALYSIS</span>
            <ChevronRight size={13} color="#4ab8e8" />
          </motion.button>
        </Magnetic>
      )}
    </div>
  );
}

/* ─── Aperture tab switcher ──────────────────────────────────────
 * A mechanical iris wipe between "ANALYZE URL" and "LOCAL UPLOAD":
 * the outgoing panel irises shut to a point, a ring of radial blades
 * flashes at the center, and the incoming panel irises open.
 */

function ApertureBlades({ active }) {
  const blades = 10;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? [0, 1, 0] : 0 }}
      transition={{ duration: 0.5, times: [0, 0.35, 1] }}
      style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 2 }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64">
        {Array.from({ length: blades }).map((_, i) => (
          <motion.line
            key={i}
            x1="32"
            y1="32"
            x2="32"
            y2="4"
            stroke="#4ab8e8"
            strokeWidth="1.5"
            transform={`rotate(${(360 / blades) * i} 32 32)`}
            animate={active ? { y2: [32, 4, 32] } : {}}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

function ApertureSwitch({ activeTab, children }) {
  return (
    <div style={{ position: "relative" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ clipPath: "circle(0% at 50% 20%)", opacity: 0 }}
          animate={{ clipPath: "circle(140% at 50% 20%)", opacity: 1 }}
          exit={{ clipPath: "circle(0% at 50% 20%)", opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      <ApertureBlades active={activeTab} />
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────── */

export default function CommandBar({
  isSubmitted = false,
  isProcessing = false,
  isSubmitting = false,
  url = "",
  selectedMode = "text",
  onUrlChange,
  onModeChange,
  onSubmit,
  onReset,
  onUpload,
}) {
  const [activeTab, setActiveTab] = useState("url");
  const [containerHovered, setContainerHovered] = useState(false);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const prefersReduced = useReducedMotion();
  const rootRef = useRef(null);
  const isLocked = isProcessing || isSubmitting;

  useEffect(() => {
    const id = "eden-cmd-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }, []);

  const handleMouseMove = (e) => {
    if (prefersReduced || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setMouse({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  };

  const gridOffsetX = prefersReduced ? 0 : (mouse.x - 0.5) * 14;
  const gridOffsetY = prefersReduced ? 0 : (mouse.y - 0.5) * 14;

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setContainerHovered(true)}
      onMouseLeave={() => setContainerHovered(false)}
      style={{ width: "100%", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "60px 32px 40px", position: "relative" }}
    >
      <GridBackground offsetX={gridOffsetX} offsetY={gridOffsetY} />
      <ScanlineOverlay opacity={0.02} speedUp={isLocked} />

      <motion.div
        aria-hidden
        animate={{ x: gridOffsetX * 2, y: gridOffsetY * 2 }}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
        style={{ position: "absolute", top: "15%", left: "20%", width: 400, height: 300, background: "radial-gradient(ellipse, rgba(74,184,232,0.04) 0%, transparent 70%)", pointerEvents: "none" }}
      />
      <motion.div
        aria-hidden
        animate={{ x: -gridOffsetX * 2, y: -gridOffsetY * 2 }}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
        style={{ position: "absolute", bottom: "20%", right: "15%", width: 350, height: 250, background: "radial-gradient(ellipse, rgba(74,184,232,0.03) 0%, transparent 70%)", pointerEvents: "none" }}
      />

      {["tl", "tr", "br", "bl"].map((pos) => (
        <CornerAccent key={pos} position={pos} flared={containerHovered} />
      ))}

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 740, display: "flex", flexDirection: "column", gap: 28 }}>
        {/* ── Hero Header ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} style={{ textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.22em",
              color: "#2a4050",
              border: "1px solid #1e2a38",
              borderRadius: 4,
              padding: "5px 14px",
              marginBottom: 18,
              background: "rgba(13,17,23,0.8)",
            }}
          >
            <Lock size={8} color="#2a4050" />
            CLASSIFICATION · RESTRICTED · INTELLIGENCE PLATFORM
            <Lock size={8} color="#2a4050" />
          </motion.div>

          <div style={{ marginBottom: 10 }}>
            <GlitchTitle />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: "0.3em", color: "#3a5060", textTransform: "uppercase", marginBottom: 16 }}
          >
            Multimodal Intelligence Platform
          </motion.div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 14 }}
          >
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #1e2a38 50%, transparent)" }} />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.14em", color: "#2a3a48", display: "flex", alignItems: "center", gap: 6 }}>
              <TerminalSquare size={9} />
              SYS-EDEN-v5.0 · ONLINE
            </div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #1e2a38 50%, transparent)" }} />
          </motion.div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <StatusBar isSubmitted={isSubmitted} isProcessing={isProcessing} isSubmitting={isSubmitting} url={url} />
          </div>
        </motion.div>

        {/* ── Command Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.55, ease: "easeOut" }}
          style={{
            background: "rgba(8,11,15,0.85)",
            border: `1px solid ${isLocked ? "rgba(232,200,74,0.3)" : "#1e2a38"}`,
            borderRadius: 12,
            overflow: "hidden",
            backdropFilter: "blur(12px)",
            position: "relative",
            transition: "border 0.4s",
          }}
        >
          <ScanlineOverlay opacity={0.015} speedUp={isLocked} />
          <AnimatePresence>{isLocked && <HoloScanner />}</AnimatePresence>

          <div style={{ padding: "12px 18px", borderBottom: "1px solid #1e2a38", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={12} color="#4ab8e8" style={{ opacity: 0.7 }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.18em", color: "#3a5060" }}>COMMAND INTERFACE</span>
            </div>
            <div
              style={{
                display: "flex",
                background: "rgba(13,17,23,0.8)",
                border: "1px solid #1e2a38",
                borderRadius: 6,
                overflow: "hidden",
                opacity: isLocked ? 0.4 : 1,
                pointerEvents: isLocked ? "none" : "auto",
                transition: "opacity 0.3s",
              }}
            >
              {[
                { id: "url", label: "ANALYZE URL" },
                { id: "upload", label: "LOCAL UPLOAD" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "6px 14px",
                    background: activeTab === tab.id ? "rgba(74,184,232,0.12)" : "transparent",
                    border: "none",
                    borderRight: tab.id === "url" ? "1px solid #1e2a38" : "none",
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: activeTab === tab.id ? "#4ab8e8" : "#2a3a48",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "20px 18px", position: "relative", zIndex: 1 }}>
            <ApertureSwitch activeTab={activeTab}>
              {activeTab === "url" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <URLInput url={url} onUrlChange={onUrlChange} onSubmit={onSubmit} onReset={onReset} isSubmitted={isSubmitted} isProcessing={isProcessing} isSubmitting={isSubmitting} />

                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.18em", color: "#2a3a48", marginBottom: 8, textTransform: "uppercase" }}>
                      ANALYSIS MODE
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <ModeCard
                        mode="text"
                        label="Text Focus"
                        icon={ScanLine}
                        desc="Optimized for visual content extraction, OCR, and text-based claim verification"
                        isSelected={selectedMode === "text"}
                        onClick={onModeChange}
                        locked={isLocked}
                      />
                      <ModeCard
                        mode="audio"
                        label="Audio Focus"
                        icon={Mic2}
                        desc="Deep audio analysis with speech transcription and acoustic intelligence"
                        isSelected={selectedMode === "audio"}
                        onClick={onModeChange}
                        locked={isLocked}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <UploadZone onUpload={onUpload} selectedMode={selectedMode} isSubmitting={isSubmitting} />
              )}
            </ApertureSwitch>
          </div>
        </motion.div>

        {/* ── Feature Cards ── */}
        <motion.div animate={{ opacity: isLocked ? 0.35 : 1 }} transition={{ duration: 0.4 }} style={{ pointerEvents: isLocked ? "none" : "auto" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.2em", color: "#2a3a48", textAlign: "center", marginBottom: 12, textTransform: "uppercase" }}>
            INTELLIGENCE CAPABILITIES
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {FEATURE_CARDS.map((card, i) => (
              <FeatureCard key={card.id} {...card} index={i} />
            ))}
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.12em", color: "#1e2a38" }}
        >
          {["REAL-TIME ANALYSIS", "·", "E2E ENCRYPTED", "·", "ZERO RETENTION", "·", "GDPR COMPLIANT"].map((item, i) => (
            <span key={i} style={{ color: item === "·" ? "#1a2530" : "#1e2a38" }}>
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
// Metadata class configurations verified.