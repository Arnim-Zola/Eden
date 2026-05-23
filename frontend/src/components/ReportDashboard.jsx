/**
 * ReportDashboard.jsx
 * Aesthetic: Cold Intelligence / Forensic Terminal
 * Layout: Fixed left "Threat Spine" + scrollable right analysis panel
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { getJob } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
    ExternalLink, X, AlertTriangle, ShieldAlert,
    ShieldCheck, HelpCircle, BarChart2, FileText,
    Film, Eye, Mic
} from 'lucide-react';
import ExportMenu from './ExportMenu';
import ProcessingTimeline from './ProcessingTimeline';
import PrintReport from './PrintReport';

const CLASSIFICATION_META = {
  VERIFIED_LIKELY_TRUE: { color: "#3ddc84", bg: "#001a0d", label: "VERIFIED",   weight: 0.0  },
  TRUE:                 { color: "#3ddc84", bg: "#001a0d", label: "VERIFIED",   weight: 0.0  },
  PLAUSIBLE:            { color: "#4ab8e8", bg: "#001a26", label: "PLAUSIBLE",  weight: 0.15 },
  UNVERIFIED:           { color: "#e8c84a", bg: "#1a1700", label: "UNVERIFIED", weight: 0.4  },
  OPINION_OR_SATIRE:    { color: "#a855f7", bg: "#1e1135", label: "SATIRE",      weight: 0.2  },
  MISLEADING_CONTEXT:   { color: "#ff8c00", bg: "#1a1100", label: "MISLEADING", weight: 0.85 },
  MISLEADING:           { color: "#ff8c00", bg: "#1a1100", label: "MISLEADING", weight: 0.85 },
  LIKELY_FALSE:         { color: "#ff3b3b", bg: "#1a0a0a", label: "FALSE",      weight: 1.0  },
  FALSE:                { color: "#ff3b3b", bg: "#1a0a0a", label: "FALSE",      weight: 1.0  },
  HIGH_RISK:            { color: "#f43f5e", bg: "#270810", label: "HIGH RISK",  weight: 1.0  },
};

const THREAT_LEVELS = [
  { min: 80, label: "CRITICAL",  color: "#ff2020", glow: "0 0 32px #ff202066, 0 0 80px #ff202022" },
  { min: 65, label: "HIGH",      color: "#ff5533", glow: "0 0 24px #ff553344" },
  { min: 35, label: "ELEVATED",  color: "#e8c84a", glow: "0 0 24px #e8c84a33" },
  { min: 0,  label: "LOW",       color: "#3ddc84", glow: "0 0 20px #3ddc8422" },
];

function getMeta(label = '') {
  const norm = (label || '').toUpperCase().replace(/\s+/g, '_');
  return CLASSIFICATION_META[norm] ?? CLASSIFICATION_META.UNVERIFIED;
}

function getThreat(score) {
  return THREAT_LEVELS.find((t) => score >= t.min) ?? THREAT_LEVELS[THREAT_LEVELS.length - 1];
}

function calcScore(claims = []) {
  if (!claims.length) return 0;
  const sum = claims.reduce((acc, c) => {
    const meta = getMeta(c.classification_label);
    return acc + meta.weight;
  }, 0);
  return Math.round((sum / claims.length) * 100);
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800;900&family=IBM+Plex+Mono:wght@300;400;500&display=swap');`;

const BASE_CSS = `
${FONTS}
*, *::before, *::after { box-sizing: border-box; }
:root {
  --bg: #080b0f; --bg2: #0d1117; --bg3: #121820;
  --border: #1e2a38; --border-mid: #253040;
  --ice: #4ab8e8; --ice-dim: #2a6e8c; --ice-muted: #162230;
  --text: #c8d8e8; --text-dim: #5a7a96; --text-ghost: #2a3d50;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
`;

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function ThreatGauge({ score }) {
  const animated = useCountUp(score);
  const threat = getThreat(animated);
  const prev = useRef(0);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (Math.abs(animated - prev.current) > 5) { setFlash(true); setTimeout(() => setFlash(false), 120); }
    prev.current = animated;
  }, [animated]);

  const R = 88, CX = 110, CY = 110, sweepDeg = 240, startDeg = 150;
  const pct = animated / 100;

  function polar(cx, cy, r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  function arc(r, from, to) {
    const [x1, y1] = polar(CX, CY, r, from);
    const [x2, y2] = polar(CX, CY, r, to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const endDeg = startDeg + sweepDeg * pct;
  const ticks = Array.from({ length: 41 }, (_, i) => {
    const deg = startDeg + (sweepDeg / 40) * i;
    const isMajor = i % 8 === 0;
    const inner = isMajor ? R - 14 : R - 8;
    const [x1, y1] = polar(CX, CY, R, deg);
    const [x2, y2] = polar(CX, CY, inner, deg);
    const active = i / 40 <= pct;
    return { x1, y1, x2, y2, isMajor, active };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="220" height="160" viewBox="0 0 220 160"
        style={{ filter: flash ? "brightness(1.6)" : "none", transition: "filter 0.08s" }}>
        <path d={arc(R, startDeg, startDeg + sweepDeg)} fill="none" stroke="#0d1a28" strokeWidth="12" strokeLinecap="round" />
        <path d={arc(R, startDeg + sweepDeg * 0.7, startDeg + sweepDeg)} fill="none" stroke="#1a0505" strokeWidth="12" strokeLinecap="round" />
        {animated > 0 && (
          <path d={arc(R, startDeg, endDeg)} fill="none" stroke={threat.color} strokeWidth="12" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${threat.color}88)`, transition: "stroke 0.4s ease" }} />
        )}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.active ? threat.color : "#1e2a38"}
            strokeWidth={t.isMajor ? 2 : 1}
            opacity={t.active ? (t.isMajor ? 1 : 0.7) : 0.4} />
        ))}
        <circle cx={CX} cy={CY} r="4" fill={threat.color} opacity="0.6" />
        <text x={CX} y={CY - 8} textAnchor="middle" dominantBaseline="middle"
          fontFamily="'Barlow Condensed', sans-serif" fontWeight="900" fontSize="52"
          fill={threat.color} style={{ letterSpacing: "-2px" }}>{animated}</text>
        <text x={CX} y={CY + 32} textAnchor="middle"
          fontFamily="'IBM Plex Mono', monospace" fontWeight="400" fontSize="10"
          fill={threat.color} letterSpacing="4">{threat.label}</text>
        {[0, 50, 100].map((v) => {
          const deg = startDeg + sweepDeg * (v / 100);
          const [x, y] = polar(CX, CY, R + 16, deg);
          return <text key={v} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="#2a3d50">{v}</text>;
        })}
      </svg>
      <div style={{ display: "flex", gap: "3px", marginTop: "8px", width: "200px" }}>
        {THREAT_LEVELS.slice().reverse().map((t) => (
          <div key={t.label} style={{ flex: 1, height: "3px", borderRadius: "2px",
            background: score >= t.min ? t.color : "#1e2a38",
            boxShadow: score >= t.min ? `0 0 6px ${t.color}66` : "none",
            transition: "background 0.4s, box-shadow 0.4s" }} />
        ))}
      </div>
    </div>
  );
}

function ClassificationBreakdown({ claims }) {
  const counts = {};
  claims.forEach((c) => { const k = c.classification_label || "UNVERIFIED"; counts[k] = (counts[k] || 0) + 1; });
  const total = claims.length || 1;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", gap: "1px", marginBottom: "10px" }}>
        {Object.entries(CLASSIFICATION_META).map(([key, meta]) => {
          const pct = ((counts[key] || 0) / total) * 100;
          if (!pct) return null;
          return <div key={key} style={{ width: `${pct}%`, background: meta.color, boxShadow: `0 0 4px ${meta.color}55`, transition: "width 0.8s ease" }} />;
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {Object.entries(CLASSIFICATION_META).map(([key, meta]) =>
          counts[key] ? (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: meta.color }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: meta.color, letterSpacing: "1px" }}>{meta.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)" }}>{counts[key]}</span>
              {key === 'UNVERIFIED' && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: '#ff4d4f',
                  background: 'rgba(255, 77, 79, 0.1)',
                  border: '1px solid rgba(255, 77, 79, 0.3)',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  marginLeft: '4px',
                  letterSpacing: '0.5px'
                }}>
                  NOT AN ACTUAL FACT
                </span>
              )}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function LeftSpine({ report, score, threat, selectedId, onSelectId, claims }) {
  const [, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(i); }, []);

  const hasUnverified = claims.some(c => (c.classification_label || '').toUpperCase() === 'UNVERIFIED');

  return (
    <div style={{ width: "300px", minWidth: "300px", height: "100vh", overflowY: "auto",
      background: "var(--bg2)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", fontFamily: "var(--font-mono)" }}>
      
      {hasUnverified && (
        <div style={{
          padding: "10px 20px",
          background: "rgba(255, 77, 79, 0.08)",
          borderBottom: "1px solid rgba(255, 77, 79, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0
        }}>
          <AlertTriangle size={12} style={{ color: "#ff4d4f" }} />
          <span style={{ fontSize: "9px", fontWeight: "bold", color: "#ff4d4f", letterSpacing: "1px" }}>
            NOT AN ACTUAL FACT
          </span>
        </div>
      )}

      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3ddc84",
            boxShadow: "0 0 8px #3ddc84", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "9px", letterSpacing: "3px", color: "var(--text-dim)", textTransform: "uppercase" }}>ANALYSIS ACTIVE</span>
        </div>
        <div style={{ fontSize: "9px", color: "var(--text-ghost)", letterSpacing: "1px" }}>
          REPORT #{String(report.id).padStart(6, "0")} · {report.analysis_type}
        </div>
      </div>

      <div style={{ padding: "28px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "var(--text-dim)", marginBottom: "16px", textTransform: "uppercase" }}>THREAT INDEX</div>
        <ThreatGauge score={score} />
        <div style={{ marginTop: "20px", width: "100%" }}><ClassificationBreakdown claims={claims} /></div>
      </div>

      {report.risk_explanation && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: threat.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              AI RISK ASSESSMENT
            </span>
          </div>
          <p style={{ fontSize: "12px", lineHeight: "1.8", color: "var(--text-dim)", borderLeft: `2px solid ${threat.color}`, paddingLeft: "10px" }}>
            {report.risk_explanation}
          </p>
        </div>
      )}

      <div style={{ padding: "16px 20px 0", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color: "var(--text-dim)", marginBottom: "10px" }}>
          CLAIM INDEX [{claims.length}]
        </div>
        {claims.map((c, i) => {
          const meta = getMeta(c.classification_label);
          const active = selectedId === i;
          return (
            <button key={i} onClick={() => onSelectId(active ? null : i)}
              style={{ display: "flex", alignItems: "flex-start", gap: "10px",
                width: "100%", padding: "9px 10px", marginBottom: "2px",
                background: active ? "var(--ice-muted)" : "transparent",
                border: active ? "1px solid var(--ice-dim)" : "1px solid transparent",
                borderRadius: "4px", cursor: "pointer", textAlign: "left",
                transition: "background 0.15s, border 0.15s" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-ghost)", marginTop: "1px", minWidth: "20px" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "10px", color: meta.color, letterSpacing: "1px", marginBottom: "3px" }}>{meta.label}</div>
                <div style={{ fontSize: "11px", color: active ? "var(--text)" : "var(--text-dim)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "1.4" }}>
                  {c.claim_text}
                </div>
              </div>
              <div style={{ width: "3px", minWidth: "3px", height: "40px", borderRadius: "2px",
                background: active ? meta.color : "#1e2a38",
                boxShadow: active ? `0 0 6px ${meta.color}` : "none", marginTop: "1px" }} />
            </button>
          );
        })}
      </div>

      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)",
        fontSize: "9px", color: "var(--text-ghost)", letterSpacing: "1px",
        display: "flex", justifyContent: "space-between" }}>
        <span>STATUS: {report.status}</span>
        <span>{new Date().toLocaleTimeString("en", { hour12: false })}</span>
      </div>
    </div>
  );
}

function IntelligenceSummary({ summary, hasUnverified }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600,
          letterSpacing: "4px", color: "var(--text-dim)", textTransform: "uppercase" }}>Intelligence Summary</div>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        {hasUnverified && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            fontWeight: 'bold',
            color: '#ff4d4f',
            background: 'rgba(255, 77, 79, 0.1)',
            border: '1px solid rgba(255, 77, 79, 0.3)',
            borderRadius: '3px',
            padding: '2px 8px',
            letterSpacing: '1px'
          }}>
            NOT AN ACTUAL FACT
          </span>
        )}
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "2", color: "var(--text)", letterSpacing: "0.2px", margin: 0 }}>
        {summary}
      </p>
    </div>
  );
}

function ClaimDrawer({ claim, index, onClose }) {
  const meta = getMeta(claim.classification_label);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(4,8,12,0.85)",
      display: "flex", justifyContent: "flex-end", animation: "fadeIn 0.15s ease" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(580px, 95vw)", height: "100vh", overflowY: "auto",
        background: "var(--bg2)", borderLeft: `1px solid ${meta.color}44`,
        padding: "32px", animation: "slideIn 0.2s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "3px",
              color: "var(--text-dim)", marginBottom: "6px" }}>
              CLAIM {String(index + 1).padStart(2, "0")} / {claim.detection_source}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "5px 12px", borderRadius: "3px", background: meta.bg, border: `1px solid ${meta.color}44` }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: meta.color, letterSpacing: "2px" }}>{meta.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)",
            cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "4px" }}>×</button>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "3px", color: "var(--text-dim)", marginBottom: "10px" }}>CLAIM TEXT</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, lineHeight: "1.5", color: "var(--text)" }}>
            "{claim.claim_text}"
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "3px", color: "var(--text-dim)" }}>CONFIDENCE</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: meta.color }}>{Math.round((claim.confidence_score ?? 0) * 100)}%</span>
          </div>
          <div style={{ height: "2px", background: "var(--border)", borderRadius: "1px" }}>
            <div style={{ width: `${(claim.confidence_score ?? 0) * 100}%`, height: "100%", background: meta.color,
              borderRadius: "1px", boxShadow: `0 0 8px ${meta.color}66`, transition: "width 0.6s ease" }} />
          </div>
        </div>

        {claim.transcript_reference && (
          <div style={{ marginBottom: "24px", padding: "14px 16px",
            background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "4px", borderLeft: "2px solid var(--ice-dim)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "3px", color: "var(--text-dim)", marginBottom: "8px" }}>TRANSCRIPT REF</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ice)", lineHeight: "1.8", fontStyle: "italic" }}>
              "{claim.transcript_reference}"
            </p>
          </div>
        )}

        {claim.contextual_reasoning && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "3px", color: "var(--text-dim)", marginBottom: "10px" }}>ANALYSIS</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: "2", color: "var(--text-dim)" }}>{claim.contextual_reasoning}</p>
          </div>
        )}

        {claim.related_sources?.length > 0 && (
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "3px", color: "var(--text-dim)", marginBottom: "10px" }}>
              RELATED SOURCES [{claim.related_sources.length}]
            </div>
            {claim.related_sources.map((src, i) => (
              <a key={i} href={src.url} target="_blank" rel="noreferrer"
                style={{ display: "block", marginBottom: "8px", padding: "12px 14px",
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: "4px", textDecoration: "none", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--ice-dim)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ice)", marginBottom: "4px" }}>{src.title}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-ghost)", lineHeight: "1.6" }}>{src.snippet}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ForensicTimeline({ claims, selectedId, onSelectId }) {
  const total = claims.length;
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "28px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600,
          letterSpacing: "4px", color: "var(--text-dim)", textTransform: "uppercase" }}>Claim Timeline</div>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-ghost)", letterSpacing: "1px" }}>{total} EVENTS</span>
      </div>

      <div style={{ position: "relative", marginBottom: "32px", height: "80px" }}>
        <div style={{ height: "1px", background: "var(--border)", position: "absolute", top: "50px", left: 0, right: 0 }} />
        {claims.map((c, i) => {
          const meta = getMeta(c.classification_label);
          const active = selectedId === i;
          const pct = total > 1 ? (i / (total - 1)) * 100 : 50;
          const spikeH = 12 + ((meta.weight) * 36);
          return (
            <button key={i} onClick={() => onSelectId(active ? null : i)} title={c.claim_text}
              style={{ position: "absolute", left: `${pct}%`, transform: "translateX(-50%)",
                bottom: "28px", display: "flex", flexDirection: "column", alignItems: "center",
                background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <div style={{ width: "2px", height: `${spikeH}px`,
                background: active ? meta.color : `${meta.color}55`,
                boxShadow: active ? `0 0 8px ${meta.color}` : "none",
                borderRadius: "1px", marginBottom: "4px", transition: "background 0.2s, box-shadow 0.2s" }} />
              <div style={{ width: active ? "10px" : "7px", height: active ? "10px" : "7px",
                borderRadius: "50%", background: active ? meta.color : "#1e2a38",
                border: `1.5px solid ${meta.color}`,
                boxShadow: active ? `0 0 10px ${meta.color}` : "none", transition: "all 0.2s" }} />
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
        {claims.map((c, i) => {
          const meta = getMeta(c.classification_label);
          const active = selectedId === i;
          return (
            <button key={i} onClick={() => onSelectId(active ? null : i)}
              style={{ padding: "14px 16px", borderRadius: "4px", cursor: "pointer",
                background: active ? meta.bg : "var(--bg3)",
                border: active ? `1px solid ${meta.color}66` : "1px solid var(--border)",
                textAlign: "left", transition: "all 0.15s" }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border-mid)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "2px", color: meta.color }}>{meta.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-ghost)" }}>#{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px",
                color: active ? "var(--text)" : "var(--text-dim)", lineHeight: "1.6",
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {c.claim_text}
              </p>
              <div style={{ display: "flex", gap: "2px", marginTop: "10px" }}>
                {Array.from({ length: 10 }, (_, j) => (
                  <div key={j} style={{ flex: 1, height: "2px", borderRadius: "1px",
                    background: j < Math.round((c.confidence_score ?? 0.4) * 10) ? meta.color : "#1e2a38" }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ForensicMediaPreview ──────────────────────────────────────────────────────
function ForensicMediaPreview({ jobData, isTablet }) {
    const assets = jobData?.media_assets ?? [];
    const instagramUrl = jobData?.instagram_url;
    const isUpload = jobData?.ingestion_source === 'upload';
    const originalFile = jobData?.original_filename;

    const videoAsset = assets.find(a => a.asset_type === 'VIDEO' || a.asset_type === 'VIDEO_SOURCE');
    const imageAsset = assets.find(a => a.asset_type === 'IMAGE' || a.asset_type === 'IMAGE_SOURCE' || a.asset_type === 'THUMBNAIL');
    const audioAsset = assets.find(a => a.asset_type === 'AUDIO' || a.asset_type === 'AUDIO_SOURCE');
    const frameAsset = assets.find(a => a.asset_type === 'FRAME_DIRECTORY');

    const mediaUrl = videoAsset?.file_url ?? imageAsset?.file_url ?? audioAsset?.file_url ?? frameAsset?.metadata?.frames?.[0]?.thumbnail_url ?? null;
    const isVideo  = !!videoAsset;
    const isAudio  = !!audioAsset && !videoAsset && !imageAsset;

    const platform = isUpload
        ? 'Local Upload'
        : instagramUrl?.includes('instagram') ? 'Instagram'
        : instagramUrl?.includes('tiktok')    ? 'TikTok'
        : instagramUrl?.includes('youtube')   ? 'YouTube'
        : 'Media';

    const sourceLabel = isUpload
        ? (originalFile ? `Local Upload — ${originalFile}` : 'Local Upload')
        : (instagramUrl?.replace(/^https?:\/\//, '').slice(0, 38) ?? '');

    const duration  = jobData?.media_duration ?? jobData?.duration ?? null;
    const handle    = jobData?.source_handle  ?? jobData?.handle   ?? null;
    const createdAt = jobData?.created_at     ?? null;

    const formatDur = (s) => {
        if (!s) return null;
        const m = Math.floor(s / 60), sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    return (
        <div style={{ 
            background: "var(--bg2)", 
            border: "1px solid var(--border)", 
            borderRadius: "4px", 
            padding: "24px 28px", 
            display: "flex", 
            flexDirection: "column", 
            gap: "12px", 
            width: isTablet ? "100%" : "360px", 
            minWidth: isTablet ? "100%" : "360px" 
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600,
                  letterSpacing: "4px", color: "var(--text-dim)", textTransform: "uppercase" }}>Forensic Source</div>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            <div
                style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    background: '#04070a',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {mediaUrl ? (
                    isVideo ? (
                        <video
                            src={mediaUrl}
                            controls
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : isAudio ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Mic size={24} style={{ color: 'var(--ice)' }} />
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: "var(--font-mono)" }}>Audio Track Only</span>
                            <audio src={mediaUrl} controls style={{ width: '180px', height: '28px' }} />
                        </div>
                    ) : (
                        <img
                            src={mediaUrl}
                            alt="Media Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )
                ) : (
                    <Film size={24} strokeWidth={1} style={{ color: 'var(--text-ghost)', opacity: 0.5 }} />
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {handle && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text)' }}>
                        {handle}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--ice)', background: 'var(--ice-muted)', border: '1px solid var(--ice-dim)', borderRadius: '3px', padding: '2px 6px' }}>
                        {platform}
                    </span>
                    {duration && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '2px 6px' }}>
                            {formatDur(duration)}
                        </span>
                    )}
                    {createdAt && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '2px 6px' }}>
                            {new Date(createdAt).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>

            {isUpload ? (
                <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '9px',
                    color: 'var(--text-ghost)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 'auto'
                }}>
                    {sourceLabel}
                </div>
            ) : instagramUrl && (
                <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'var(--font-mono)', fontSize: '9px',
                        color: 'var(--text-ghost)', textDecoration: 'none',
                        marginTop: 'auto',
                    }}
                >
                    <ExternalLink size={8} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sourceLabel}…
                    </span>
                </a>
            )}
        </div>
    );
}

// ── ForensicTranscriptPanel ──────────────────────────────────────────────────
function ForensicTranscriptPanel({ transcript, selectedClaim, style = {} }) {
    const containerRef = useRef(null);

    const claimText = selectedClaim
        ? (selectedClaim.claim_text ?? selectedClaim.text ?? selectedClaim.claim ?? '')
        : '';

    const highlightPassage = (text) => {
        if (!claimText || !text) return text;
        const idx = text.toLowerCase().indexOf(claimText.slice(0, 30).toLowerCase());
        if (idx === -1) return text;
        return (
            <>
                {text.slice(0, idx)}
                <mark
                    style={{
                        background: 'rgba(74, 184, 232, 0.2)',
                        color: 'var(--ice)',
                        borderRadius: '2px',
                        padding: '1px 0',
                    }}
                >
                    {text.slice(idx, idx + claimText.length)}
                </mark>
                {text.slice(idx + claimText.length)}
            </>
        );
    };

    const lines = Array.isArray(transcript)
        ? transcript
        : typeof transcript === 'string'
            ? transcript.split('\n').filter(Boolean).map((t, i) => ({ text: t, timestamp: null, id: i }))
            : [];

    useEffect(() => {
        if (!selectedClaim) {
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
            }
        }
    }, [selectedClaim]);

    return (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column", minHeight: "340px", maxHeight: "380px", ...style }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={12} style={{ color: 'var(--text-dim)' }} />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600,
                      letterSpacing: "4px", color: "var(--text-dim)", textTransform: "uppercase" }}>Forensic Transcript</span>
                </div>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    paddingRight: '6px',
                }}
            >
                {lines.length === 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-ghost)' }}>
                        No transcript available.
                    </span>
                )}
                {lines.map((line, i) => {
                    const text = line.text ?? line;
                    return (
                        <div key={line.id ?? i} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                            {line.timestamp != null && (
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '9px',
                                        color: 'var(--ice)',
                                        opacity: 0.7,
                                        flexShrink: 0,
                                        minWidth: '32px',
                                    }}
                                >
                                    {typeof line.timestamp === 'number'
                                        ? `${Math.floor(line.timestamp / 60)}:${String(line.timestamp % 60).padStart(2, '0')}`
                                        : line.timestamp}
                                </span>
                            )}
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '12px',
                                    lineHeight: 1.7,
                                    color: 'var(--text-dim)',
                                }}
                            >
                                {highlightPassage(text)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── ForensicProvenancePanel ──────────────────────────────────────────────────
function ForensicProvenancePanel({ ocrData, style = {} }) {
    const structuredFrames = ocrData?.frames_ocr ?? [];
    const rawText = typeof ocrData === 'string' ? ocrData : (ocrData?.unified_transcript ?? '');

    const blocks = structuredFrames.flatMap(frame => 
        (frame.blocks || []).map(block => ({
            ...block,
            timestamp: frame.timestamp_seconds
        }))
    );

    const displayItems = blocks.length > 0 ? blocks : rawText.split('\n').filter(Boolean);

    return (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column", minHeight: "340px", maxHeight: "380px", ...style }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Eye size={12} style={{ color: 'var(--text-dim)' }} />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600,
                      letterSpacing: "4px", color: "var(--text-dim)", textTransform: "uppercase" }}>OCR · PROVENANCE</span>
                </div>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    paddingRight: '6px',
                }}
            >
                {displayItems.length === 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-ghost)' }}>
                        No on-screen text detected.
                    </span>
                )}
                {displayItems.map((item, i) => {
                    const text = typeof item === 'string' ? item : item.text;
                    const conf = typeof item === 'string' ? null : item.confidence;
                    const ts   = typeof item === 'string' ? null : item.timestamp;

                    return (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                padding: '8px 10px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {ts != null && (
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--ice)', opacity: 0.8 }}>
                                            [{Math.floor(ts / 60)}:{String(Math.floor(ts % 60)).padStart(2, '0')}]
                                        </span>
                                    )}
                                    {conf != null && (
                                        <span style={{ 
                                            fontFamily: 'var(--font-mono)', 
                                            fontSize: '9px', 
                                            color: conf > 0.8 ? '#3ddc84' : '#e8c84a',
                                            opacity: 0.8 
                                        }}>
                                            {Math.round(conf * 100)}% confidence
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11px',
                                    color: 'var(--text-dim)',
                                    lineHeight: 1.4,
                                }}
                            >
                                {text}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function ReportDashboard({ onReset }) {
    const { id: jobId } = useParams();
    const isMobile = useMediaQuery('(max-width: 639px)');
    const isTablet = useMediaQuery('(max-width: 1023px)');
    const [jobData, setJobData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        if (!jobId) return;
        setLoading(true);
        getJob(jobId)
            .then(setJobData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [jobId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh', background: '#080b0f' }}>
                <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#5a7a96' }}
                >
                    Assembling forensic report…
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh', background: '#080b0f' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#ff3b3b' }}>
                    Error loading report: {error}
                </span>
            </div>
        );
    }

    const reportData  = jobData?.report?.report_data ?? {};
    const mergedData  = { ...reportData, ...jobData };

    const claims = mergedData?.claims ?? reportData?.claims ?? [];
    const transcript = mergedData?.transcript_text ?? reportData?.transcript_text ?? jobData?.transcript_text ?? [];
    const ocrText = reportData?.ocr_text ?? mergedData?.ocr_text ?? mergedData?.ocr ?? [];
    const ocrResults = reportData?.ocr_results ?? mergedData?.ocr_results ?? null;

    const score = calcScore(claims);
    const threat = getThreat(score);

    const selectedClaim = selectedId !== null ? (claims[selectedId] ?? null) : null;
    const hasUnverified = claims.some(c => (c.classification_label || '').toUpperCase() === 'UNVERIFIED');

    return (
        <>
            <style>{BASE_CSS}</style>
            <style>{`
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes fadeIn { from{opacity:0} to{opacity:1} }
                @keyframes slideIn { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
            `}</style>

            <div className="no-print" style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
                {/* Left Spine */}
                <LeftSpine 
                    report={mergedData} 
                    score={score} 
                    threat={threat} 
                    claims={claims} 
                    selectedId={selectedId} 
                    onSelectId={setSelectedId} 
                />

                {/* Right scrollable analysis container */}
                <div style={{ flex: 1, overflowY: "auto", padding: "32px 32px 64px" }}>
                    
                    {/* Header */}
                    <div style={{ marginBottom: "28px", paddingBottom: "20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "4px", color: "var(--text-dim)", marginBottom: "8px" }}>
                                MEDIA ANALYSIS REPORT · {mergedData.analysis_type}
                            </div>
                            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "38px", fontWeight: 800,
                              letterSpacing: "-0.5px", color: "var(--text)", lineHeight: 1, textTransform: "uppercase" }}>
                              Fact-Check Intelligence
                            </h1>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "10px" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: threat.color,
                                letterSpacing: "2px", padding: "3px 10px",
                                border: `1px solid ${threat.color}44`, borderRadius: "3px", background: `${threat.color}11` }}>
                                {threat.label} THREAT
                              </span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-ghost)" }}>
                                {claims.length} CLAIMS ANALYSED
                              </span>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <ExportMenu jobId={mergedData?.id} jobData={mergedData} />
                        </div>
                    </div>

                    {/* Media source + Summary */}
                    <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexDirection: isTablet ? "column" : "row", alignItems: "stretch" }}>
                        <ForensicMediaPreview jobData={mergedData} isTablet={isTablet} />
                        <IntelligenceSummary summary={mergedData.summary || "No summary available."} hasUnverified={hasUnverified} />
                    </div>

                    {/* Timeline */}
                    <div style={{ marginBottom: "20px" }}>
                        <ForensicTimeline claims={claims} selectedId={selectedId} onSelectId={setSelectedId} />
                    </div>

                    {/* Transcript & OCR */}
                    <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexDirection: isTablet ? "column" : "row", alignItems: "stretch" }}>
                        <ForensicTranscriptPanel 
                            transcript={transcript} 
                            selectedClaim={selectedClaim} 
                        />
                        <ForensicProvenancePanel 
                            ocrData={ocrResults || ocrText} 
                        />
                    </div>

                    {/* Processing Timeline Gantt strip */}
                    <div style={{ marginTop: "24px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "16px 20px" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 600, letterSpacing: "4px", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "12px" }}>
                            Pipeline Processing Timeline
                        </div>
                        <ProcessingTimeline jobData={mergedData} />
                    </div>
                </div>
            </div>

            {/* Claim Drawer */}
            {selectedId !== null && claims[selectedId] && (
                <ClaimDrawer claim={claims[selectedId]} index={selectedId} onClose={() => setSelectedId(null)} />
            )}

            {/* Specialized Print Layout (Hidden in UI, Visible in @media print) */}
            <PrintReport 
                jobData={mergedData} 
                claims={claims} 
                transcript={transcript} 
                ocrData={ocrResults || ocrText} 
                score={score}
            />
        </>
    );
}