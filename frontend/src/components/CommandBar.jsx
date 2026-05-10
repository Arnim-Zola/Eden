import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Zap, Upload, FileVideo, CheckCircle } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { uploadMedia } from '../services/api';

// ── Mode selector data ────────────────────────────────────────────────────────
// FRAME mode is future scope — not available yet.
const MODES = [
    {
        id: 'text',
        label: 'Text',
        hint: 'Image posts · screenshots · infographics · text-heavy reels',
        description: 'Extracts on-screen text via OCR',
    },
    {
        id: 'audio',
        label: 'Audio',
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
    // Submit requires both a URL and a selected mode
    const canSubmit = url.trim().length > 0 && !!selectedMode;
    const inputRef = useRef(null);
    const isValid = url.trim().length > 0;  // URL validity (independent of mode)
    const isMobile = useMediaQuery('(max-width: 767px)');

    return (
        <motion.div
            layoutId="command-bar"
            style={{
                width: '100%',
                maxWidth: isMobile ? 'none' : '680px',
                margin: '0 auto',
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Label */}
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
                New operation
            </motion.p>

            {/* Input row */}
            <motion.div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--color-surface)',
                    border: isFocused
                        ? '1px solid var(--color-signal-blue, #4A7CF7)'
                        : '1px solid var(--color-border)',
                    borderRadius: isMobile ? '10px' : '10px',
                    padding: '0 16px',
                    height: '56px',
                    gap: '12px',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    boxShadow: isFocused
                        ? '0 0 0 3px rgba(74,124,247,0.08)'
                        : 'none',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Left border accent when focused */}
                <motion.div
                    animate={{ scaleY: isFocused ? 1 : 0, opacity: isFocused ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: '12px',
                        bottom: '12px',
                        width: '2px',
                        background: 'var(--color-signal-blue, #4A7CF7)',
                        borderRadius: '2px',
                        transformOrigin: 'center',
                    }}
                />

                <Search
                    size={16}
                    strokeWidth={1.5}
                    style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
                />

                <input
                    ref={inputRef}
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onFocus={onFocus}
                    onKeyDown={(e) => e.key === 'Enter' && canSubmit && !isSubmitting && onSubmit()}
                    placeholder="Paste Instagram URL to analyze…"
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
                        caretColor: 'var(--color-signal-blue, #4A7CF7)',
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
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px',
                                borderRadius: '4px',
                                flexShrink: 0,
                            }}
                        >
                            <X size={14} />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Submit — requires URL + mode selection */}
                <AnimatePresence>
                    {canSubmit && (
                        <motion.button
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.15 }}
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0 14px',
                                height: '36px',
                                borderRadius: '7px',
                                border: '1px solid var(--color-signal-blue, #4A7CF7)',
                                background: isSubmitting
                                    ? 'rgba(74,124,247,0.08)'
                                    : 'rgba(74,124,247,0.12)',
                                color: 'var(--color-signal-blue, #4A7CF7)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                letterSpacing: '0.08em',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                flexShrink: 0,
                                transition: 'background 120ms ease',
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
                                    Initiating
                                </>
                            ) : (
                                <>
                                    <Zap size={12} strokeWidth={2} />
                                    Analyze
                                </>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Mode selector — intent cards */}
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: '12px',
                    paddingLeft: '2px',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
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
                                gap: '3px',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: isActive
                                    ? '1px solid rgba(74,124,247,0.5)'
                                    : '1px solid var(--color-border)',
                                background: isActive
                                    ? 'rgba(74,124,247,0.08)'
                                    : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 150ms ease',
                                flex: isMobile ? '1 1 auto' : '0 1 auto',
                                minWidth: isMobile ? 0 : '130px',
                                textAlign: 'left',
                            }}
                        >
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: isActive
                                    ? 'var(--color-signal-blue, #4A7CF7)'
                                    : 'var(--color-text-secondary)',
                                transition: 'color 150ms ease',
                            }}>
                                {mode.label}
                            </span>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '9px',
                                color: isActive
                                    ? 'rgba(74,124,247,0.7)'
                                    : 'var(--color-text-muted)',
                                letterSpacing: '0.04em',
                                lineHeight: 1.4,
                                transition: 'color 150ms ease',
                                whiteSpace: isMobile ? 'normal' : 'nowrap',
                            }}>
                                {mode.hint}
                            </span>
                        </button>
                    );
                })}

                {/* Prompt: select a mode */}
                <AnimatePresence>
                    {isValid && !selectedMode && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                marginLeft: 'auto',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                color: 'rgba(232,183,74,0.7)',
                                alignSelf: 'center',
                                paddingRight: '2px',
                                letterSpacing: '0.06em',
                            }}
                        >
                            ← select a mode
                        </motion.span>
                    )}
                </AnimatePresence>

                {canSubmit && (
                    <span
                        style={{
                            marginLeft: 'auto',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--color-text-muted)',
                            alignSelf: 'center',
                            paddingRight: '2px',
                        }}
                    >
                        ↵ to analyze
                    </span>
                )}
            </motion.div>
        </motion.div>
    );
}

