/**
 * CommandBar.jsx — Eden Intelligence Platform
 * Classified Intelligence Command Terminal · Hero Component
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Film,
  X,
  Eye,
  TerminalSquare,
  Lock, // Patched: Added missing Lock icon import
} from "lucide-react";
import { uploadMedia } from '../services/api';

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
  },
  {
    id: "audio",
    icon: FileAudio,
    title: "Audio Transcription",
    desc: "Deep speech-to-text with speaker diarization and sentiment mapping",
    tag: "SIGNAL PROC",
    color: "#4ab8e8",
  },
  {
    id: "claims",
    icon: GitBranch,
    title: "Claim Corroboration",
    desc: "Cross-reference assertions against verified intelligence sources in real-time",
    tag: "VERIFICATION",
    color: "#4ab8e8",
  },
];

const PLACEHOLDERS = [
  "https://instagram.com/p/DYGPiYyRyvG/...",
  "https://instagram.com/reel/...",
];

/* ─── Utility ─────────────────────────────────────────────────── */

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

/* ─── Small visual atoms ──────────────────────────────────────── */

function ScanlineOverlay({ opacity = 0.025 }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(74,184,232,${opacity}) 2px, rgba(74,184,232,${opacity}) 4px)`,
        zIndex: 0,
      }}
    />
  );
}

function GridBackground() {
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.045,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="#4ab8e8"
            strokeWidth="0.5"
          />
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

function CornerAccent({ position = "tl" }) {
  return (
    <svg
      aria-hidden
      width="32"
      height="32"
      viewBox="0 0 32 32"
      style={{
        position: "absolute",
        ...(position === "tl" && { top: 12, left: 12 }),
        ...(position === "tr" && { top: 12, right: 12 }),
        ...(position === "br" && { bottom: 12, right: 12 }),
        ...(position === "bl" && { bottom: 12, left: 12 }),
        pointerEvents: "none",
      }}
    >
      <path
        d="M2 18 L2 2 L18 2"
        fill="none"
        stroke="rgba(74,184,232,0.35)"
        strokeWidth="1.5"
        transform={
          position === "tr"
            ? "scale(-1,1) translate(-32,0)"
            : position === "br"
            ? "scale(-1,-1) translate(-32,-32)"
            : position === "bl"
            ? "scale(1,-1) translate(0,-32)"
            : ""
        }
      />
    </svg>
  );
}

function GlitchTitle() {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 4500 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <h1
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(52px, 8vw, 88px)",
          fontWeight: 800,
          letterSpacing: "0.18em",
          color: "#e8f4fc",
          margin: 0,
          lineHeight: 1,
          textShadow: glitch
            ? "2px 0 #4ab8e8, -2px 0 #ff3b5c, 0 0 30px rgba(74,184,232,0.6)"
            : "0 0 40px rgba(74,184,232,0.25), 0 0 80px rgba(74,184,232,0.1)",
          transition: glitch ? "none" : "text-shadow 0.3s ease",
          transform: glitch ? `translateX(${Math.random() > 0.5 ? 2 : -2}px)` : "none",
          userSelect: "none",
        }}
      >
        EDEN
      </h1>
      {/* Ghost layer for glitch */}
      {glitch && (
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
              opacity: 0.5,
              transform: "translate(-3px, 1px)",
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
              opacity: 0.4,
              transform: "translate(3px, -1px)",
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
      <motion.span
        key={message}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {message}
      </motion.span>
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ marginLeft: 2 }}
      >
        █
      </motion.span>
    </div>
  );
}

/* ─── ModeCard ────────────────────────────────────────────────── */

function ModeCard({ mode, label, icon: Icon, desc, isSelected, onClick }) {
  return (
    <motion.button
      onClick={() => onClick(mode)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={{
        flex: 1,
        padding: "16px 18px",
        background: isSelected
          ? "rgba(74,184,232,0.09)"
          : "rgba(13,17,23,0.7)",
        border: isSelected
          ? "1px solid rgba(74,184,232,0.45)"
          : "1px solid rgba(30,42,56,0.9)",
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
        transition: "border 0.25s, background 0.25s",
        boxShadow: isSelected
          ? "0 0 24px rgba(74,184,232,0.1) inset, 0 0 16px rgba(74,184,232,0.08)"
          : "none",
      }}
    >
      {isSelected && (
        <motion.div
          layoutId="modeGlow"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(74,184,232,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: isSelected
              ? "rgba(74,184,232,0.15)"
              : "rgba(30,42,56,0.6)",
            border: `1px solid ${
              isSelected ? "rgba(74,184,232,0.4)" : "rgba(30,42,56,0.8)"
            }`,
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
            style={{
              filter: isSelected ? "drop-shadow(0 0 4px rgba(74,184,232,0.8))" : "none",
              transition: "all 0.25s",
            }}
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ marginLeft: "auto" }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#4ab8e8",
                boxShadow: "0 0 10px #4ab8e8",
              }}
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
        }}
      >
        {desc}
      </p>
    </motion.button>
  );
}

/* ─── FeatureCard ─────────────────────────────────────────────── */

function FeatureCard({ icon: Icon, title, desc, tag, color, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.1, ease: "easeOut" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 0,
        padding: "18px 16px",
        background: hovered ? "rgba(74,184,232,0.05)" : "rgba(8,11,15,0.6)",
        border: `1px solid ${
          hovered ? "rgba(74,184,232,0.22)" : "rgba(30,42,56,0.7)"
        }`,
        borderRadius: 8,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transition: "border 0.25s, background 0.25s",
      }}
    >
      {/* Top left tag */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8,
          letterSpacing: "0.18em",
          color: hovered ? color : "#2a3a48",
          marginBottom: 14,
          transition: "color 0.25s",
        }}
      >
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
        }}
      >
        <Icon
          size={17}
          color={hovered ? color : "#3a5060"}
          style={{
            filter: hovered
              ? `drop-shadow(0 0 5px ${color})`
              : "none",
            transition: "all 0.25s",
          }}
        />
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
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9.5,
          color: hovered ? "#4a6070" : "#2a3240",
          margin: 0,
          lineHeight: 1.65,
          transition: "color 0.25s",
        }}
      >
        {desc}
      </p>

      {/* Hover: bottom border glow */}
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

/* ─── URLInput ────────────────────────────────────────────────── */

function URLInput({
  url,
  onUrlChange,
  onSubmit,
  onReset,
  isSubmitted,
  isProcessing,
  isSubmitting,
}) {
  const placeholder = useTypingPlaceholder(PLACEHOLDERS);
  const inputRef = useRef(null);
  const isActive = isProcessing || isSubmitting;

  return (
    <div style={{ position: "relative" }}>
      {/* Main input container */}
      <motion.div
        animate={{
          boxShadow: isActive
            ? [
                "0 0 0 1px rgba(232,200,74,0.3), 0 0 20px rgba(232,200,74,0.08)",
                "0 0 0 1px rgba(232,200,74,0.5), 0 0 32px rgba(232,200,74,0.14)",
                "0 0 0 1px rgba(232,200,74,0.3), 0 0 20px rgba(232,200,74,0.08)",
              ]
            : url
            ? "0 0 0 1px rgba(74,184,232,0.3), 0 0 20px rgba(74,184,232,0.08)"
            : "0 0 0 1px rgba(30,42,56,0.9)",
        }}
        transition={{ duration: 1.8, repeat: isActive ? Infinity : 0 }}
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(8,11,15,0.8)",
          border: `1px solid ${
            isActive ? "rgba(232,200,74,0.4)" : url ? "rgba(74,184,232,0.3)" : "#1e2a38"
          }`,
          borderRadius: 8,
          overflow: "hidden",
          transition: "border 0.3s",
          position: "relative",
        }}
      >
        {/* Scan line on active */}
        {isActive && (
          <motion.div
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "30%",
              background:
                "linear-gradient(90deg, transparent, rgba(232,200,74,0.08), transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        )}

        {/* Left icon */}
        <div
          style={{
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            borderRight: "1px solid #1e2a38",
          }}
        >
          {isActive ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
              <Loader2 size={16} color="#e8c84a" />
            </motion.div>
          ) : (
            <Search size={16} color={url ? "#4ab8e8" : "#2a3a48"} style={{ transition: "color 0.25s" }} />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
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

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {(url || isSubmitted) && !isActive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onReset}
              style={{
                background: "transparent",
                border: "none",
                padding: "0 10px",
                cursor: "pointer",
                color: "#3a5060",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </motion.button>
          )}

          <motion.button
            whileHover={!isActive && url ? { scale: 1.02 } : {}}
            whileTap={!isActive && url ? { scale: 0.97 } : {}}
            onClick={() => url && !isActive && onSubmit()}
            disabled={!url || isActive}
            style={{
              margin: 6,
              padding: "9px 20px",
              background:
                url && !isActive
                  ? "rgba(74,184,232,0.15)"
                  : "rgba(30,42,56,0.4)",
              border: `1px solid ${
                url && !isActive ? "rgba(74,184,232,0.4)" : "rgba(30,42,56,0.6)"
              }`,
              borderRadius: 6,
              cursor: url && !isActive ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 7,
              transition: "all 0.25s",
              boxShadow:
                url && !isActive ? "0 0 14px rgba(74,184,232,0.12)" : "none",
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
            <ChevronRight
              size={12}
              color={url && !isActive ? "#4ab8e8" : "#2a3a48"}
              style={{ transition: "color 0.25s" }}
            />
          </motion.button>
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

  const validateFile = (f) => {
    // Standard validation
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
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

  const handleFile = useCallback(
    (f) => {
      setError(null);
      if (!validateFile(f)) return;
      setFile(f);
    },
    []
  );

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

  const handleStartAnalysis = async () => {
    if (!file || isUploading || parentIsSubmitting) return;
    setError(null);
    setProgress(0);
    setIsUploading(true);
    try {
      const job = await uploadMedia(file, selectedMode, setProgress);
      onUpload?.(job);
    } catch (err) {
      setError(err.message || 'Upload failed.');
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

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
          scale: dragging ? 1.01 : 1,
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
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTS.join(",")}
          onChange={handleInputChange}
          style={{ display: "none" }}
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
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
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#3cb878",
                  marginBottom: 4,
                }}
              >
                {file.name}
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: "#3a6050",
                  letterSpacing: "0.1em",
                }}
              >
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
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                animate={dragging ? { y: [-4, 0, -4] } : { y: 0 }}
                transition={{ duration: 0.6, repeat: dragging ? Infinity : 0 }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    background: dragging
                      ? "rgba(74,184,232,0.12)"
                      : "rgba(20,30,40,0.8)",
                    border: `1px solid ${
                      dragging ? "rgba(74,184,232,0.5)" : "#1e2a38"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    transition: "all 0.25s",
                    boxShadow: dragging ? "0 0 20px rgba(74,184,232,0.2)" : "none",
                  }}
                >
                  <Upload
                    size={24}
                    color={dragging ? "#4ab8e8" : "#2a3a48"}
                    style={{ transition: "color 0.25s" }}
                  />
                </div>
              </motion.div>

              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: dragging ? "#4ab8e8" : "#3a5060",
                  marginBottom: 6,
                  transition: "color 0.25s",
                }}
              >
                {dragging ? "RELEASE TO LOAD" : "DRAG & DROP VIDEO FILE"}
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9.5,
                  color: "#2a3a48",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                or click to browse
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {ACCEPTED_EXTS.map((ext) => (
                  <span
                    key={ext}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 8,
                      letterSpacing: "0.12em",
                      color: "#2a3a48",
                      background: "#0d1117",
                      border: "1px solid #1e2a38",
                      borderRadius: 3,
                      padding: "2px 6px",
                    }}
                  >
                    {ext.toUpperCase()}
                  </span>
                ))}
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 8,
                    letterSpacing: "0.12em",
                    color: "#1e2a38",
                    padding: "2px 0",
                    alignSelf: "center",
                  }}
                >
                  · MAX 500MB
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload progress bar */}
        {progress > 0 && progress < 100 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: 'rgba(255,255,255,0.05)',
          }}>
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%', background: '#4ab8e8' }}
            />
          </div>
        )}
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

      {file && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStartAnalysis}
          disabled={isUploading || parentIsSubmitting}
          style={{
            padding: "14px",
            background: (isUploading || parentIsSubmitting) ? "rgba(74,184,232,0.05)" : "rgba(74,184,232,0.1)",
            border: "1px solid rgba(74,184,232,0.35)",
            borderRadius: 8,
            cursor: (isUploading || parentIsSubmitting) ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 0 20px rgba(74,184,232,0.08)",
            opacity: (isUploading || parentIsSubmitting) ? 0.7 : 1,
          }}
        >
          {isUploading ? (
            <>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} color="#4ab8e8" />
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  color: "#4ab8e8",
                }}
              >
                UPLOADING {progress}%
              </span>
            </>
          ) : (
            <>
              <Zap size={15} color="#4ab8e8" />
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  color: "#4ab8e8",
                }}
              >
                INITIATE ANALYSIS
              </span>
              <ChevronRight size={13} color="#4ab8e8" />
            </>
          )}
        </motion.button>
      )}
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
  const prefersReduced = useReducedMotion();

  // CSS injection for spin keyframe + fonts
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

  return (
    <div
      style={{
        width: "100%",
        background: "linear-gradient(135deg, #080b0f 0%, #0a0e16 50%, #080b0f 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "60px 32px 40px",
        position: "relative",
      }}
    >
      {/* Background layers */}
      <GridBackground />
      <ScanlineOverlay opacity={0.02} />

      {/* Ambient glow blobs */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "15%",
          left: "20%",
          width: 400,
          height: 300,
          background:
            "radial-gradient(ellipse, rgba(74,184,232,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "20%",
          right: "15%",
          width: 350,
          height: 250,
          background:
            "radial-gradient(ellipse, rgba(74,184,232,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Corner accents */}
      {["tl", "tr", "br", "bl"].map((pos) => (
        <CornerAccent key={pos} position={pos} />
      ))}

      {/* ── Content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 740,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* ── Hero Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ textAlign: "center" }}
        >
          {/* Classification tag */}
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

          {/* Main title */}
          <div style={{ marginBottom: 10 }}>
            <GlitchTitle />
          </div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 15,
              fontWeight: 400,
              letterSpacing: "0.3em",
              color: "#3a5060",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Multimodal Intelligence Platform
          </motion.div>

          {/* Separator with system ID */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, #1e2a38 50%, transparent)",
              }}
            />
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8,
                letterSpacing: "0.14em",
                color: "#2a3a48",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <TerminalSquare size={9} />
              SYS-EDEN-v3.1 · ONLINE
            </div>
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, #1e2a38 50%, transparent)",
              }}
            />
          </motion.div>

          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <StatusBar
              isSubmitted={isSubmitted}
              isProcessing={isProcessing}
              isSubmitting={isSubmitting}
              url={url}
            />
          </div>
        </motion.div>

        {/* ── Command Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.55, ease: "easeOut" }}
          style={{
            background: "rgba(8,11,15,0.85)",
            border: "1px solid #1e2a38",
            borderRadius: 12,
            overflow: "hidden",
            backdropFilter: "blur(12px)",
            position: "relative",
          }}
        >
          <ScanlineOverlay opacity={0.015} />

          {/* Panel header */}
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid #1e2a38",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={12} color="#4ab8e8" style={{ opacity: 0.7 }} />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: "#3a5060",
                }}
              >
                COMMAND INTERFACE
              </span>
            </div>
            {/* Tab switcher */}
            <div
              style={{
                display: "flex",
                background: "rgba(13,17,23,0.8)",
                border: "1px solid #1e2a38",
                borderRadius: 6,
                overflow: "hidden",
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
                    background:
                      activeTab === tab.id
                        ? "rgba(74,184,232,0.12)"
                        : "transparent",
                    border: "none",
                    borderRight:
                      tab.id === "url" ? "1px solid #1e2a38" : "none",
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color:
                      activeTab === tab.id ? "#4ab8e8" : "#2a3a48",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panel body */}
          <div style={{ padding: "20px 18px", position: "relative", zIndex: 1 }}>
            <AnimatePresence mode="wait">
              {activeTab === "url" ? (
                <motion.div
                  key="url-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <URLInput
                    url={url}
                    onUrlChange={onUrlChange}
                    onSubmit={onSubmit}
                    onReset={onReset}
                    isSubmitted={isSubmitted}
                    isProcessing={isProcessing}
                    isSubmitting={isSubmitting}
                  />

                  {/* Mode selector */}
                  <div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 8,
                        letterSpacing: "0.18em",
                        color: "#2a3a48",
                        marginBottom: 8,
                        textTransform: "uppercase",
                      }}
                    >
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
                      />
                      <ModeCard
                        mode="audio"
                        label="Audio Focus"
                        icon={Mic2}
                        desc="Deep audio analysis with speech transcription and acoustic intelligence"
                        isSelected={selectedMode === "audio"}
                        onClick={onModeChange}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="upload-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.22 }}
                >
                  <UploadZone 
                    onUpload={onUpload} 
                    selectedMode={selectedMode} 
                    isSubmitting={isSubmitting} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Feature Cards ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8,
              letterSpacing: "0.2em",
              color: "#2a3a48",
              textAlign: "center",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
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
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 8,
            letterSpacing: "0.12em",
            color: "#1e2a38",
          }}
        >
          {["REAL-TIME ANALYSIS", "·", "E2E ENCRYPTED", "·", "ZERO RETENTION", "·", "GDPR COMPLIANT"].map(
            (item, i) => (
              <span key={i} style={{ color: item === "·" ? "#1a2530" : "#1e2a38" }}>
                {item}
              </span>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
}