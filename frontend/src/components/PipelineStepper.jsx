import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

// ── Stage definitions ─────────────────────────────────────────────────────────
const STAGES = [
    {
        id: 'acquire',
        label: 'Acquire',
        description: 'Resolving media URL',
        logLines: [
            'media_url resolved → cdn-ig.instagram.com',
            'content-type: video/mp4 confirmed',
            'initiating secure download stream',
        ],
    },
    {
        id: 'decode',
        label: 'Decode',
        description: 'Unpacking media container',
        logLines: [
            'demuxer initialized — container: mp4',
            'video track: h264 · audio track: aac 44.1kHz stereo',
            'extracting audio stream for transcription pipeline',
            'frame extraction complete',
        ],
    },
    {
        id: 'transcribe',
        label: 'Transcribe',
        description: 'Speech-to-text inference',
        logLines: [
            'whisper_large_v3 model loaded',
            'audio duration detected — queueing segments',
            'inference running — token stream active',
            'transcript assembly in progress…',
        ],
    },
    {
        id: 'extract',
        label: 'Extract',
        description: 'OCR & frame analysis',
        logLines: [
            'frame sampler initialized — 1fps extraction',
            'tesseract OCR pipeline active',
            'text regions detected in frames',
            'on-screen text indexed and normalized',
        ],
    },
    {
        id: 'analyze',
        label: 'Analyze',
        description: 'Claim identification & scoring',
        logLines: [
            'LLM claim extractor initialized',
            'transcript + OCR context assembled',
            'running multimodal claim analysis',
            'scoring confidence vectors per claim',
            'report assembly complete',
        ],
    },
];

// ── Map backend processingPhase string → stage index ─────────────────────────
function phaseToStageIndex(phase) {
    if (!phase) return 0;
    const p = phase.toLowerCase();
    if (p.includes('download') || p.includes('acqui') || p.includes('fetch')) return 0;
    if (p.includes('decode') || p.includes('extract audio') || p.includes('demux')) return 1;
    if (p.includes('transcri') || p.includes('whisper') || p.includes('speech')) return 2;
    if (p.includes('ocr') || p.includes('frame') || p.includes('vision')) return 3;
    if (p.includes('analyz') || p.includes('claim') || p.includes('llm') || p.includes('complet')) return 4;
    return 0;
}

// ── Elapsed timer hook ────────────────────────────────────────────────────────
function useElapsed(running) {
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef(null);

    useEffect(() => {
        if (!running) return;
        startRef.current = Date.now();
        setElapsed(0);
        const id = setInterval(
            () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
            1000
        );
        return () => clearInterval(id);
    }, [running]);

    return elapsed;
}

// Per-stage elapsed timers
function useStageTimers(activeIndex) {
    const [timers, setTimers] = useState({});
    const intervalsRef = useRef({});
    const startTimesRef = useRef({});
    const prevIndexRef = useRef(null);

    useEffect(() => {
        const prev = prevIndexRef.current;

        // A new stage became active
        if (activeIndex !== prev) {
            // Freeze the previous stage's timer
            if (prev !== null && intervalsRef.current[prev]) {
                clearInterval(intervalsRef.current[prev]);
                delete intervalsRef.current[prev];
            }
            // Start timer for current stage
            startTimesRef.current[activeIndex] = Date.now();
            intervalsRef.current[activeIndex] = setInterval(() => {
                setTimers((t) => ({
                    ...t,
                    [activeIndex]: Math.floor((Date.now() - startTimesRef.current[activeIndex]) / 1000),
                }));
            }, 1000);

            prevIndexRef.current = activeIndex;
        }

        return () => { };
    }, [activeIndex]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(intervalsRef.current).forEach(clearInterval);
        };
    }, []);

    return timers;
}