// ── Submitted / header state ──────────────────────────────────────────────────
function SubmittedBar({ url, onReset, isProcessing, selectedMode }) {
    const elapsed = useElapsed(isProcessing);

    // Truncate URL for display
    const displayUrl = url.length > 55 ? url.slice(0, 52) + '…' : url;

    return (
        <motion.div
            layoutId="command-bar"
            style={{
                width: '100%',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                backdropFilter: 'blur(8px)',
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            <div
                style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '0 24px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}
            >
                {/* Signal indicator */}
                <motion.div
                    animate={isProcessing ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                    transition={{ duration: 1.2, repeat: isProcessing ? Infinity : 0 }}
                    style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: isProcessing
                            ? 'var(--color-signal-blue, #4A7CF7)'
                            : 'var(--color-success, #2A9D5C)',
                        flexShrink: 0,
                    }}
                />

                {/* Status label */}
                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: isProcessing
                            ? 'var(--color-signal-blue, #4A7CF7)'
                            : 'var(--color-success, #2A9D5C)',
                        flexShrink: 0,
                    }}
                >
                    {isProcessing ? 'Processing' : 'Complete'}{selectedMode ? ` · ${selectedMode.toUpperCase()}` : ''}
                </span>

                {/* Divider */}
                <div
                    style={{
                        width: '1px',
                        height: '16px',
                        background: 'var(--color-border)',
                        flexShrink: 0,
                    }}
                />

                {/* Locked URL */}
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

                {/* Elapsed timer */}
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: 'var(--color-text-muted)',
                            flexShrink: 0,
                        }}
                    >
                        <Clock size={11} strokeWidth={1.5} />
                        <span
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                minWidth: '36px',
                            }}
                        >
                            {formatElapsed(elapsed)}
                        </span>
                    </motion.div>
                )}

                {/* Reset */}
                <motion.button
                    whileHover={{ color: 'var(--color-text-primary)' }}
                    onClick={onReset}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'color 120ms ease, border-color 120ms ease',
                    }}
                >
                    <X size={11} />
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
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 32px',
                minHeight: '60vh',
            }}
        >
            {/* Platform label */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                style={{ marginBottom: '40px', textAlign: 'center' }}
            >
                <h1
                    style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '13px',
                        fontWeight: 500,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-muted)',
                        margin: 0,
                    }}
                >
                    Eden
                </h1>
                <p
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        opacity: 0.5,
                        marginTop: '6px',
                        letterSpacing: '0.06em',
                    }}
                >
                    Multimodal intelligence platform
                </p>
            </motion.div>

            {children}
        </motion.div>
    );
}

