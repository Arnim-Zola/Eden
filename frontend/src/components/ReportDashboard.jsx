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
import DetailDrawer from './DetailDrawer';
import ExportMenu from './ExportMenu';
import CredibilityTimeline from './CredibilityTimeline';
import ProcessingTimeline from './ProcessingTimeline';
import PrintReport from './PrintReport';

// ── Verdict config ────────────────────────────────────────────────────────────
const VERDICT = {
    false: { label: 'False', color: '#E8453C', bg: 'rgba(232,69,60,0.10)', border: 'rgba(232,69,60,0.25)', icon: ShieldAlert },
    true: { label: 'True', color: '#2A9D5C', bg: 'rgba(42,157,92,0.10)', border: 'rgba(42,157,92,0.25)', icon: ShieldCheck },
    unverifiable: { label: 'Unverifiable', color: '#D4841A', bg: 'rgba(212,132,26,0.10)', border: 'rgba(212,132,26,0.25)', icon: HelpCircle },
    plausible: { label: 'Plausible', color: '#4A7CF7', bg: 'rgba(74,124,247,0.10)', border: 'rgba(74,124,247,0.25)', icon: HelpCircle },
    misleading: { label: 'Misleading', color: '#D4841A', bg: 'rgba(212,132,26,0.10)', border: 'rgba(212,132,26,0.25)', icon: AlertTriangle },
};

function getVerdict(claim) {
    const raw = (
        claim.verdict ?? claim.classification ?? claim.label ?? 'unverifiable'
    ).toLowerCase().replace(/\s+/g, '');
    return VERDICT[raw] ?? VERDICT.unverifiable;
}

// ── Risk score calculation ────────────────────────────────────────────────────
function calcRiskScore(claims = []) {
    if (!claims.length) return { score: 0, level: 'unknown' };
    const weights = { false: 1, misleading: 0.85, unverifiable: 0.4, plausible: 0.15, true: 0 };
    const total = claims.reduce((acc, c) => {
        const key = (c.verdict ?? c.classification ?? '').toLowerCase().replace(/\s+/g, '');
        return acc + (weights[key] ?? 0.4);
    }, 0);
    const score = Math.round((total / claims.length) * 100);
    const level = score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low';
    return { score, level };
}

const RISK_COLOR = {
    high: '#E8453C',
    medium: '#D4841A',
    low: '#2A9D5C',
    unknown: 'var(--color-text-muted)',
};

// ── Stagger container ─────────────────────────────────────────────────────────
const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
};
const staggerItem = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

// ── Bento cell wrapper ────────────────────────────────────────────────────────
function Cell({ children, style = {}, variants, colSpan, isMobile, isTablet }) {
    const spanStyle = isMobile
        ? {}
        : colSpan
        ? isTablet && colSpan > 2
            ? { gridColumn: '1 / -1' }
            : { gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined }
        : {};
    return (
        <motion.div
            variants={variants ?? staggerItem}
            className="glass-card"
            style={{
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                ...spanStyle,
                ...style,
            }}
        >
            {children}
        </motion.div>
    );
}

function CellHeader({ label, icon: Icon }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                flexShrink: 0,
            }}
        >
            {Icon && <Icon size={12} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />}
            <span
                style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                }}
            >
                {label}
            </span>
        </div>
    );
}

// ── MediaPreview cell ─────────────────────────────────────────────────────────
function MediaPreview({ jobData }) {
    // jobData may be raw report_data (snake_case) or the outer job object
    const instagramUrl = jobData?.instagram_url ?? jobData?.url ?? jobData?.input_url ?? null;
    const isUpload     = jobData?.ingestion_source === 'UPLOAD' || !instagramUrl;
    const originalFile = jobData?.original_filename ?? null;

    // Search for actual media assets
    const assets = jobData?.media_assets ?? [];
    const videoAsset = assets.find(a => a.asset_type === 'VIDEO');
    const imageAsset = assets.find(a => a.asset_type === 'IMAGE');
    const audioAsset = assets.find(a => a.asset_type === 'AUDIO');
    const frameAsset = assets.find(a => a.asset_type === 'FRAME_DIRECTORY');

    // Display logic: prefer Video > Image > Audio > Frame
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
        <Cell>
            <CellHeader label="Media" icon={Film} />
            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Media Preview Area */}
                <div
                    style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
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
                                <Mic size={32} style={{ color: 'var(--color-text-primary)' }} />
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Audio Track Only</span>
                                <audio src={mediaUrl} controls style={{ width: '200px', height: '32px' }} />
                            </div>
                        ) : (
                            <img
                                src={mediaUrl}
                                alt="Media Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        )
                    ) : (
                        <Film size={24} strokeWidth={1} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
                    )}
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {handle && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                            {handle}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Tag>{platform}</Tag>
                        {duration && <Tag>{formatDur(duration)}</Tag>}
                        {createdAt && <Tag>{new Date(createdAt).toLocaleDateString()}</Tag>}
                    </div>
                </div>

                {/* Source link or upload label */}
                {isUpload ? (
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                        color: 'var(--color-text-muted)', marginTop: 'auto',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {sourceLabel}
                    </div>
                ) : instagramUrl && (
                    <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontFamily: 'var(--font-mono)', fontSize: '10px',
                            color: 'var(--color-text-muted)', textDecoration: 'none',
                            marginTop: 'auto',
                        }}
                    >
                        <ExternalLink size={10} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sourceLabel}…
                        </span>
                    </a>
                )}
            </div>
        </Cell >
    );
}


