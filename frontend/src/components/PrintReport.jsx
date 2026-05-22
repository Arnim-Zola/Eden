/**
 * PrintReport.jsx — Eden AI
 * A dedicated, highly polished corporate dossier/report layout for PDF/Print export.
 * Hidden by default, visible only in @media print.
 */
import React from 'react';

const S = {
    container: {
        background: '#ffffff',
        color: '#1a1a1a',
        fontFamily: "'Geist', 'Inter', -apple-system, sans-serif",
        padding: '0',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
    },
    topBanner: {
        background: '#09090b',
        color: '#ffffff',
        padding: '12px 30px',
        fontSize: '10px',
        fontFamily: 'monospace',
        letterSpacing: '0.25em',
        textAlign: 'center',
        fontWeight: '700',
        borderBottom: '3px solid #3f3f46',
        textTransform: 'uppercase',
    },
    contentWrapper: {
        padding: '40px 50px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        borderBottom: '2px solid #09090b',
        paddingBottom: '24px',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: '20px',
    },
    title: {
        fontSize: '32px',
        fontWeight: '900',
        margin: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        color: '#09090b',
    },
    subtitle: {
        fontSize: '12px',
        color: '#71717a',
        marginTop: '6px',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    metaBox: {
        textAlign: 'right',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#4b5563',
        lineHeight: '1.6',
    },
    riskBadge: (color) => ({
        display: 'inline-block',
        background: color,
        color: '#ffffff',
        padding: '8px 16px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
    }),
    section: {
        marginBottom: '40px',
        breakInside: 'avoid',
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        borderBottom: '2px solid #e4e4e7',
        paddingBottom: '8px',
        marginBottom: '20px',
        color: '#09090b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    twoColumnLayout: {
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: '40px',
        marginBottom: '40px',
        borderBottom: '1px solid #e4e4e7',
        paddingBottom: '30px',
    },
    summaryText: {
        fontSize: '13px',
        lineHeight: '1.7',
        color: '#27272a',
        textAlign: 'justify',
    },
    mediaCard: {
        background: '#f4f4f5',
        border: '1px solid #e4e4e7',
        borderRadius: '6px',
        padding: '12px',
        breakInside: 'avoid',
    },
    thumbnailWrapper: {
        width: '100%',
        aspectRatio: '16/9',
        background: '#e4e4e7',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px',
        border: '1px solid #d4d4d8',
    },
    claimCard: (borderLeftColor) => ({
        border: '1px solid #e4e4e7',
        borderLeft: `5px solid ${borderLeftColor}`,
        borderRadius: '6px',
        padding: '20px',
        marginBottom: '20px',
        background: '#fafafa',
        breakInside: 'avoid',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
    }),
    claimMetaRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
    },
    badge: (color) => ({
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: color + '15',
        color: color,
        border: `1px solid ${color}30`,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
    }),
    confidenceScore: {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        color: '#4b5563',
    },
    confidenceBarBg: {
        width: '80px',
        height: '4px',
        background: '#e4e4e7',
        borderRadius: '2px',
        display: 'inline-block',
        marginLeft: '8px',
        verticalAlign: 'middle',
        overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
    },
    confidenceBarFill: (color, width) => ({
        width: `${width}%`,
        height: '100%',
        background: color,
        borderRadius: '2px',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
    }),
    verbatim: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#09090b',
        lineHeight: '1.5',
        margin: '0 0 12px 0',
        fontStyle: 'italic',
    },
    rationaleBlock: {
        fontSize: '12px',
        color: '#27272a',
        lineHeight: '1.6',
        background: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '4px',
        padding: '12px 14px',
        marginTop: '10px',
    },
    sourceList: {
        marginTop: '14px',
        borderTop: '1px dashed #e4e4e7',
        paddingTop: '12px',
    },
    sourceItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        fontSize: '11px',
        marginBottom: '6px',
        color: '#4b5563',
    },
    sourceTitle: {
        fontWeight: '600',
        color: '#09090b',
        textDecoration: 'none',
        wordBreak: 'break-word',
    },
    sourceDomain: {
        fontFamily: 'monospace',
        color: '#2563eb',
        fontSize: '9.5px',
        marginLeft: '4px',
        wordBreak: 'break-all',
    },
    sourceSnippet: {
        color: '#71717a',
        fontSize: '10px',
        marginTop: '2px',
        lineHeight: '1.4',
        wordBreak: 'break-word',
    },
    evidenceLogBox: {
        fontSize: '12px',
        background: '#fafafa',
        padding: '16px 20px',
        border: '1px solid #e4e4e7',
        borderLeft: '3px solid #09090b',
        color: '#27272a',
        lineHeight: '1.7',
        whiteSpace: 'pre-wrap',
        borderRadius: '0 4px 4px 0',
    },
    ocrRow: {
        display: 'flex',
        gap: '12px',
        padding: '6px 0',
        borderBottom: '1px solid #f4f4f5',
        fontSize: '11px',
    },
    footer: {
        marginTop: 'auto',
        borderTop: '1px solid #e4e4e7',
        paddingTop: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '9px',
        color: '#71717a',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    }
};

