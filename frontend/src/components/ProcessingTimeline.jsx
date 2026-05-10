/**
 * ProcessingTimeline.jsx — Eden AI · §7 §103
 * Retrospective Gantt bar showing how long each pipeline stage took.
 * Only renders after job completion. Returns null if no timing data is available.
 *
 * Props: jobData (object)
 * Reads: jobData.pipeline_timings | jobData.timings | jobData.stage_durations
 * Shape: [{ stage: string, duration_ms: number }] or { [stage]: duration_ms }
 */
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

// ─── Stage label map ──────────────────────────────────────────────────────────
const STAGE_LABELS = {
    ingest: "Ingest",
    download: "Download",
    extract_frames: "Frames",
    ocr: "OCR",
    transcribe: "Transcribe",
    whisper: "Transcribe",
    analyze: "Analyze",
    analysis: "Analyze",
    fact_check: "Fact-Check",
    factcheck: "Fact-Check",
};

const STAGE_COLORS = [
    "#4A7CF7",
    "#2A9D5C",
    "#D4841A",
    "#E8453C",
    "#8B5CF6",
    "#06B6D4",
];

function fmtMs(ms) {
    if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
}

function normalizeTimings(jobData) {
    // Support multiple payload shapes
    const raw =
        jobData?.pipeline_timings ??
        jobData?.timings ??
        jobData?.stage_durations ??
        null;

    if (!raw) return null;

    // Array shape: [{ stage, duration_ms }]
    if (Array.isArray(raw)) {
        const valid = raw.filter(
            (t) => t && typeof t.duration_ms === "number" && t.duration_ms > 0
        );
        return valid.length >= 2 ? valid : null;
    }

    // Object shape: { stage_name: duration_ms }
    if (typeof raw === "object") {
        const entries = Object.entries(raw)
            .filter(([, v]) => typeof v === "number" && v > 0)
            .map(([k, v]) => ({ stage: k, duration_ms: v }));
        return entries.length >= 2 ? entries : null;
    }

    return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProcessingTimeline({ jobData }) {
    const timings = normalizeTimings(jobData);
    const [animated, setAnimated] = useState(false);
    const ref = useRef(null);

    // Trigger animation when scrolled into view
    useEffect(() => {
        if (!timings) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
            { threshold: 0.3 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [timings]);

    if (!timings) return null;

    const totalMs = timings.reduce((a, t) => a + t.duration_ms, 0);
    if (totalMs <= 0) return null;

    return (
        <div
            ref={ref}
            style={{
                padding: "12px 16px 16px",
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            {/* ── Header ── */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
            }}>
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(232,230,224,0.25)",
                }}>
                    Processing Timeline
                </span>
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 9,
                    color: "rgba(232,230,224,0.2)",
                }}>
                    Total {fmtMs(totalMs)}
                </span>
            </div>

            {/* ── Stacked Gantt rows ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {timings.map(({ stage, duration_ms }, i) => {
                    const pct = (duration_ms / totalMs) * 100;
                    const color = STAGE_COLORS[i % STAGE_COLORS.length];
                    const label = STAGE_LABELS[stage.toLowerCase()] ?? stage;

                    return (
                        <div key={stage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {/* Stage label */}
                            <span style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 9,
                                letterSpacing: "0.06em",
                                color: "rgba(232,230,224,0.35)",
                                textTransform: "uppercase",
                                width: 68,
                                flexShrink: 0,
                                textAlign: "right",
                            }}>
                                {label}
                            </span>

                            {/* Bar track */}
                            <div style={{
                                flex: 1,
                                height: 6,
                                background: "rgba(255,255,255,0.04)",
                                borderRadius: 3,
                                overflow: "hidden",
                            }}>
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: animated ? pct / 100 : 0 }}
                                    transition={{
                                        duration: 0.7,
                                        delay: i * 0.08,
                                        ease: [0.4, 0, 0.2, 1],
                                    }}
                                    style={{
                                        height: "100%",
                                        width: `${pct}%`,
                                        background: color,
                                        borderRadius: 3,
                                        transformOrigin: "left",
                                        boxShadow: `0 0 6px ${color}55`,
                                    }}
                                />
                            </div>

                            {/* Duration label */}
                            <span style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 9,
                                color: color,
                                opacity: 0.7,
                                width: 36,
                                flexShrink: 0,
                            }}>
                                {fmtMs(duration_ms)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