function Tag({ children }) {
    return (
        <span
            style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                padding: '2px 7px',
            }}
        >
            {children}
        </span>
    );
}

function RiskExplanationBox({ explanation, level }) {
    if (!explanation) return null;

    const colors = {
        high: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.06)', border: 'rgba(239, 68, 68, 0.2)' },
        medium: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.06)', border: 'rgba(249, 115, 22, 0.2)' },
        low: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.06)', border: 'rgba(34, 197, 94, 0.2)' },
        unknown: { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.06)', border: 'rgba(156, 163, 175, 0.2)' }
    };
    
    const cfg = colors[level] || colors.unknown;

    return (
        <div
            style={{
                marginTop: '14px',
                padding: '12px 14px',
                background: cfg.bg,
                borderRadius: '8px',
                borderLeft: `3px solid ${cfg.color}`,
                borderTop: `1px solid ${cfg.border}`,
                borderRight: `1px solid ${cfg.border}`,
                borderBottom: `1px solid ${cfg.border}`,
                width: '100%',
                boxSizing: 'border-box',
                textAlign: 'left',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                    AI Risk Analysis
                </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
                {explanation}
            </p>
        </div>
    );
}

// ── RiskScore cell ────────────────────────────────────────────────────────────
function RiskScore({ claims, riskExplanation }) {
    const { score, level } = calcRiskScore(claims);
    const color = RISK_COLOR[level];

    // Arc drawing
    const R = 44, cx = 64, cy = 64, strokeW = 5;
    const circ = Math.PI * R; // half-circle arc length
    const filled = (score / 100) * circ;

    return (
        <Cell>
            <CellHeader label="Risk Score" icon={ShieldAlert} />
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    gap: '8px',
                }}
            >
                {/* Semi-circular gauge */}
                <svg width="128" height="72" viewBox="0 0 128 80" style={{ overflow: 'visible' }}>
                    {/* Track */}
                    <path
                        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth={strokeW}
                        strokeLinecap="round"
                    />
                    {/* Fill */}
                    <motion.path
                        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeW}
                        strokeLinecap="round"
                        strokeDasharray={`${circ}`}
                        initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset: circ - filled }}
                        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                        style={{ filter: `drop-shadow(0px 0px 5px ${color}cc)` }}
                    />
                    {/* Score number */}
                    <text
                        x={cx} y={cy - 4}
                        textAnchor="middle"
                        fill={color}
                        fontFamily="var(--font-mono)"
                        fontSize="22"
                        fontWeight="600"
                        style={{ filter: `drop-shadow(0px 0px 8px ${color}44)` }}
                    >
                        {score}
                    </text>
                </svg>

                {/* Level label */}
                <div
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color,
                    }}
                >
                    {level} risk
                </div>

                {/* Claim count */}
                <div
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                    }}
                >
                    {claims.length} claim{claims.length !== 1 ? 's' : ''} detected
                </div>

                {/* AI generated explanation */}
                <RiskExplanationBox explanation={riskExplanation} level={level} />
            </div>
        </Cell>
    );
}

