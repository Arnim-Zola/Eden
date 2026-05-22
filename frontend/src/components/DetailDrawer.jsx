/**
 * DetailDrawer.jsx — Eden AI · Step 6 "Investigate"
 *
 * Slides in from the right when a claim row is selected.
 * Receives: claim (object), jobData (object), onClose (fn), onHighlightTranscript (fn)
 *
 * Design: Cold Signal aesthetic — #080808 bg, Geist + Geist Mono, signal colors for verdict.
 */

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "../hooks/useMediaQuery";

// ─── Verdict Config ───────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
    true: {
        label: "VERIFIED TRUE",
        color: "#22C55E",
        bg: "rgba(34,197,94,0.08)",
        border: "rgba(34,197,94,0.20)",
        Icon: VerifiedIcon,
    },
    false: {
        label: "FALSE",
        color: "#EF4444",
        bg: "rgba(239,68,68,0.08)",
        border: "rgba(239,68,68,0.20)",
        Icon: FalseIcon,
    },
    misleading: {
        label: "MISLEADING",
        color: "#F97316",
        bg: "rgba(249,115,22,0.08)",
        border: "rgba(249,115,22,0.20)",
        Icon: MisleadingIcon,
    },
    unverified: {
        label: "UNVERIFIED",
        color: "#6B7280",
        bg: "rgba(107,114,128,0.08)",
        border: "rgba(107,114,128,0.20)",
        Icon: UnverifiedIcon,
    },
    plausible: {
        label: "PLAUSIBLE",
        color: "#4A7CF7",
        bg: "rgba(74,124,247,0.08)",
        border: "rgba(74,124,247,0.20)",
        Icon: UnverifiedIcon, // Reuse icon with different color
    },
};

function normalizeVerdict(raw = "") {
    const v = raw.toLowerCase();
    if (v.includes("true") || v.includes("verified")) return "true";
    if (v.includes("false") || v.includes("risk")) return "false";
    if (v.includes("mislead")) return "misleading";
    if (v.includes("plausible")) return "plausible";
    return "unverified";
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function VerifiedIcon({ color, size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke={color} strokeWidth="1.5" />
            <path d="M5.5 9L8 11.5L12.5 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function FalseIcon({ color, size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke={color} strokeWidth="1.5" />
            <path d="M6 6L12 12M12 6L6 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
function MisleadingIcon({ color, size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
            <path d="M9 2L16.5 15H1.5L9 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9 7V10M9 12.5V13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
function UnverifiedIcon({ color, size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
            <path d="M9 5V9.5M9 12V13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
function TranscriptIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="#4A7CF7" strokeWidth="1.2" />
            <path d="M4 5H10M4 7H8M4 9H9" stroke="#4A7CF7" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}
function OcrIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4V2H4M10 2H12V4M12 10V12H10M4 12H2V10" stroke="#4A7CF7" strokeWidth="1.2" strokeLinecap="round" />
            <rect x="4.5" y="4.5" width="5" height="5" rx="1" stroke="#4A7CF7" strokeWidth="1.2" />
        </svg>
    );
}
function ClockIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="#6B7280" strokeWidth="1.1" />
            <path d="M6 3.5V6L7.5 7.5" stroke="#6B7280" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function CloseIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
    );
}

// ─── Confidence Arc ───────────────────────────────────────────────────────────
function ConfidenceArc({ value = 0.5, color = "#4A7CF7" }) {
    // Semi-circle: value 0–1 drives the arc fill
    const R = 44;
    const cx = 56;
    const cy = 56;
    const circumference = Math.PI * R; // half circle
    const filled = circumference * value;
    const gap = circumference - filled;

    // arc path from left (180°) to right (0°), bottom trimmed
    const arcPath = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <svg width="112" height="64" viewBox="0 0 112 64" fill="none">
                {/* Track */}
                <path
                    d={arcPath}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                />
                {/* Fill — animated via stroke-dasharray */}
                <motion.path
                    d={arcPath}
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${circumference}`}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: gap }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />
                {/* Glow */}
                <motion.path
                    d={arcPath}
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${circumference}`}
                    initial={{ strokeDashoffset: circumference, opacity: 0 }}
                    animate={{ strokeDashoffset: gap, opacity: 0.3 }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    style={{ filter: `blur(3px)` }}
                />
            </svg>
            <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 22,
                    fontWeight: 600,
                    color,
                    letterSpacing: "-0.02em",
                    marginTop: -20,
                    lineHeight: 1,
                }}
            >
                {Math.round(value * 100)}
                <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(232,230,224,0.4)", marginLeft: 2 }}>%</span>
            </motion.span>
            <span style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "rgba(232,230,224,0.3)",
                textTransform: "uppercase",
                marginTop: 2,
            }}>
                CONFIDENCE
            </span>
        </div>
    );
}

