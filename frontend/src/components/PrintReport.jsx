/**
 * PrintReport.jsx — Eden AI
 * A dedicated, clean report layout for PDF/Print export.
 * Hidden by default, visible only in @media print.
 */
import React from 'react';

const S = {
    container: {
        display: 'none', // Hidden in browser, shown via CSS @media print
        background: 'white',
        color: 'black',
        fontFamily: "'Geist', 'Inter', sans-serif",
        padding: '0',
    },
    header: {
        borderBottom: '2px solid black',
        paddingBottom: '20px',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: '28px',
        fontWeight: '800',
        margin: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    meta: {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#666',
        textAlign: 'right',
    },
    section: {
        marginBottom: '40px',
        breakInside: 'avoid',
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px',
        marginBottom: '16px',
        color: '#444',
    },
    summary: {
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#222',
        whiteSpace: 'pre-wrap',
    },
    claimCard: {
        border: '1px solid #eee',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        breakInside: 'avoid',
    },
    badge: (color) => ({
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase',
        background: color + '15',
        color: color,
        border: `1px solid ${color}30`,
        marginBottom: '8px',
    }),
    ocrBlock: {
        fontFamily: 'monospace',
        fontSize: '11px',
        padding: '8px 12px',
        background: '#f9f9f9',
        border: '1px solid #eee',
        borderRadius: '4px',
        marginBottom: '6px',
    }
};

export default function PrintReport({ jobData, claims, transcript, ocrData }) {
    const riskScore = jobData?.risk_score ?? jobData?.riskScore ?? 0;
    const riskLevel = riskScore >= 0.66 ? 'HIGH' : riskScore >= 0.33 ? 'MEDIUM' : 'LOW';
    const riskColor = riskLevel === 'HIGH' ? '#E8453C' : riskLevel === 'MEDIUM' ? '#D4841A' : '#2A9D5C';
    
    const summary = jobData?.summary ?? jobData?.report?.report_data?.summary ?? "No summary available.";
    const date = new Date().toLocaleString();
    const url = jobData?.url ?? jobData?.instagram_url ?? "Local Upload";
    
    // Media preview logic
    const mediaAsset = jobData?.media_assets?.find(a => ['IMAGE', 'VIDEO'].includes(a.asset_type));
    const mediaUrl = mediaAsset?.file_url;
    const isVideo = mediaAsset?.asset_type === 'VIDEO';

    // Flatten OCR data if it's structured
    const structuredFrames = ocrData?.frames_ocr ?? [];
    const ocrBlocks = structuredFrames.flatMap(f => (f.blocks || []).map(b => ({ ...b, ts: f.timestamp_seconds })));
    const rawOcr = typeof ocrData === 'string' ? ocrData : (ocrData?.unified_transcript ?? '');

    return (
        <div className="print-only-report" style={S.container}>
            {/* 1. Header */}
            <header style={S.header}>
                <div>
                    <h1 style={S.title}>Eden Intelligence</h1>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>
                        Operation ID: {jobData?.id} · {url}
                    </div>
                </div>
                <div style={S.meta}>
                    Generated: {date}<br />
                    Classification: <span style={{ color: riskColor, fontWeight: 'bold' }}>{riskLevel} RISK</span>
                </div>
            </header>

            {/* 2. Media Section */}
            <section style={S.section}>
                <h2 style={S.sectionTitle}>Source Media</h2>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    {mediaUrl && (
                        <div style={{ width: '200px', flexShrink: 0 }}>
                            <img 
                                src={mediaUrl} 
                                alt="Source Thumbnail" 
                                style={{ width: '100%', borderRadius: '4px', border: '1px solid #eee' }} 
                            />
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                            {isVideo ? 'Video/Reel Content' : 'Image Content'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
                            Source URL: {url}
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Executive Summary */}
            <section style={S.section}>
                <h2 style={S.sectionTitle}>Executive Summary</h2>
                <div style={S.summary}>{summary}</div>
            </section>

            {/* 3. Claims Analysis */}
            <section style={S.section}>
                <h2 style={S.sectionTitle}>Claims Analysis ({claims.length})</h2>
                {claims.map((claim, i) => (
                    <div key={i} style={S.claimCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={S.badge(claim.color || '#4A7CF7')}>
                                {claim.verdict || 'UNVERIFIED'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace' }}>
                                Confidence: {Math.round((claim.confidence_score || 0) * 100)}%
                            </div>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                            "{claim.claim_text || claim.text}"
                        </div>
                        <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.5' }}>
                            {claim.contextual_reasoning || claim.rationale}
                        </div>
                    </div>
                ))}
            </section>

            {/* 4. OCR Provenance */}
            {(ocrBlocks.length > 0 || rawOcr) && (
                <section style={S.section}>
                    <h2 style={S.sectionTitle}>On-Screen Text Evidence (OCR)</h2>
                    {ocrBlocks.length > 0 ? (
                        ocrBlocks.slice(0, 20).map((b, i) => (
                            <div key={i} style={S.ocrBlock}>
                                <span style={{ color: '#999', marginRight: '8px' }}>
                                    [{Math.floor(b.ts/60)}:{String(Math.floor(b.ts%60)).padStart(2, '0')}]
                                </span>
                                {b.text}
                            </div>
                        ))
                    ) : (
                        <div style={S.ocrBlock}>{rawOcr}</div>
                    )}
                </section>
            )}

            {/* 5. Transcript */}
            {transcript && transcript.length > 0 && (
                <section style={S.section}>
                    <h2 style={S.sectionTitle}>Audio Transcript</h2>
                    <div style={{ ...S.summary, fontSize: '12px', background: '#fcfcfc', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                        {typeof transcript === 'string' ? transcript : transcript.map(t => t.text).join(' ')}
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer style={{ marginTop: '60px', borderTop: '1px solid #eee', paddingTop: '20px', fontSize: '10px', color: '#999', textAlign: 'center' }}>
                Eden AI Misinformation Analysis Platform · Confidential
            </footer>
        </div>
    );
}