// ── IntelligenceSummary cell ──────────────────────────────────────────────────
function IntelligenceSummary({ jobData, claims, isMobile, isTablet }) {
    const summary = jobData?.summary ?? jobData?.executive_summary ?? null;
    const falseCount = claims.filter(c =>
        ['false', 'misleading'].includes((c.verdict ?? c.classification ?? '').toLowerCase())
    ).length;
    const unverCount = claims.filter(c =>
        (c.verdict ?? c.classification ?? '').toLowerCase().includes('unverif')
    ).length;

    const autoSummary = claims.length
        ? `Analysis detected ${claims.length} verifiable claim${claims.length !== 1 ? 's' : ''} in this media.` +
        (falseCount ? ` ${falseCount} ${falseCount === 1 ? 'is' : 'are'} demonstrably false.` : '') +
        (unverCount ? ` ${unverCount} could not be verified without citation.` : '') +
        (!falseCount && !unverCount ? ' No high-risk signals detected.' : ' Exercise caution before sharing.')
        : 'No claims were extracted from this media.';

    return (
        <Cell colSpan={2} isMobile={isMobile} isTablet={isTablet}>
            <CellHeader label="Intelligence Summary" icon={Eye} />
            <div style={{ padding: '20px', flex: 1 }}>
                <p
                    style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '14px',
                        lineHeight: 1.7,
                        color: 'var(--color-text-primary)',
                        margin: 0,
                    }}
                >
                    {summary ?? autoSummary}
                </p>

                {/* Stat pills */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {Object.entries(
                        claims.reduce((acc, c) => {
                            const v = (c.verdict ?? c.classification ?? 'unverifiable').toLowerCase();
                            acc[v] = (acc[v] ?? 0) + 1;
                            return acc;
                        }, {})
                    ).map(([v, count]) => {
                        const cfg = VERDICT[v.replace(/\s+/g, '')] ?? VERDICT.unverifiable;
                        return (
                            <div key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '11px',
                                        color: cfg.color,
                                        background: cfg.bg,
                                        border: `1px solid ${cfg.border}`,
                                        borderRadius: '5px',
                                        padding: '3px 10px',
                                    }}
                                >
                                    {count} {cfg.label}
                                </span>
                                {v.includes('unverif') && (
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        color: '#ff4d4f',
                                        background: 'rgba(255, 77, 79, 0.1)',
                                        border: '1px solid rgba(255, 77, 79, 0.3)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        letterSpacing: '0.5px'
                                    }}>
                                        NOT AN ABSOLUTE FACT
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Cell>
    );
}

// ── ClaimsStrip ───────────────────────────────────────────────────────────────
function ClaimsStrip({ claims, selectedId, onSelect, isMobile, isTablet }) {
    return (
        <Cell colSpan={4} isMobile={isMobile} isTablet={isTablet}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    flexShrink: 0,
                }}
            >
                <BarChart2 size={12} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />
                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-muted)',
                    }}
                >
                    Claims
                </span>
                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        opacity: 0.45,
                        marginLeft: '4px',
                    }}
                >
                    — click to investigate
                </span>
            </div>

            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '12px 16px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                }}
            >
                {claims.length === 0 && (
                    <span
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        No claims extracted.
                    </span>
                )}

                {claims.map((claim, i) => {
                    const cfg = getVerdict(claim);
                    const Icon = cfg.icon;
                    const isSelected = claim.id === selectedId || i === selectedId;

                    return (
                        <motion.button
                            key={claim.id ?? i}
                            onClick={() => onSelect(isSelected ? null : (claim.id ?? i))}
                            whileHover={{ borderColor: cfg.color }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                border: `1px solid ${isSelected ? cfg.color : cfg.border}`,
                                background: isSelected ? cfg.bg : 'transparent',
                                cursor: 'pointer',
                                flexShrink: 0,
                                maxWidth: '240px',
                                transition: 'border-color 120ms ease, background 120ms ease',
                            }}
                        >
                            {/* Left verdict bar */}
                            <div
                                style={{
                                    width: '2px',
                                    height: '20px',
                                    borderRadius: '2px',
                                    background: cfg.color,
                                    flexShrink: 0,
                                }}
                            />
                            <Icon size={11} strokeWidth={2} style={{ color: cfg.color, flexShrink: 0 }} />
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11px',
                                    color: 'var(--color-text-secondary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {claim.claim_text ?? claim.text ?? claim.claim ?? `Claim ${i + 1}`}
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </Cell>
    );
}

// ── TranscriptPanel ───────────────────────────────────────────────────────────
function TranscriptPanel({ transcript, selectedClaim, isMobile, isTablet, style = {} }) {
    const containerRef = useRef(null);

    // Highlight text that matches selected claim
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
                        background: 'rgba(232,69,60,0.15)',
                        color: 'inherit',
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
            // Scroll back to top if unselected
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
            }
        }
    }, [selectedClaim]);

    return (
        <Cell colSpan={isMobile ? 1 : 2} isMobile={isMobile} isTablet={isTablet} style={style}>
            <CellHeader label="Transcript" icon={FileText} />
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '260px',
                    scrollbarWidth: 'thin',
                }}
            >
                {lines.length === 0 && (
                    <span
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        No transcript available.
                    </span>
                )}
                {lines.map((line, i) => {
                    const text = line.text ?? line;
                    return (
                        <div key={line.id ?? i} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                            {line.timestamp != null && (
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '10px',
                                        color: 'var(--color-text-muted)',
                                        opacity: 0.5,
                                        flexShrink: 0,
                                        minWidth: '36px',
                                    }}
                                >
                                    {typeof line.timestamp === 'number'
                                        ? `${Math.floor(line.timestamp / 60)}:${String(line.timestamp % 60).padStart(2, '0')}`
                                        : line.timestamp}
                                </span>
                            )}
                            <span
                                style={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    color: 'var(--color-text-secondary)',
                                }}
                            >
                                {highlightPassage(text)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Cell>
    );
}

