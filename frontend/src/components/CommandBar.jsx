import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Zap, Upload, FileVideo, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { uploadMedia } from '../services/api';

// ── Mode selector data ────────────────────────────────────────────────────────
const MODES = [
    {
        id: 'text',
        label: 'Text Focus',
        hint: 'Image posts · screenshots · infographics · text-heavy reels',
        description: 'Extracts on-screen text via OCR',
    },
    {
        id: 'audio',
        label: 'Audio Focus',
        hint: 'Interviews · speeches · podcasts · talking-head reels',
        description: 'Transcribes speech via Whisper',
    },
];

// ── Elapsed timer hook ────────────────────────────────────────────────────────
function useElapsed(running) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!running) { setElapsed(0); return; }
        const start = Date.now();
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
        return () => clearInterval(id);
    }, [running]);
    return elapsed;
}

function formatElapsed(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
}

// ── Idle / hero state ─────────────────────────────────────────────────────────
function IdleBar({ url, onUrlChange, onFocus, onSubmit, selectedMode, onModeChange, isFocused, isSubmitting }) {
    const canSubmit = url.trim().length > 0 && !!selectedMode;
    const inputRef = useRef(null);
    const isValid = url.trim().length > 0;
    const isMobile = useMediaQuery('(max-width: 767px)');

    return (
        <motion.div
            layoutId="command-bar"
            style={{
                width: '100%',
                maxWidth: isMobile ? 'none' : '680px',
                margin: '0 auto',
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    marginBottom: '12px',
                    paddingLeft: '2px',
                }}
            >
                New Analysis Operation
            </motion.p>

            {/* Input row */}
            <motion.div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(15, 15, 22, 0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: isFocused
                        ? '1px solid rgba(59, 130, 246, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '0 18px',
                    height: '58px',
                    gap: '12px',
                    transition: 'all 0.3s var(--ease-spring)',
                    boxShadow: isFocused
                        ? '0 0 25px rgba(59, 130, 246, 0.12), inset 0 0 10px rgba(59, 130, 246, 0.05)'
                        : '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Search
                    size={18}
                    strokeWidth={1.5}
                    style={{ color: isFocused ? '#3B82F6' : 'var(--color-text-muted)', flexShrink: 0, transition: 'color 0.2s' }}
                />

                <input
                    ref={inputRef}
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onFocus={onFocus}
                    onBlur={() => {}}
                    onKeyDown={(e) => e.key === 'Enter' && canSubmit && !isSubmitting && onSubmit()}
                    placeholder="Paste Instagram post or reel URL to analyze..."
                    style={{
                        flex: 1,
                        width: '100%',
                        minWidth: 0,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '15px',
                        color: 'var(--color-text-primary)',
                        caretColor: '#3B82F6',
                    }}
                />

                {/* Clear */}
                <AnimatePresence>
                    {url.length > 0 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.1 }}
                            onClick={() => onUrlChange('')}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px',
                                borderRadius: '6px',
                                flexShrink: 0,
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <X size={14} />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Submit button */}
                <AnimatePresence>
                    {canSubmit && (
                        <motion.button
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0 16px',
                                height: '38px',
                                borderRadius: '8px',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                background: isSubmitting
                                    ? 'rgba(59, 130, 246, 0.1)'
                                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.3) 100%)',
                                color: '#60A5FA',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                fontWeight: 500,
                                letterSpacing: '0.04em',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)',
                            }}
                            onMouseEnter={e => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.4) 100%)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.3) 100%)';
                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.15)';
                                }
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        style={{ display: 'inline-block', width: 12, height: 12 }}
                                    >
                                        ⟳
                                    </motion.span>
                                    Analyzing
                                </>
                            ) : (
                                <>
                                    <Zap size={13} strokeWidth={2} />
                                    Analyze
                                </>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Mode Selector Row */}
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: '16px',
                    paddingLeft: '2px',
                    flexDirection: isMobile ? 'column' : 'row',
                }}
            >
                {MODES.map((mode) => {
                    const isActive = selectedMode === mode.id;
                    return (
                        <button
                            key={mode.id}
                            onClick={() => onModeChange(mode.id)}
                            title={mode.description}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '4px',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                border: isActive
                                    ? '1px solid rgba(59, 130, 246, 0.4)'
                                    : '1px solid rgba(255, 255, 255, 0.05)',
                                background: isActive
                                    ? 'rgba(59, 130, 246, 0.06)'
                                    : 'rgba(15, 15, 22, 0.25)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                flex: 1,
                                textAlign: 'left',
                                boxShadow: isActive ? '0 4px 15px rgba(59, 130, 246, 0.05)' : 'none',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.background = 'rgba(15, 15, 22, 0.25)';
                                }
                            }}
                        >
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                fontWeight: 600,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: isActive ? '#60A5FA' : 'rgba(243, 244, 246, 0.7)',
                                transition: 'color 0.2s',
                            }}>
                                {mode.label}
                            </span>
                            <span style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '10px',
                                color: isActive ? 'rgba(96, 165, 250, 0.75)' : 'var(--color-text-muted)',
                                lineHeight: 1.4,
                                transition: 'color 0.2s',
                            }}>
                                {mode.hint}
                            </span>
                        </button>
                    );
                })}

                {/* Selector Help Prompt */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', height: '100%', alignSelf: 'center', paddingRight: '4px' }}>
                    <AnimatePresence>
                        {isValid && !selectedMode && (
                            <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -6 }}
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11px',
                                    color: '#F59E0B',
                                    letterSpacing: '0.06em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span className="animate-pulse">●</span> Select operation focus mode
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {canSubmit && !isMobile && (
                        <span
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                color: 'var(--color-text-muted)',
                                opacity: 0.6,
                            }}
                        >
                            Press Enter ↵ to launch
                        </span>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Submitted / header state ──────────────────────────────────────────────────
function SubmittedBar({ url, onReset, isProcessing, selectedMode }) {
    const elapsed = useElapsed(isProcessing);
    const displayUrl = url.length > 55 ? url.slice(0, 52) + '…' : url;

    return (
        <motion.div
            layoutId="command-bar"
            style={{
                width: '100%',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(15, 15, 22, 0.7)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            <div
                style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '0 24px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}
            >
                <motion.div
                    animate={isProcessing ? { scale: [1, 1.2, 1], opacity: [1, 0.4, 1] } : { scale: 1, opacity: 1 }}
                    transition={{ duration: 1.5, repeat: isProcessing ? Infinity : 0 }}
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isProcessing ? '#3B82F6' : '#10B981',
                        boxShadow: isProcessing ? '0 0 10px #3B82F6' : '0 0 10px #10B981',
                        flexShrink: 0,
                    }}
                />

                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: isProcessing ? '#60A5FA' : '#10B981',
                        flexShrink: 0,
                    }}
                >
                    {isProcessing ? 'Analyzing Signal' : 'Completed'}{selectedMode ? ` · ${selectedMode}` : ''}
                </span>

                <div
                    style={{
                        width: '1px',
                        height: '18px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        flexShrink: 0,
                    }}
                />

                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                    }}
                >
                    {displayUrl}
                </span>

                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--color-text-muted)',
                            flexShrink: 0,
                        }}
                    >
                        <Clock size={12} strokeWidth={1.5} />
                        <span
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                minWidth: '38px',
                            }}
                        >
                            {formatElapsed(elapsed)}
                        </span>
                    </motion.div>
                )}

                <motion.button
                    onClick={onReset}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.color = '#F3F4F6';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                >
                    <X size={12} />
                    Reset
                </motion.button>
            </div>
        </motion.div>
    );
}