// ── Signal log manager ────────────────────────────────────────────────────────
function useSignalLog(activeIndex, processingPhase) {
    const [lines, setLines] = useState([]);
    const emittedRef = useRef(new Set());

    useEffect(() => {
        const stage = STAGES[activeIndex];
        if (!stage) return;

        // Emit stage header
        const headerId = `header-${activeIndex}`;
        if (!emittedRef.current.has(headerId)) {
            emittedRef.current.add(headerId);
            setLines((prev) => [
                ...prev,
                {
                    id: headerId,
                    text: `[${stage.label.toUpperCase()}] stage initiated`,
                    type: 'header',
                    ts: new Date().toISOString().slice(11, 19),
                },
            ]);
        }

        // Emit stage log lines with stagger
        stage.logLines.forEach((text, i) => {
            const lineId = `${activeIndex}-${i}`;
            if (!emittedRef.current.has(lineId)) {
                emittedRef.current.add(lineId);
                const delay = (i + 1) * 900;
                setTimeout(() => {
                    setLines((prev) => [
                        ...prev,
                        {
                            id: lineId,
                            text,
                            type: 'info',
                            ts: new Date().toISOString().slice(11, 19),
                        },
                    ]);
                }, delay);
            }
        });
    }, [activeIndex]);

    // Emit phase string from backend as it arrives
    useEffect(() => {
        if (!processingPhase) return;
        const lineId = `phase-${processingPhase}`;
        if (!emittedRef.current.has(lineId)) {
            emittedRef.current.add(lineId);
            setLines((prev) => [
                ...prev,
                {
                    id: lineId,
                    text: `backend → ${processingPhase}`,
                    type: 'backend',
                    ts: new Date().toISOString().slice(11, 19),
                },
            ]);
        }
    }, [processingPhase]);

    return lines;
}

// ── Stage node ────────────────────────────────────────────────────────────────
function StageNode({ stage, index, status, elapsedSeconds }) {
    // status: 'done' | 'active' | 'queued'
    const isDone = status === 'done';
    const isActive = status === 'active';

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                flex: 1,
                position: 'relative',
            }}
        >
            {/* Node circle */}
            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                {/* Pulse ring — active only */}
                {isActive && (
                    <>
                        <motion.div
                            animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                border: '1px solid var(--color-signal-blue, #4A7CF7)',
                            }}
                        />
                        <motion.div
                            animate={{ scale: [1, 1.35], opacity: [0.3, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                border: '1px solid var(--color-signal-blue, #4A7CF7)',
                            }}
                        />
                    </>
                )}

                {/* Circle fill */}
                <motion.div
                    animate={{
                        background: isDone
                            ? 'rgba(42,157,92,0.15)'
                            : isActive
                                ? 'rgba(74,124,247,0.12)'
                                : 'var(--color-surface)',
                        borderColor: isDone
                            ? '#2A9D5C'
                            : isActive
                                ? 'var(--color-signal-blue, #4A7CF7)'
                                : 'var(--color-border)',
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '1px solid',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <AnimatePresence mode="wait">
                        {isDone ? (
                            <motion.div
                                key="check"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <Check size={14} color="#2A9D5C" strokeWidth={2.5} />
                            </motion.div>
                        ) : isActive ? (
                            <motion.div
                                key="active"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: 'var(--color-signal-blue, #4A7CF7)',
                                }}
                            />
                        ) : (
                            <motion.span
                                key="num"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11px',
                                    color: 'var(--color-text-muted)',
                                }}
                            >
                                {index + 1}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Label */}
            <div style={{ textAlign: 'center' }}>
                <div
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        letterSpacing: '0.08em',
                        color: isDone
                            ? '#2A9D5C'
                            : isActive
                                ? 'var(--color-signal-blue, #4A7CF7)'
                                : 'var(--color-text-muted)',
                        transition: 'color 300ms ease',
                        marginBottom: '3px',
                    }}
                >
                    {stage.label}
                </div>
                <div
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        opacity: isDone || isActive ? 0.7 : 0.35,
                    }}
                >
                    {isDone && elapsedSeconds != null
                        ? `${elapsedSeconds}s`
                        : isActive
                            ? 'running…'
                            : 'queued'}
                </div>
            </div>
        </div>
    );
}