// ── SignalDistribution cell ───────────────────────────────────────────────────
function SignalDistribution({ claims, isMobile, isTablet, style = {} }) {
    const counts = claims.reduce((acc, c) => {
        const raw = (c.verdict ?? c.classification ?? c.label ?? 'unverifiable')
            .toLowerCase().replace(/\s+/g, '');
        const v = VERDICT[raw] ? raw : 'unverifiable';
        acc[v] = (acc[v] ?? 0) + 1;
        return acc;
    }, {});

    const max = Math.max(...Object.values(counts), 1);
    const order = ['false', 'misleading', 'unverifiable', 'plausible', 'true'];
    const rows = order.filter(v => counts[v]).map(v => ({ v, count: counts[v] }));

    return (
        <Cell isMobile={isMobile} isTablet={isTablet} style={style}>
            <CellHeader label="Signal Distribution" icon={BarChart2} />
            <div
                style={{
                    flex: 1,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '12px',
                }}
            >
                {rows.length === 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        No data.
                    </span>
                )}
                {rows.map(({ v, count }) => {
                    const cfg = VERDICT[v] ?? VERDICT.unverifiable;
                    const Icon = cfg.icon;
                    return (
                        <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {Icon && <Icon size={10} style={{ color: cfg.color, opacity: 0.8 }} />}
                                <span style={{ 
                                    fontFamily: 'var(--font-mono)', 
                                    fontSize: '10px', 
                                    color: cfg.color, 
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase'
                                }}>
                                    {cfg.label}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', opacity: 0.3 }}>
                                    ·
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                    {count}
                                </span>
                            </div>
                            <div
                                style={{
                                    height: '6px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                }}
                            >
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: count / max }}
                                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                                    style={{
                                        height: '100%',
                                        background: cfg.color,
                                        borderRadius: '3px',
                                        transformOrigin: 'left',
                                        filter: `drop-shadow(0px 0px 4px ${cfg.color}bb)`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </Cell>
    );
}

// ── ProvenancePanel (OCR) ─────────────────────────────────────────────────────
function ProvenancePanel({ ocrData, isMobile, isTablet, style = {} }) {
    // ocrData can be a string (legacy/fallback) or the full results object
    const structuredFrames = ocrData?.frames_ocr ?? [];
    const rawText = typeof ocrData === 'string' ? ocrData : (ocrData?.unified_transcript ?? '');

    // Flatten frames into displayable blocks
    const blocks = structuredFrames.flatMap(frame => 
        (frame.blocks || []).map(block => ({
            ...block,
            timestamp: frame.timestamp_seconds
        }))
    );

    const displayItems = blocks.length > 0 ? blocks : rawText.split('\n').filter(Boolean);

    return (
        <Cell isMobile={isMobile} isTablet={isTablet} style={style}>
            <CellHeader label="OCR · Provenance" icon={Eye} />
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxHeight: '260px',
                    scrollbarWidth: 'thin',
                }}
            >
                {displayItems.length === 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
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
                                padding: '8px 12px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '6px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {ts != null && (
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-muted)' }}>
                                            [{Math.floor(ts / 60)}:{String(Math.floor(ts % 60)).padStart(2, '0')}]
                                        </span>
                                    )}
                                    {conf != null && (
                                        <span style={{ 
                                            fontFamily: 'var(--font-mono)', 
                                            fontSize: '9px', 
                                            color: conf > 0.8 ? '#22C55E' : '#EAB308',
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
                                    color: 'var(--color-text-secondary)',
                                    lineHeight: 1.4,
                                }}
                            >
                                {text}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Cell>
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
    const [highlightedTranscriptRef, setHighlightedTranscriptRef] = useState(null);

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
                <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}
                >
                    Assembling report…
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#E8453C' }}>
                    Error loading report: {error}
                </span>
            </div>
        );
    }

    // ── Normalise API shape ───────────────────────────────────────────────────
    // The API returns: { id, instagram_url, ingestion_source, original_filename,
    //                    status, report: { report_data: { claims, summary, ... } },
    //                    claims: [...ClaimRecord...], media_assets: [...] }
    // Merge report_data into a flat object that all cells can read from.
    const reportData  = jobData?.report?.report_data ?? {};
    const mergedData  = { ...reportData, ...jobData };   // jobData fields take priority

    const claims = mergedData?.claims ?? reportData?.claims ?? [];
    const transcript = mergedData?.transcript_text ?? reportData?.transcript_text ?? jobData?.transcript_text ?? [];
    const ocrText = reportData?.ocr_text ?? mergedData?.ocr_text ?? mergedData?.ocr ?? [];
    const ocrResults = reportData?.ocr_results ?? mergedData?.ocr_results ?? null;

    const selectedClaim = selectedId !== null
        ? (claims.find((c, i) => (c.id ?? i) === selectedId) ?? null)
        : null;

    return (
        <>
            {/* Click-outside overlay */}
            <AnimatePresence>
                {selectedClaim && (
                    <motion.div
                        key="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectedId(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.35)',
                            zIndex: 99,
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Detail drawer */}
            <AnimatePresence>
                {selectedClaim && (
                    <DetailDrawer
                        key="drawer"
                        claim={selectedClaim}
                        jobData={jobData}
                        onClose={() => setSelectedId(null)}
                        onHighlightTranscript={setHighlightedTranscriptRef}
                    />
                )}
            </AnimatePresence>

            {/* Report header: label + export menu */}
            <div className="no-print" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px 24px 0',
            }}>
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(232,230,224,0.25)',
                }}>
                    Intelligence Report · {jobData?.id ?? jobId}
                </span>
                <ExportMenu jobId={jobData?.id ?? jobId} jobData={jobData} />
            </div>

            {/* Bento grid */}
            <motion.div
                className="no-print"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gridAutoRows: 'auto',
                    gap: isMobile ? '10px' : '12px',
                    padding: isMobile ? '12px 16px 24px' : '16px 24px 24px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}
            >
                {/* Row 1: MediaPreview · RiskScore · IntelligenceSummary (2 cols) */}
                <MediaPreview jobData={mergedData} />
                <RiskScore claims={claims} riskExplanation={mergedData?.risk_explanation} />
                <IntelligenceSummary jobData={mergedData} claims={claims} isMobile={isMobile} isTablet={isTablet} />

                {/* Row 2: ClaimsStrip (full width) */}
                <ClaimsStrip
                    claims={claims}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    isMobile={isMobile}
                    isTablet={isTablet}
                />

                {/* Row 2.5: Credibility Timeline */}
                <Cell colSpan={4} isMobile={isMobile} isTablet={isTablet}>
                    <CredibilityTimeline
                        claims={claims}
                        jobData={mergedData}
                        onClaimClick={(claim) => {
                            const idx = claims.findIndex((c, i) => (c.id ?? i) === (claim.id ?? claims.indexOf(claim)));
                            setSelectedId(claim.id ?? idx);
                        }}
                    />
                </Cell>

                {/* Row 3: TranscriptPanel · SignalDistribution · ProvenancePanel */}
                <TranscriptPanel
                    transcript={transcript}
                    selectedClaim={selectedClaim}
                    highlightedRef={highlightedTranscriptRef}
                    isMobile={isMobile}
                    isTablet={isTablet}
                    style={{ alignSelf: 'start' }}
                />
                <SignalDistribution 
                    claims={claims} 
                    isMobile={isMobile} 
                    isTablet={isTablet} 
                    style={{ alignSelf: 'start' }}
                />
                <ProvenancePanel 
                    ocrData={ocrResults || ocrText} 
                    isMobile={isMobile} 
                    isTablet={isTablet}
                />

                {/* Row 4: Processing Timeline Gantt strip */}
                <Cell colSpan={4} isMobile={isMobile} isTablet={isTablet}>
                    <ProcessingTimeline jobData={mergedData} />
                </Cell>
            </motion.div>

            {/* Specialized Print Layout (Hidden in UI, Visible in @media print) */}
            <PrintReport 
                jobData={mergedData} 
                claims={claims} 
                transcript={transcript} 
                ocrData={ocrResults || ocrText} 
            />
        </>
    );
}