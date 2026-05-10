/**
 * ExportMenu.jsx — Eden AI · Step 10 "Export"
 * Self-contained floating export dropdown. Props: jobId, jobData.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Icons ────────────────────────────────────────────────────────────────────
function JsonIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M3 2.5C2.5 2.5 2 3 2 3.5V5C2 5.5 1.5 6 1 6.5C1.5 7 2 7.5 2 8V9.5C2 10 2.5 10.5 3 10.5" stroke="rgba(232,230,224,0.35)" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M10 2.5C10.5 2.5 11 3 11 3.5V5C11 5.5 11.5 6 12 6.5C11.5 7 11 7.5 11 8V9.5C11 10 10.5 10.5 10 10.5" stroke="rgba(232,230,224,0.35)" strokeWidth="1.1" strokeLinecap="round" />
            <circle cx="6.5" cy="6.5" r="1" fill="rgba(232,230,224,0.35)" />
        </svg>
    );
}
function MarkdownIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 9.5V3.5H3L5 6.5L7 3.5H8.5V9.5H7V6L5 9L3 6V9.5H1.5Z" stroke="rgba(232,230,224,0.35)" strokeWidth="1" strokeLinejoin="round" fill="none" />
            <path d="M10 7.5L11.5 9L13 7.5" stroke="rgba(232,230,224,0.35)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11.5 4V9" stroke="rgba(232,230,224,0.35)" strokeWidth="1" strokeLinecap="round" />
        </svg>
    );
}
function PrintIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="2.5" y="5" width="8" height="5.5" rx="1" stroke="rgba(232,230,224,0.35)" strokeWidth="1.1" />
            <path d="M4 5V2.5H9V5" stroke="rgba(232,230,224,0.35)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.5 8.5H8.5M4.5 10H7" stroke="rgba(232,230,224,0.35)" strokeWidth="1" strokeLinecap="round" />
            <circle cx="10" cy="6.5" r="0.6" fill="rgba(232,230,224,0.35)" />
        </svg>
    );
}
function CheckIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M3 6.5L5.5 9L10 4" stroke="#22C55E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function triggerDownload(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function deriveRiskLevel(jobData) {
    const score = jobData?.risk_score ?? jobData?.riskScore ?? 0;
    const pct = Math.round(score * 100);
    const level = pct >= 66 ? "HIGH" : pct >= 33 ? "MEDIUM" : "LOW";
    return { pct, level };
}

function buildMarkdown(jobId, jobData) {
    const url = jobData?.url ?? jobData?.source_url ?? "Unknown";
    const date = new Date().toISOString().split("T")[0];
    const { pct, level } = deriveRiskLevel(jobData);
    const summary = jobData?.summary ?? jobData?.intelligence_summary ?? "No summary available.";
    const claims = jobData?.claims ?? jobData?.fact_checks ?? [];
    const transcript = jobData?.transcript ?? "";
    const ocr = jobData?.ocr_text ?? jobData?.ocr ?? "";

    const claimsBlock = claims.length
        ? claims.map(c => {
            const verdict = (c.verdict ?? c.label ?? "UNKNOWN").toUpperCase();
            const text = c.text ?? c.claim ?? c.content ?? "";
            const rationale = c.rationale ?? c.explanation ?? "";
            return `- **[${verdict}]** "${text}"${rationale ? ` — ${rationale}` : ""}`;
        }).join("\n")
        : "_No claims extracted._";

    const transcriptBlock = typeof transcript === "string"
        ? transcript
        : Array.isArray(transcript)
            ? transcript.map(t => t.text ?? t).join("\n")
            : "_No transcript available._";

    const ocrBlock = typeof ocr === "string"
        ? ocr
        : Array.isArray(ocr)
            ? ocr.map(o => o.text ?? o).join("\n")
            : "_No OCR data available._";

    return [
        `# Eden Intelligence Report`,
        ``,
        `**Job ID:** ${jobId}`,
        `**Analyzed:** ${url}`,
        `**Date:** ${date}`,
        `**Risk Level:** ${level} (${pct}/100)`,
        ``,
        `## Intelligence Summary`,
        ``,
        summary,
        ``,
        `## Claims (${claims.length})`,
        ``,
        claimsBlock,
        ``,
        `## Transcript`,
        ``,
        transcriptBlock,
        ``,
        `## On-Screen Text (OCR)`,
        ``,
        ocrBlock,
    ].join("\n");
}

// ─── Menu Item ────────────────────────────────────────────────────────────────
function MenuItem({ icon, label, onClick, confirmed }) {
    return (
        <div
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 14px",
                cursor: "pointer",
                borderRadius: 5,
                transition: "background 0.1s",
                userSelect: "none",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center", width: 13 }}>
                {confirmed ? <CheckIcon /> : icon}
            </span>
            <span style={{
                fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                fontSize: 12,
                color: confirmed ? "#22C55E" : "rgba(232,230,224,0.65)",
                transition: "color 0.15s",
                flex: 1,
            }}>
                {confirmed ? "Exported" : label}
            </span>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExportMenu({ jobId, jobData }) {
    const [isOpen, setIsOpen] = useState(false);
    const [confirmed, setConfirmed] = useState(null); // "json" | "md" | "pdf"
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === "Escape") setIsOpen(false); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen]);

    const flash = useCallback((key) => {
        setConfirmed(key);
        setTimeout(() => setConfirmed(null), 1500);
    }, []);

    const handleJson = useCallback(() => {
        triggerDownload(
            JSON.stringify(jobData, null, 2),
            `eden-report-${jobId}.json`,
            "application/json"
        );
        flash("json");
    }, [jobId, jobData, flash]);

    const handleMarkdown = useCallback(() => {
        triggerDownload(
            buildMarkdown(jobId, jobData),
            `eden-report-${jobId}.md`,
            "text/markdown"
        );
        flash("md");
    }, [jobId, jobData, flash]);

    const handlePrint = useCallback(() => {
        const prev = document.title;
        document.title = `Eden Report — ${jobId}`;
        window.print();
        document.title = prev;
        flash("pdf");
    }, [jobId, flash]);

    return (
        <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
            {/* ── Trigger Button ── */}
            <button
                onClick={() => setIsOpen(v => !v)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    border: `1px solid ${isOpen ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 6,
                    background: "transparent",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 9,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: isOpen ? "rgba(232,230,224,0.7)" : "rgba(232,230,224,0.4)",
                    transition: "color 0.15s",
                }}>
                    Export
                </span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        color: "rgba(232,230,224,0.3)",
                        fontSize: 9,
                        lineHeight: 1,
                    }}
                >
                    ↓
                </motion.span>
            </button>

            {/* ── Dropdown ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="export-dropdown"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            right: 0,
                            minWidth: 180,
                            background: "#111111",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                            zIndex: 300,
                            overflow: "hidden",
                            padding: "4px",
                        }}
                    >
                        <MenuItem
                            icon={<JsonIcon />}
                            label="Raw Data · JSON"
                            onClick={handleJson}
                            confirmed={confirmed === "json"}
                        />
                        <MenuItem
                            icon={<MarkdownIcon />}
                            label="Summary · Markdown"
                            onClick={handleMarkdown}
                            confirmed={confirmed === "md"}
                        />
                        <MenuItem
                            icon={<PrintIcon />}
                            label="Report · PDF"
                            onClick={handlePrint}
                            confirmed={confirmed === "pdf"}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}