export default function PrintReport({ jobData, claims, transcript, ocrData }) {
    const riskScore = jobData?.risk_score ?? jobData?.riskScore ?? 0.0;
    const riskPercent = Math.round(riskScore * 100);
    const riskLevel = riskScore >= 0.66 ? 'HIGH' : riskScore >= 0.33 ? 'MEDIUM' : 'LOW';
    const riskColor = riskLevel === 'HIGH' ? '#ef4444' : riskLevel === 'MEDIUM' ? '#f97316' : '#22c55e';
    
    const summary = jobData?.summary ?? jobData?.report?.report_data?.summary ?? "No summary available.";
    const date = new Date().toLocaleString();
    const url = jobData?.url ?? jobData?.instagram_url ?? "Local Upload";
    
    // Media preview logic
    const videoAsset = jobData?.media_assets?.find(a => a.asset_type === 'VIDEO');
    const imageAsset = jobData?.media_assets?.find(a => a.asset_type === 'IMAGE');
    const thumbAsset = jobData?.media_assets?.find(a => a.asset_type === 'THUMBNAIL');
    const frameAsset = jobData?.media_assets?.find(a => a.asset_type === 'FRAME_DIRECTORY');
    
    const getFullUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        const mediaPath = cleanPath.startsWith('/media/') ? cleanPath : `/media${cleanPath}`;
        return `http://localhost:8000${mediaPath}`;
    };

    const mediaUrl = getFullUrl(
        thumbAsset?.file_url ?? 
        imageAsset?.file_url ?? 
        frameAsset?.metadata?.frames?.[0]?.thumbnail_url ?? 
        null
    );
    const isVideo = !!videoAsset;

    // Flatten OCR data
    const structuredFrames = ocrData?.frames_ocr ?? [];
    const ocrBlocks = structuredFrames.flatMap(f => (f.blocks || []).map(b => ({ ...b, ts: f.timestamp_seconds })));
    const rawOcr = typeof ocrData === 'string' ? ocrData : (ocrData?.unified_transcript ?? '');

    // Signal distribution calculation
    const signals = claims.reduce((acc, c) => {
        const v = (c.verdict || c.classification_label || 'UNVERIFIED').toUpperCase();
        acc[v] = (acc[v] || 0) + 1;
        return acc;
    }, {});

    const getVerdictColor = (verdict = "") => {
        const v = verdict.toLowerCase();
        if (v.includes('unverified')) return '#6b7280'; // Gray
        if (v.includes('true') || v.includes('verified')) return '#22c55e'; // Green
        if (v.includes('false') || v.includes('risk')) return '#ef4444'; // Red
        if (v.includes('mislead')) return '#f97316'; // Orange
        if (v.includes('plausible')) return '#3b82f6'; // Blue
        return '#6b7280'; // Gray
    };

    return (
        <div className="print-only-report" style={S.container}>
            {/* Top Security Banner */}
            <div style={S.topBanner}>
                EDEN INTELLIGENCE UNIT · OSINT ANALYSIS DOSSIER · SECURE PRINT
            </div>

            <div style={S.contentWrapper}>
                {/* 1. Header Area */}
                <header style={S.header}>
                    <div style={{ flex: 1 }}>
                        <div style={S.subtitle}>
                            CASE FILE // EDN-{jobData?.id ?? '000'}
                        </div>
                        <h1 style={S.title}>Intelligence Report</h1>
                        <div style={{ fontSize: '12px', marginTop: '6px', color: '#3f3f46' }}>
                            Target Resource: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', wordBreak: 'break-all' }}>{url}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={S.riskBadge(riskColor)}>
                            {riskLevel} RISK ({riskPercent}%)
                        </div>
                        <div style={S.metaBox}>
                            Report Issued: {date}<br />
                            Pipeline Engine: Eden-Core-v1.3
                        </div>
                    </div>
                </header>

                {/* 2. Executive Summary & Source Media */}
                <div style={S.twoColumnLayout}>
                    <div>
                        <h2 style={S.sectionTitle}>
                            <span>Executive Summary</span>
                        </h2>
                        <div style={S.summaryText}>{summary}</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                        <div style={S.mediaCard}>
                            <div style={S.thumbnailWrapper}>
                                {mediaUrl ? (
                                    <img src={mediaUrl} alt="Dossier Media Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ fontSize: '9px', color: '#71717a', textAlign: 'center', fontWeight: '700' }}>
                                        {isVideo ? 'VIDEO DOSSIER' : 'IMAGE DOSSIER'}<br/>
                                        <span style={{ fontSize: '8px', color: '#a1a1aa', fontWeight: 'normal' }}>(NO IMAGE PREVIEW)</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '10px', color: '#27272a', lineHeight: '1.6', fontFamily: 'monospace' }}>
                                <strong>SOURCE:</strong> {url.includes('instagram.com') ? 'INSTAGRAM' : 'LOCAL UPLOAD'}<br/>
                                <strong>TYPE:</strong> {jobData?.analysis_type || 'MEDIA'}<br/>
                                <strong>PROCESSED:</strong> COMPLETED
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Signal Distribution */}
                <section style={S.section}>
                    <h2 style={S.sectionTitle}>Signal Distribution</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                        {Object.entries(signals).map(([key, count]) => {
                            const color = getVerdictColor(key);
                            return (
                                <div key={key} style={{ 
                                    padding: '12px 14px', 
                                    background: '#fafafa', 
                                    border: '1px solid #e4e4e7', 
                                    borderTop: `3px solid ${color}`,
                                    borderRadius: '4px',
                                    textAlign: 'center',
                                    WebkitPrintColorAdjust: 'exact',
                                    printColorAdjust: 'exact',
                                }}>
                                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>{key}</div>
                                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#09090b' }}>{count}</div>
                                </div>
                            );
                        })}
                        {Object.keys(signals).length === 0 && (
                            <div style={{ color: '#71717a', padding: '10px', fontSize: '12px', fontStyle: 'italic' }}>
                                No classification signals recorded.
                            </div>
                        )}
                    </div>
                </section>

                {/* 4. Claims & Verifications */}
                <section style={S.section}>
                    <h2 style={S.sectionTitle}>Claims & Verifications ({claims.length})</h2>
                    <div>
                        {claims.map((claim, i) => {
                            const verdict = claim.verdict ?? claim.classification_label ?? 'UNVERIFIED';
                            const verdictColor = getVerdictColor(verdict);
                            const confidence = Math.round((claim.confidence ?? claim.confidence_score ?? 0.5) * 100);
                            const sources = claim.related_sources ?? claim.relatedSources ?? [];

                            return (
                                <div key={i} style={S.claimCard(verdictColor)}>
                                    <div style={S.claimMetaRow}>
                                        <div style={S.badge(verdictColor)}>
                                            {verdict}
                                        </div>
                                        <div style={S.confidenceScore}>
                                            CONFIDENCE: {confidence}%
                                            <div style={S.confidenceBarBg}>
                                                <div style={S.confidenceBarFill(verdictColor, confidence)} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h3 style={S.verbatim}>
                                        &ldquo;{claim.claim_text ?? claim.text ?? claim.claim ?? "Unknown Claim Text"}&rdquo;
                                    </h3>

                                    <div style={S.rationaleBlock}>
                                        <strong>Analytical Rationale:</strong> {claim.contextual_reasoning ?? claim.reasoning ?? claim.rationale ?? "No reasoning details available."}
                                    </div>

                                    {/* Related verification sources list */}
                                    {sources.length > 0 && (
                                        <div style={S.sourceList}>
                                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                                                Cross-Reference Web Sources
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                {sources.slice(0, 3).map((source, sIdx) => {
                                                    let domain = "";
                                                    try {
                                                        domain = new URL(source.url).hostname.replace('www.', '');
                                                    } catch (e) {
                                                        domain = "reference";
                                                    }

                                                    return (
                                                        <div key={sIdx} style={S.sourceItem}>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}>
                                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                                            </svg>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div>
                                                                    <span style={S.sourceTitle}>{source.title}</span>
                                                                    <span style={S.sourceDomain}>({domain})</span>
                                                                </div>
                                                                {source.snippet && (
                                                                    <div style={S.sourceSnippet}>{source.snippet}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 5. Evidence Logs */}
                <section style={S.section}>
                    <h2 style={S.sectionTitle}>Evidence Logs</h2>
                    
                    {/* Transcript Logs */}
                    {transcript && (
                        <div style={{ marginBottom: '28px', breakInside: 'avoid' }}>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                // Audio Transcript Evidence
                            </div>
                            <div style={S.evidenceLogBox}>
                                {typeof transcript === 'string' ? transcript : transcript.map(t => t.text).join('\n')}
                            </div>
                        </div>
                    )}

                    {/* OCR Text Logs */}
                    {(ocrBlocks.length > 0 || rawOcr) && (
                        <div style={{ breakInside: 'avoid' }}>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#71717a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                // Visual OCR Provenance Logs
                            </div>
                            <div style={{ ...S.evidenceLogBox, whiteSpace: 'normal', padding: '14px 18px' }}>
                                {ocrBlocks.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                                        {ocrBlocks.slice(0, 30).map((b, i) => (
                                            <div key={i} style={S.ocrRow}>
                                                <span style={{ color: '#71717a', fontFamily: 'monospace', minWidth: '45px', fontWeight: 'bold' }}>
                                                    [{Math.floor(b.ts/60)}:{String(Math.floor(b.ts%60)).padStart(2, '0')}]
                                                </span>
                                                <span style={{ color: '#27272a' }}>{b.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{rawOcr}</div>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Security Footer */}
                <footer style={S.footer}>
                    <div>EDEN-DOSSIER-EXPT · SYSTEM CONFIDENTIAL</div>
                    <div>TIMESTAMP: {date}</div>
                    <div style={{ fontWeight: 'bold' }}>CLASSIFIED BRIEFING</div>
                </footer>
            </div>
        </div>
    );
}