// ── Hero wrapper (centers IdleBar vertically) ─────────────────────────────────
function HeroWrapper({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 24px',
                minHeight: '80vh',
                position: 'relative',
                zIndex: 10,
            }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                style={{ marginBottom: '36px', textAlign: 'center' }}
            >
                <h1
                    style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '44px',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.1,
                        margin: 0,
                        background: 'linear-gradient(135deg, #FFF 30%, #93C5FD 70%, #3B82F6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Eden
                </h1>
                <p
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        marginTop: '10px',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 500,
                    }}
                >
                    Multimodal Intelligence Platform
                </p>
            </motion.div>

            {children}

            {/* Features showcase */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                style={{
                    marginTop: '80px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '20px',
                    width: '100%',
                    maxWidth: '720px',
                }}
            >
                <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60A5FA' }}>
                        <Cpu size={16} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Multimodal OCR</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        Performs optical character recognition on video frames to index all on-screen assertions.
                    </p>
                </div>
                <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981' }}>
                        <CheckCircle size={16} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Audio Transcription</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        Decodes audio tracks via Whisper to capture conversational rhetoric and underlying claims.
                    </p>
                </div>
                <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B' }}>
                        <ShieldAlert size={16} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Claim Corroboration</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        Aligns claim parameters, classifies credibility vectors, and calculates overall operations risk.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Tab Switcher ──────────────────────────────────────────────────────────────
function TabSwitcher({ active, onChange }) {
    const tabs = [{ id: 'url', label: 'Analyze URL' }, { id: 'upload', label: 'Local Upload' }];
    return (
        <div style={{
            display: 'flex', gap: 2, marginBottom: 16,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 10, padding: 4,
            alignSelf: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}>
            {tabs.map(t => (
                <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding: '6px 16px',
                        borderRadius: 7,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: active === t.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        color: active === t.id ? '#60A5FA' : 'rgba(243, 244, 246, 0.4)',
                    }}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}

// ── Upload Tab ────────────────────────────────────────────────────────────────
const UPLOAD_MODES = MODES;

function fmtBytes(b) {
    if (b >= 1024 * 1024 * 1024) return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
    if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${b} B`;
}

function UploadTab({ isSubmitting, onUpload, selectedMode, onModeChange }) {
    const canUploadSubmit = !!selectedMode;
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadErr, setUploadErr] = useState(null);
    const fileRef = useRef(null);
    const isMobile = useMediaQuery('(max-width: 767px)');

    const accept = '.mp4,.mov,.avi,.mkv,.webm';
    const maxBytes = 500 * 1024 * 1024;

    const handleFile = useCallback((f) => {
        setUploadErr(null);
        if (!f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['mp4','mov','avi','mkv','webm'].includes(ext)) {
            setUploadErr(`Unsupported format .${ext}. Use MP4, MOV, AVI, MKV, or WEBM.`);
            return;
        }
        if (f.size > maxBytes) {
            setUploadErr(`File too large (${fmtBytes(f.size)}). Max 500 MB.`);
            return;
        }
        setFile(f);
    }, [maxBytes]);

    const onDrop = useCallback((e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);

    const handleSubmit = async () => {
        if (!file || isSubmitting) return;
        setUploadErr(null);
        setProgress(0);
        try {
            const job = await uploadMedia(file, selectedMode, setProgress);
            onUpload(job);
        } catch (err) {
            setUploadErr(err.message || 'Upload failed.');
            setProgress(0);
        }
    };

    return (
        <motion.div
            layoutId="command-bar"
            style={{ width: '100%', maxWidth: isMobile ? 'none' : '680px', margin: '0 auto' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Drop zone */}
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => !file && fileRef.current?.click()}
                style={{
                    border: `1.5px dashed ${dragging ? '#3B82F6' : file ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12,
                    minHeight: 140,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                    cursor: file ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    background: dragging ? 'rgba(59, 130, 246, 0.04)' : file ? 'rgba(16, 185, 129, 0.02)' : 'rgba(15,15,22,0.3)',
                    padding: '24px 20px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <input
                    ref={fileRef}
                    type="file"
                    accept={accept}
                    style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])}
                />

                <AnimatePresence mode="wait">
                    {!file ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ textAlign: 'center' }}
                        >
                            <Upload size={24} style={{ color: 'rgba(243,244,246,0.2)', marginBottom: 8 }} />
                            <p style={{
                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                color: 'rgba(243,244,246,0.4)', letterSpacing: '0.06em', margin: 0,
                            }}>
                                {dragging ? 'Release to drop media file' : 'Drop video file here — or click to browse'}
                            </p>
                            <p style={{
                                fontFamily: 'var(--font-sans)', fontSize: 9.5,
                                color: 'rgba(243,244,246,0.2)', marginTop: 6,
                            }}>
                                MP4 · MOV · AVI · MKV · WEBM (Max 500 MB)
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="file"
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                width: '100%', maxWidth: 440,
                            }}
                        >
                            <div style={{
                                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <FileVideo size={18} style={{ color: '#10B981' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    fontFamily: 'var(--font-mono)', fontSize: 11.5,
                                    color: 'rgba(243, 244, 246, 0.95)', margin: 0,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {file.name}
                                </p>
                                <p style={{
                                    fontFamily: 'var(--font-mono)', fontSize: 9.5,
                                    color: 'var(--color-text-muted)', marginTop: 3,
                                }}>
                                    {fmtBytes(file.size)}
                                </p>
                            </div>
                            <button
                                onClick={e => { e.stopPropagation(); setFile(null); setProgress(0); setUploadErr(null); }}
                                style={{
                                    background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer',
                                    color: 'rgba(243,244,246,0.4)', padding: 6, flexShrink: 0,
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <X size={12} />
                            </button>
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
                            style={{ height: '100%', background: '#3B82F6' }}
                        />
                    </div>
                )}
            </div>

            {/* Error */}
            <AnimatePresence>
                {uploadErr && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10.5,
                            color: '#F43F5E', marginTop: 8, letterSpacing: '0.04em',
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                    >
                        <span>●</span> {uploadErr}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* Mode + Analyze row */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 14, gap: 12, flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    {UPLOAD_MODES.map(m => (
                        <button
                            key={m.id}
                            onClick={() => onModeChange(m.id)}
                            title={m.hint}
                            style={{
                                fontFamily: 'var(--font-mono)', fontSize: 10,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                padding: '6px 12px', borderRadius: 8,
                                border: selectedMode === m.id
                                    ? '1px solid rgba(59, 130, 246, 0.4)'
                                    : '1px solid rgba(255, 255, 255, 0.05)',
                                background: selectedMode === m.id ? 'rgba(59, 130, 246, 0.08)' : 'rgba(15,15,22,0.25)',
                                color: selectedMode === m.id ? '#60A5FA' : 'rgba(243, 244, 246, 0.4)',
                                cursor: 'pointer', transition: 'all 0.2s ease',
                                fontWeight: 500,
                            }}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence>
                    {file && canUploadSubmit && (
                        <motion.button
                            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                            onClick={handleSubmit}
                            disabled={isSubmitting || progress > 0}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '0 18px', height: 36, borderRadius: 8,
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.25) 100%)',
                                color: '#60A5FA', fontFamily: 'var(--font-mono)',
                                fontSize: 11, letterSpacing: '0.04em', cursor: 'pointer',
                                opacity: (isSubmitting || progress > 0) ? 0.5 : 1,
                                boxShadow: '0 0 12px rgba(59, 130, 246, 0.1)',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => {
                                if (!isSubmitting && progress === 0) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.35) 100%)';
                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.2)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isSubmitting && progress === 0) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.25) 100%)';
                                    e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.1)';
                                }
                            }}
                        >
                            {progress > 0
                                ? <><Clock size={12} /> {progress}%</>
                                : <><Zap size={12} /> Analyze Media</>}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function CommandBar({
    isSubmitted,
    isProcessing,
    isSubmitting,
    url,
    selectedMode,
    onUrlChange,
    onModeChange,
    onSubmit,
    onReset,
    onUpload,
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [activeTab, setActiveTab] = useState('url');

    if (isSubmitted) {
        return (
            <SubmittedBar
                url={url}
                onReset={onReset}
                isProcessing={isProcessing}
                selectedMode={selectedMode}
            />
        );
    }

    return (
        <HeroWrapper>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
                <TabSwitcher active={activeTab} onChange={setActiveTab} />

                <AnimatePresence mode="wait">
                    {activeTab === 'url' ? (
                        <motion.div
                            key="url-tab"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{ width: '100%' }}
                        >
                            <IdleBar
                                url={url}
                                onUrlChange={onUrlChange}
                                onFocus={() => setIsFocused(true)}
                                onSubmit={onSubmit}
                                selectedMode={selectedMode}
                                onModeChange={onModeChange}
                                isFocused={isFocused}
                                isSubmitting={isSubmitting}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="upload-tab"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{ width: '100%' }}
                        >
                            <UploadTab
                                isSubmitting={isSubmitting}
                                onUpload={onUpload}
                                selectedMode={selectedMode}
                                onModeChange={onModeChange}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </HeroWrapper>
    );
}