// ── Tab Switcher ──────────────────────────────────────────────────────────────
function TabSwitcher({ active, onChange }) {
    const tabs = [{ id: 'url', label: 'URL' }, { id: 'upload', label: 'Upload' }];
    return (
        <div style={{
            display: 'flex', gap: 2, marginBottom: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: 3,
            alignSelf: 'flex-start',
        }}>
            {tabs.map(t => (
                <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        transition: 'background 150ms, color 150ms',
                        background: active === t.id ? 'rgba(74,124,247,0.15)' : 'transparent',
                        color: active === t.id ? '#4A7CF7' : 'rgba(232,230,224,0.35)',
                    }}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}

// ── Upload Tab ────────────────────────────────────────────────────────────────
// Upload tab reuses the same MODE definitions as URL tab (TEXT + AUDIO only)
const UPLOAD_MODES = MODES;

function fmtBytes(b) {
    if (b >= 1024 * 1024 * 1024) return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
    if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${b} B`;
}

function UploadTab({ isSubmitting, onUpload, selectedMode, onModeChange }) {
    const canUploadSubmit = !!selectedMode;  // mode required for upload too
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
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Drop zone */}
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => !file && fileRef.current?.click()}
                style={{
                    border: `1.5px dashed ${dragging ? '#4A7CF7' : file ? 'rgba(42,157,92,0.6)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 12,
                    minHeight: 120,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                    cursor: file ? 'default' : 'pointer',
                    transition: 'border-color 150ms, background 150ms',
                    background: dragging ? 'rgba(74,124,247,0.05)' : file ? 'rgba(42,157,92,0.04)' : 'transparent',
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
                            <Upload size={22} style={{ color: 'rgba(232,230,224,0.2)', marginBottom: 8 }} />
                            <p style={{
                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                color: 'rgba(232,230,224,0.35)', letterSpacing: '0.06em', margin: 0,
                            }}>
                                {dragging ? 'Release to load' : 'Drop MP4 / MOV here — or click to browse'}
                            </p>
                            <p style={{
                                fontFamily: 'var(--font-mono)', fontSize: 9,
                                color: 'rgba(232,230,224,0.18)', marginTop: 6, letterSpacing: '0.06em',
                            }}>
                                Max 500 MB · MP4 · MOV · AVI · MKV · WEBM
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
                                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                background: 'rgba(42,157,92,0.12)',
                                border: '1px solid rgba(42,157,92,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <FileVideo size={16} style={{ color: '#2A9D5C' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    fontFamily: 'var(--font-mono)', fontSize: 11,
                                    color: 'rgba(232,230,224,0.8)', margin: 0,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {file.name}
                                </p>
                                <p style={{
                                    fontFamily: 'var(--font-mono)', fontSize: 9,
                                    color: 'rgba(232,230,224,0.3)', marginTop: 3, letterSpacing: '0.06em',
                                }}>
                                    {fmtBytes(file.size)}
                                </p>
                            </div>
                            <button
                                onClick={e => { e.stopPropagation(); setFile(null); setProgress(0); setUploadErr(null); }}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'rgba(232,230,224,0.3)', padding: 4, flexShrink: 0,
                                }}
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Upload progress bar */}
                {progress > 0 && progress < 100 && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                        background: 'rgba(255,255,255,0.05)',
                    }}>
                        <motion.div
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.2 }}
                            style={{ height: '100%', background: '#4A7CF7', borderRadius: 1 }}
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
                            fontFamily: 'var(--font-mono)', fontSize: 10,
                            color: '#E8453C', marginTop: 8, letterSpacing: '0.06em',
                        }}
                    >
                        {uploadErr}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* Mode + Analyze row */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 12, gap: 12, flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    {UPLOAD_MODES.map(m => (
                        <button
                            key={m.id}
                            onClick={() => onModeChange(m.id)}
                            title={m.hint}
                            style={{
                                fontFamily: 'var(--font-mono)', fontSize: 10,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                padding: '5px 12px', borderRadius: 6,
                                border: selectedMode === m.id
                                    ? '1px solid rgba(74,124,247,0.4)'
                                    : '1px solid rgba(255,255,255,0.07)',
                                background: selectedMode === m.id ? 'rgba(74,124,247,0.1)' : 'transparent',
                                color: selectedMode === m.id ? '#4A7CF7' : 'rgba(232,230,224,0.35)',
                                cursor: 'pointer', transition: 'all 150ms',
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
                                padding: '0 16px', height: 36, borderRadius: 7,
                                border: '1px solid rgba(74,124,247,0.6)',
                                background: 'rgba(74,124,247,0.12)',
                                color: '#4A7CF7', fontFamily: 'var(--font-mono)',
                                fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer',
                                opacity: (isSubmitting || progress > 0) ? 0.5 : 1,
                            }}
                        >
                            {progress > 0
                                ? <><Clock size={12} /> {progress}%</>
                                : <><Zap size={12} /> Analyze</>}
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
    onUpload,          // NEW: (job) => void — called after successful upload
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