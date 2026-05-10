/**
 * CredibilityTimeline.jsx — Eden AI · Step 12
 * Horizontal scrubber plotting claims at their timestamps, color-coded by verdict.
 * Returns null if fewer than 2 claims have timestamps or duration can't be derived.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VERDICT_COLOR = {
    true: "#22C55E",
    verified: "#22C55E",
    false: "#EF4444",
    misleading: "#EF4444",
    unverifiable: "#F97316",
    unverified: "#F97316",
};

function verdictColor(raw = "") {
    const v = raw.toLowerCase();
    for (const [key, color] of Object.entries(VERDICT_COLOR)) {
        if (v.includes(key)) return color;
    }
    return "#6B7280";
}

function getTimestamp(claim) {
    const t = claim.timestamp ?? claim.start_time ?? claim.time_offset;
    return typeof t === "number" ? t : null;
}

function fmtTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

function truncate(str = "", max = 40) {
    return str.length > max ? str.slice(0, max) + "…" : str;
}

// ─── Dot + Tooltip ────────────────────────────────────────────────────────────
function ClaimDot({ claim, left, color, onClick }) {
    const [hovered, setHovered] = useState(false);
    const ts = getTimestamp(claim);
    const text = claim.text ?? claim.claim ?? claim.content ?? "";
    const verdict = claim.verdict ?? claim.label ?? "Unknown";

    return (
        <div style={{ position: "absolute", left: `${left}%`, top: "50%", transform: "translate(-50%, -50%)", zIndex: 2 }}>
            <motion.div
                whileHover={{ scale: 1.4 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={onClick}
                style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 6px ${color}88`,
                    cursor: onClick ? "pointer" : "default",
                    position: "relative",
                }}
            />

            <AnimatePresence>
                {hovered && (
                    <motion.div
                        key="tooltip"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: "absolute",
                            bottom: "calc(100% + 10px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#111111",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 6,
                            padding: "6px 10px",
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            zIndex: 10,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {/* Timestamp + verdict */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 10,
                                color: "rgba(232,230,224,0.4)",
                            }}>
                                {fmtTime(ts)}
                            </span>
                            <span style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 10,
                                color,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                            }}>
                                {verdict}
                            </span>
                        </div>
                        {/* Claim text */}
                        {text && (
                            <span style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 10,
                                color: "rgba(232,230,224,0.6)",
                                maxWidth: 220,
                                whiteSpace: "normal",
                                lineHeight: 1.4,
                            }}>
                                {truncate(text)}
                            </span>
                        )}
                        {/* Arrow */}
                        <div style={{
                            position: "absolute",
                            bottom: -5,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 8, height: 5,
                            overflow: "hidden",
                        }}>
                            <div style={{
                                width: 8, height: 8,
                                background: "#111111",
                                border: "1px solid rgba(255,255,255,0.10)",
                                transform: "rotate(45deg) translate(1px, -5px)",
                            }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CredibilityTimeline({ claims = [], jobData = {}, onClaimClick }) {
    // Filter claims with valid timestamps
    const timedClaims = claims.filter(c => getTimestamp(c) !== null);
    if (timedClaims.length < 2) return null;

    // Derive duration
    let duration = jobData?.media_duration ?? jobData?.duration ?? null;
    if (!duration) {
        const maxTs = Math.max(...timedClaims.map(c => getTimestamp(c)));
        if (!maxTs || maxTs <= 0) return null;
        duration = maxTs * 1.2;
    }
    if (!duration || duration <= 0) return null;

    // Time markers at 0%, 25%, 50%, 75%, 100%
    const markers = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
        pct,
        label: fmtTime(Math.round(pct * duration)),
    }));

    return (
        <div style={{
            width: "100%",
            height: 72,
            background: "#0A0A0A",
            borderRadius: 10,
            padding: "10px 16px 0",
            boxSizing: "border-box",
            position: "relative",
            overflow: "visible",
        }}>
            {/* ── Header labels ── */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 9, letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(232,230,224,0.25)",
                }}>
                    Credibility Timeline
                </span>
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 9,
                    color: "rgba(232,230,224,0.2)",
                }}>
                    0:00 – {fmtTime(Math.floor(duration))}
                </span>
            </div>

            {/* ── Track area ── */}
            <div style={{ position: "relative", height: 28, marginTop: 4 }}>

                {/* Track bar */}
                <div style={{
                    position: "absolute",
                    left: 0, right: 0,
                    top: "40%",
                    height: 3,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 2,
                }} />

                {/* Tick marks + labels */}
                {markers.map(({ pct, label }) => (
                    <div key={pct} style={{
                        position: "absolute",
                        left: `${pct * 100}%`,
                        top: "40%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                    }}>
                        <div style={{
                            width: 1, height: 6,
                            background: "rgba(255,255,255,0.12)",
                            marginTop: -1,
                        }} />
                        <span style={{
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            fontSize: 9,
                            color: "rgba(255,255,255,0.2)",
                            whiteSpace: "nowrap",
                        }}>
                            {label}
                        </span>
                    </div>
                ))}

                {/* Claim dots */}
                {timedClaims.map((claim, i) => {
                    const ts = getTimestamp(claim);
                    const left = Math.min((ts / duration) * 100, 98);
                    const color = verdictColor(claim.verdict ?? claim.label ?? "");
                    return (
                        <ClaimDot
                            key={claim.id ?? i}
                            claim={claim}
                            left={left}
                            color={color}
                            onClick={onClaimClick ? () => onClaimClick(claim) : undefined}
                        />
                    );
                })}
            </div>
        </div>
    );
}