// ── Connector track ───────────────────────────────────────────────────────────
function Connector({ filled }) {
    return (
        <div
            style={{
                flex: 1,
                height: '1px',
                marginTop: '-20px', // align with circle centers
                position: 'relative',
                maxWidth: '80px',
            }}
        >
            {/* Base track */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--color-border)',
                }}
            />
            {/* Fill */}
            <motion.div
                animate={{ scaleX: filled ? 1 : 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#2A9D5C',
                    transformOrigin: 'left',
                }}
            />
        </div>
    );
}

// ── Signal log line ───────────────────────────────────────────────────────────
function LogLine({ line }) {
    const color =
        line.type === 'header'
            ? 'var(--color-signal-blue, #4A7CF7)'
            : line.type === 'backend'
                ? 'rgba(212,132,26,0.9)'
                : 'var(--color-text-secondary)';

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'baseline',
                lineHeight: 1.6,
            }}
        >
            <span
                style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    opacity: 0.5,
                    flexShrink: 0,
                    userSelect: 'none',
                }}
            >
                {line.ts}
            </span>
            <span
                style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color,
                }}
            >
                {line.text}
            </span>
        </motion.div>
    );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function PipelineStepper({ processingPhase, jobId }) {
    const activeIndex = phaseToStageIndex(processingPhase);
    const totalElapsed = useElapsed(true);
    const stageTimers = useStageTimers(activeIndex);
    const logLines = useSignalLog(activeIndex, processingPhase);
    const logEndRef = useRef(null);

    // Auto-scroll log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logLines]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '40px',
                padding: '48px 40px',
                maxWidth: '860px',
                margin: '0 auto',
                width: '100%',
            }}
        >
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color: 'var(--color-text-muted)',
                            marginBottom: '6px',
                        }}
                    >
                        Operation active
                    </div>
                    {jobId && (
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            {jobId}
                        </div>
                    )}
                </div>

                {/* Total elapsed */}
                <div style={{ textAlign: 'right' }}>
                    <div
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '28px',
                            fontWeight: 500,
                            color: 'var(--color-text-primary)',
                            letterSpacing: '-0.02em',
                            lineHeight: 1,
                        }}
                    >
                        {String(Math.floor(totalElapsed / 60)).padStart(2, '0')}
                        <span style={{ opacity: 0.35 }}>:</span>
                        {String(totalElapsed % 60).padStart(2, '0')}
                    </div>
                    <div
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--color-text-muted)',
                            marginTop: '4px',
                        }}
                    >
                        elapsed
                    </div>
                </div>
            </div>

            {/* ── Pipeline stepper ── */}
            <div
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '32px 24px 28px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    {STAGES.map((stage, index) => (
                        <div
                            key={stage.id}
                            style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}
                        >
                            <StageNode
                                stage={stage}
                                index={index}
                                status={
                                    index < activeIndex
                                        ? 'done'
                                        : index === activeIndex
                                            ? 'active'
                                            : 'queued'
                                }
                                elapsedSeconds={stageTimers[index]}
                            />
                            {index < STAGES.length - 1 && (
                                <Connector filled={index < activeIndex} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Active stage description */}
                <AnimatePresence mode="wait">
                    <motion.p
                        key={activeIndex}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            marginTop: '24px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: 'var(--color-text-muted)',
                            textAlign: 'center',
                            letterSpacing: '0.04em',
                        }}
                    >
                        {STAGES[activeIndex]?.description}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* ── Signal log ── */}
            <div
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                }}
            >
                {/* Log header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--color-border)',
                    }}
                >
                    <span
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        Signal log
                    </span>
                    {/* Live indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <motion.div
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: 'var(--color-signal-blue, #4A7CF7)',
                            }}
                        />
                        <span
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                color: 'var(--color-signal-blue, #4A7CF7)',
                            }}
                        >
                            live
                        </span>
                    </div>
                </div>

                {/* Log body */}
                <div
                    style={{
                        padding: '16px 20px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                    }}
                >
                    {logLines.map((line) => (
                        <LogLine key={line.id} line={line} />
                    ))}
                    {/* Blinking cursor */}
                    <motion.div
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                            marginTop: '2px',
                        }}
                    >
                        ▋
                    </motion.div>
                    <div ref={logEndRef} />
                </div>
            </div>
        </motion.div>
    );
}