// ─── Evidence Ref Button ──────────────────────────────────────────────────────
function EvidenceRefButton({ icon, label, sublabel, onClick, disabled }) {
    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            whileHover={disabled ? {} : { x: 3 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                width: "100%",
                background: disabled ? "transparent" : "rgba(74,124,247,0.05)",
                border: `1px solid ${disabled ? "rgba(255,255,255,0.05)" : "rgba(74,124,247,0.18)"}`,
                borderRadius: 6,
                padding: "10px 12px",
                cursor: disabled ? "default" : "pointer",
                textAlign: "left",
                transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "rgba(74,124,247,0.09)"; }}
            onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = "rgba(74,124,247,0.05)"; }}
        >
            <span style={{ marginTop: 1, flexShrink: 0, opacity: disabled ? 0.3 : 1 }}>{icon}</span>
            <div>
                <div style={{
                    fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: disabled ? "rgba(232,230,224,0.3)" : "#E8E6E0",
                    lineHeight: 1.3,
                }}>
                    {label}
                </div>
                {sublabel && (
                    <div style={{
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                        fontSize: 10,
                        color: disabled ? "rgba(232,230,224,0.2)" : "rgba(74,124,247,0.7)",
                        marginTop: 3,
                        lineHeight: 1.4,
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}>
                        {sublabel}
                    </div>
                )}
            </div>
            {!disabled && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "auto", marginTop: 3, flexShrink: 0 }}>
                    <path d="M4.5 3L7.5 6L4.5 9" stroke="#4A7CF7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </motion.button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DetailDrawer({ claim, jobData, onClose, onHighlightTranscript }) {
    const overlayRef = useRef(null);
    const isMobile = useMediaQuery("(max-width: 767px)");

    // Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    // Click outside
    const handleOverlayClick = useCallback((e) => {
        if (e.target === overlayRef.current) onClose?.();
    }, [onClose]);

    if (!claim) return null;

    const verdictKey = normalizeVerdict(claim.verdict || claim.label || "");
    const config = VERDICT_CONFIG[verdictKey] || VERDICT_CONFIG.unverified;
    const { Icon } = config;

    const confidence = typeof claim.confidence === "number"
        ? claim.confidence
        : parseFloat(claim.confidence) || 0.5;

    // Extract evidence refs from claim
    const transcriptRef = claim.transcript_reference || claim.transcriptRef || null;
    const ocrRef = claim.ocr_reference || claim.ocrRef || null;
    const timestamp = claim.timestamp || claim.time_reference || null;

    const handleTranscriptLink = () => {
        if (transcriptRef && onHighlightTranscript) {
            onHighlightTranscript(transcriptRef);
        }
    };

    return (
        <AnimatePresence>
            {/* ── Overlay ── */}
            <motion.div
                ref={overlayRef}
                key="drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={handleOverlayClick}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(8,8,8,0.6)",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    zIndex: 200,
                    display: "flex",
                    justifyContent: "flex-end",
                }}
            >
                {/* ── Drawer Panel — right side on desktop, bottom sheet on mobile ── */}
                <motion.aside
                    key="drawer-panel"
                    initial={isMobile ? { y: "100%" } : { x: "100%" }}
                    animate={isMobile ? { y: 0 } : { x: 0 }}
                    exit={isMobile ? { y: "100%" } : { x: "100%" }}
                    transition={{ type: "spring", stiffness: 340, damping: 36, mass: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                    style={isMobile ? {
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "92dvh",
                        background: "#0F0F0F",
                        borderTop: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "16px 16px 0 0",
                        display: "flex",
                        flexDirection: "column",
                        overflowY: "auto",
                        zIndex: 201,
                    } : {
                        width: "min(420px, 92vw)",
                        height: "100dvh",
                        background: "#0F0F0F",
                        borderLeft: "1px solid rgba(255,255,255,0.07)",
                        display: "flex",
                        flexDirection: "column",
                        overflowY: "auto",
                        position: "relative",
                    }}
                >

                    {/* ── Mobile drag handle ── */}
                    {isMobile && (
                        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
                        </div>
                    )}

                    {/* ── Close Button ── */}
                    <button
                        onClick={onClose}
                        aria-label="Close drawer"
                        style={{
                            position: "absolute",
                            top: isMobile ? 20 : 16,
                            right: 16,
                            width: 30,
                            height: 30,
                            borderRadius: 6,
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            zIndex: 10,
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                        <CloseIcon />
                    </button>

                    {/* ── Section Label ── */}
                    <div style={{
                        padding: "20px 20px 0",
                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                        fontSize: 9,
                        letterSpacing: "0.14em",
                        color: "rgba(232,230,224,0.25)",
                        textTransform: "uppercase",
                    }}>
                        Claim Analysis
                    </div>

                    {/* ═══════════════════════════════════════════════════
              1. VERDICT HEADER
          ═══════════════════════════════════════════════════ */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.35 }}
                        style={{
                            margin: "10px 20px 0",
                            padding: "12px 14px",
                            borderRadius: 8,
                            background: config.bg,
                            border: `1px solid ${config.border}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <span style={{ flexShrink: 0 }}>
                            <Icon color={config.color} size={20} />
                        </span>
                        <div>
                            <div style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 11,
                                letterSpacing: "0.10em",
                                color: config.color,
                                fontWeight: 600,
                            }}>
                                {config.label}
                            </div>
                            {claim.category && (
                                <div style={{
                                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                    fontSize: 9,
                                    letterSpacing: "0.08em",
                                    color: "rgba(232,230,224,0.35)",
                                    marginTop: 2,
                                    textTransform: "uppercase",
                                }}>
                                    {claim.category}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* ═══════════════════════════════════════════════════
              2. CLAIM VERBATIM
          ═══════════════════════════════════════════════════ */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.13, duration: 0.35 }}
                        style={{ padding: "18px 20px 0" }}
                    >
                        <div style={{
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            color: "rgba(232,230,224,0.3)",
                            textTransform: "uppercase",
                            marginBottom: 8,
                        }}>
                            Claim
                        </div>
                        <blockquote style={{
                            margin: 0,
                            padding: "12px 14px",
                            borderLeft: `2px solid ${config.color}`,
                            background: "rgba(255,255,255,0.02)",
                            borderRadius: "0 6px 6px 0",
                        }}>
                            <p style={{
                                fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                fontSize: 13.5,
                                lineHeight: 1.65,
                                color: "#E8E6E0",
                                margin: 0,
                                fontStyle: "italic",
                            }}>
                                &ldquo;{claim.claim_text || claim.text || claim.claim || claim.content || "No claim text available."}&rdquo;
                            </p>
                        </blockquote>
                    </motion.div>

                    {/* ═══════════════════════════════════════════════════
              3. CONFIDENCE ARC
          ═══════════════════════════════════════════════════ */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.35 }}
                        style={{
                            padding: "18px 20px 0",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <div style={{
                            width: "100%",
                            padding: "16px 14px 14px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: 8,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}>
                            <ConfidenceArc value={confidence} color={config.color} />
                        </div>
                    </motion.div>

                    {/* ═══════════════════════════════════════════════════
              4. RATIONALE
          ═══════════════════════════════════════════════════ */}
                    {(claim.rationale || claim.explanation || claim.reasoning) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.22, duration: 0.35 }}
                            style={{ padding: "18px 20px 0" }}
                        >
                            <div style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 9,
                                letterSpacing: "0.12em",
                                color: "rgba(232,230,224,0.3)",
                                textTransform: "uppercase",
                                marginBottom: 8,
                            }}>
                                Rationale
                            </div>
                            <p style={{
                                fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                fontSize: 13,
                                lineHeight: 1.7,
                                color: "rgba(232,230,224,0.75)",
                                margin: 0,
                            }}>
                                {claim.rationale || claim.explanation || claim.reasoning}
                            </p>
                        </motion.div>
                    )}

                    {/* ═══════════════════════════════════════════════════
              5. EVIDENCE CHAIN
          ═══════════════════════════════════════════════════ */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.27, duration: 0.35 }}
                        style={{ padding: "18px 20px 0" }}
                    >
                        <div style={{
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            color: "rgba(232,230,224,0.3)",
                            textTransform: "uppercase",
                            marginBottom: 8,
                        }}>
                            Evidence Chain
                        </div>

                        {/* Vertical connector line */}
                        <div style={{ position: "relative" }}>
                            <div style={{
                                position: "absolute",
                                left: 17,
                                top: 28,
                                width: 1,
                                height: "calc(100% - 56px)",
                                background: "linear-gradient(180deg, rgba(74,124,247,0.25) 0%, rgba(74,124,247,0.05) 100%)",
                            }} />

                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {/* Transcript Reference */}
                                <EvidenceRefButton
                                    icon={<TranscriptIcon />}
                                    label={transcriptRef ? "Jump to transcript passage" : "No transcript reference"}
                                    sublabel={transcriptRef
                                        ? (typeof transcriptRef === "string"
                                            ? transcriptRef.slice(0, 60) + (transcriptRef.length > 60 ? "…" : "")
                                            : `t=${transcriptRef.start ?? ""}`)
                                        : null}
                                    onClick={handleTranscriptLink}
                                    disabled={!transcriptRef}
                                />

                                {/* OCR Reference */}
                                <EvidenceRefButton
                                    icon={<OcrIcon />}
                                    label={ocrRef ? "On-screen text match" : "No OCR reference"}
                                    sublabel={ocrRef
                                        ? (typeof ocrRef === "string"
                                            ? ocrRef.slice(0, 60) + (ocrRef.length > 60 ? "…" : "")
                                            : ocrRef.text ?? JSON.stringify(ocrRef).slice(0, 60))
                                        : null}
                                    onClick={undefined}
                                    disabled={!ocrRef}
                                />
                            </div>
                        </div>
                    </motion.div>
 
                    {/* ═══════════════════════════════════════════════════
              5.5. VERIFYING SOURCES
          ═══════════════════════════════════════════════════ */}
                    {claim.related_sources && claim.related_sources.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.35 }}
                            style={{ padding: "18px 20px 0" }}
                        >
                            <div style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 9,
                                letterSpacing: "0.12em",
                                color: "rgba(232,230,224,0.3)",
                                textTransform: "uppercase",
                                marginBottom: 8,
                            }}>
                                Verifying Sources
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {claim.related_sources.map((source, sIdx) => {
                                    let domain = "";
                                    try {
                                        domain = new URL(source.url).hostname.replace('www.', '');
                                    } catch (e) {
                                        domain = "web reference";
                                    }

                                    return (
                                        <motion.a
                                            key={sIdx}
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            whileHover={{ x: 3, borderColor: "rgba(74,124,247,0.4)" }}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: 10,
                                                width: "100%",
                                                background: "rgba(255,255,255,0.02)",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                                borderRadius: 8,
                                                padding: "10px 12px",
                                                cursor: "pointer",
                                                textDecoration: "none",
                                                transition: "border-color 0.15s, background 0.15s",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = "rgba(74,124,247,0.04)"}
                                            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A7CF7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                            </svg>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    color: "#E8E6E0",
                                                    lineHeight: 1.35,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical"
                                                }}>
                                                    {source.title}
                                                </div>
                                                <div style={{
                                                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                                    fontSize: 9,
                                                    color: "#4A7CF7",
                                                    marginTop: 3,
                                                    letterSpacing: "0.02em"
                                                }}>
                                                    {domain}
                                                </div>
                                                {source.snippet && (
                                                    <div style={{
                                                        fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                                        fontSize: 11,
                                                        color: "rgba(232,230,224,0.45)",
                                                        marginTop: 4,
                                                        lineHeight: 1.4,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical"
                                                    }}>
                                                        {source.snippet}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.a>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* ═══════════════════════════════════════════════════
              6. TIMESTAMP
          ═══════════════════════════════════════════════════ */}
                    {timestamp && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.32, duration: 0.35 }}
                            style={{
                                margin: "18px 20px 0",
                                padding: "9px 12px",
                                borderRadius: 6,
                                border: "1px solid rgba(255,255,255,0.05)",
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                            }}
                        >
                            <ClockIcon />
                            <span style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 11,
                                color: "rgba(232,230,224,0.4)",
                                letterSpacing: "0.04em",
                            }}>
                                {(() => {
                                    const secs = typeof timestamp === "number" ? timestamp : parseFloat(timestamp);
                                    if (!isNaN(secs)) {
                                        const m = Math.floor(secs / 60);
                                        const s = Math.floor(secs % 60);
                                        return `Claim made at ${m}:${String(s).padStart(2, "0")} in the video`;
                                    }
                                    return String(timestamp);
                                })()}
                            </span>
                        </motion.div>
                    )}

                    {/* ── Bottom spacer ── */}
                    <div style={{ height: 32 }} />
                </motion.aside>
            </motion.div>
        </AnimatePresence>
    );
}