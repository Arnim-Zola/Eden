import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  SysMonitorHUD                                                      */
/*  Floating, collapsible, glassmorphic tactical telemetry console.    */
/*  Drop-in component — no external state required.                    */
/* ------------------------------------------------------------------ */

const FONT_STACK =
    "'Geist Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

const COLORS = {
    bg: "rgba(8,12,18,0.7)",
    border: "rgba(74,124,247,0.18)",
    borderActive: "rgba(120,170,255,0.55)",
    glow: "0 16px 40px -10px rgba(74,124,247,0.15)",
    glowActive: "0 20px 60px -8px rgba(74,124,247,0.35)",
    green: "#3CF299",
    greenDim: "rgba(60,242,153,0.35)",
    blue: "#4A7CF7",
    amber: "#F7B84A",
    red: "#F75A5A",
    textDim: "rgba(190,205,225,0.55)",
    textBright: "#DCE8FF",
};

const LOG_POOL = [
    "[SYS] INITIALIZING OCR ENGINE...",
    "[CELERY] QUEUEING AUDIO EXTRACTION...",
    "[API] E2E SECURE CHANNEL ESTABLISHED",
    "[NET] HANDSHAKE COMPLETE · TLS1.3",
    "[CACHE] INDEX REBUILT · 4,201 NODES",
    "[SYS] MEMORY POOL COMPACTION OK",
    "[CELERY] WORKER-04 PICKED UP TASK #88213",
    "[API] RATE LIMIT WINDOW RESET",
    "[SYS] ENTITY RESOLUTION PASS COMPLETE",
    "[NET] LATENCY NOMINAL · 42ms",
    "[CACHE] STALE KEYS EVICTED",
    "[SYS] CHECKSUM VERIFIED · NO DRIFT",
    "[CELERY] QUEUE DEPTH NORMALIZED",
    "[API] WEBHOOK DISPATCH · 200 OK",
    "[SYS] SNAPSHOT WRITTEN TO DISK",
];

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#0123456789";

/* Typewriter / scramble-decode effect for a single log line */
function useScrambleText(target, active) {
    const [display, setDisplay] = useState(active ? "" : target);
    const frame = useRef(0);
    const raf = useRef(null);

    useEffect(() => {
        if (!active) {
            setDisplay(target);
            return;
        }
        frame.current = 0;
        const total = target.length;
        const revealSpeed = 1.6; // chars revealed per tick

        const tick = () => {
            frame.current += revealSpeed;
            const revealCount = Math.min(total, Math.floor(frame.current));
            let out = "";
            for (let i = 0; i < total; i++) {
                if (i < revealCount) {
                    out += target[i];
                } else if (target[i] === " ") {
                    out += " ";
                } else {
                    out +=
                        SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                }
            }
            setDisplay(out);
            if (revealCount < total) {
                raf.current = setTimeout(tick, 16);
            }
        };
        tick();
        return () => clearTimeout(raf.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, active]);

    return display;
}

function LogLine({ text, isNew }) {
    const decoded = useScrambleText(text, isNew);
    return (
        <div
            style={{
                fontFamily: FONT_STACK,
                fontSize: 11,
                lineHeight: "16px",
                color: COLORS.textDim,
                whiteSpace: "pre",
                letterSpacing: 0.2,
            }}
        >
            <span style={{ color: "rgba(120,170,255,0.9)" }}>{"> "}</span>
            {decoded}
        </div>
    );
}

/* Small circular gauge with hover micro-metric */
function Gauge({ label, value, color, unit = "%", microLabel, microValue }) {
    const [hovered, setHovered] = useState(false);
    const size = 58;
    const stroke = 4;
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - Math.min(value, 100) / 100);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: 8,
                borderRadius: 10,
                border: `1px solid ${hovered ? "rgba(120,170,255,0.35)" : "rgba(255,255,255,0.05)"}`,
                background: hovered ? "rgba(74,124,247,0.06)" : "transparent",
                transition: "all 0.25s ease",
                cursor: "default",
                minWidth: 92,
            }}
        >
            <div style={{ position: "relative", width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={stroke}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{
                            transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)",
                            filter: `drop-shadow(0 0 4px ${color})`,
                        }}
                    />
                </svg>
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONT_STACK,
                        fontSize: 12,
                        fontWeight: 600,
                        color: COLORS.textBright,
                    }}
                >
                    {Math.round(value)}
                    <span style={{ fontSize: 8, marginLeft: 1, color: COLORS.textDim }}>
                        {unit}
                    </span>
                </div>
            </div>
            <div
                style={{
                    fontFamily: FONT_STACK,
                    fontSize: 9.5,
                    letterSpacing: 1,
                    color: COLORS.textDim,
                    textTransform: "uppercase",
                }}
            >
                {label}
            </div>
            <AnimatePresence>
                {hovered && microLabel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            fontFamily: FONT_STACK,
                            fontSize: 8.5,
                            color: color,
                            textAlign: "center",
                            overflow: "hidden",
                        }}
                    >
                        {microLabel}: {microValue}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* Oscilloscope / sparkline canvas that reacts to cursor proximity */
function SignalCanvas({ reducedMotion }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const rafRef = useRef(null);
    const energyRef = useRef(0.15); // 0 = idle heartbeat, 1 = excited
    const targetEnergyRef = useRef(0.15);
    const tRef = useRef(0);
    const sweepRef = useRef(-1); // -1 = inactive, else 0..1 progress

    const handleMove = useCallback((e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = (e.clientX - rect.left) / rect.width;
        const dist = Math.abs(relX - 0.5) * 2; // 0 center .. 1 edge
        targetEnergyRef.current = 0.35 + (1 - dist) * 0.9;
    }, []);

    const handleLeave = useCallback(() => {
        targetEnergyRef.current = 0.15;
    }, []);

    const triggerSweep = useCallback(() => {
        sweepRef.current = 0;
    }, []);

    useEffect(() => {
        // expose sweep trigger to parent via custom event
        const el = containerRef.current;
        if (!el) return;
        el.__triggerSweep = triggerSweep;
    }, [triggerSweep]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let width, height, dpr;

        const resize = () => {
            dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener("resize", resize);

        const points = 140;

        const draw = () => {
            // ease energy toward target
            energyRef.current += (targetEnergyRef.current - energyRef.current) * 0.06;
            const energy = energyRef.current;
            tRef.current += reducedMotion ? 0.02 : 0.045 + energy * 0.05;

            ctx.clearRect(0, 0, width, height);

            // grid
            ctx.strokeStyle = "rgba(74,124,247,0.08)";
            ctx.lineWidth = 1;
            for (let gx = 0; gx < width; gx += 20) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, height);
                ctx.stroke();
            }
            const midY = height / 2;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(width, midY);
            ctx.stroke();

            // wave path
            const amp = (height / 2 - 6) * (0.15 + energy * 0.85);
            ctx.beginPath();
            for (let i = 0; i <= points; i++) {
                const x = (i / points) * width;
                const phase = tRef.current + i * (0.12 + energy * 0.25);
                // heartbeat-ish composite waveform
                const y =
                    midY -
                    Math.sin(phase) * amp * 0.6 -
                    Math.sin(phase * 2.3) * amp * 0.25 -
                    Math.sin(phase * 0.5) * amp * 0.15;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            const grad = ctx.createLinearGradient(0, 0, width, 0);
            grad.addColorStop(0, "#3CF299");
            grad.addColorStop(0.5, "#4A7CF7");
            grad.addColorStop(1, "#3CF299");
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.6;
            ctx.shadowColor = "#3CF299";
            ctx.shadowBlur = 8 + energy * 10;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // sweep overlay
            if (sweepRef.current >= 0) {
                const sx = sweepRef.current * width;
                const sweepGrad = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
                sweepGrad.addColorStop(0, "rgba(120,170,255,0)");
                sweepGrad.addColorStop(0.5, "rgba(120,170,255,0.55)");
                sweepGrad.addColorStop(1, "rgba(120,170,255,0)");
                ctx.fillStyle = sweepGrad;
                ctx.fillRect(sx - 30, 0, 60, height);
                sweepRef.current += reducedMotion ? 0.08 : 0.035;
                if (sweepRef.current > 1.2) sweepRef.current = -1;
            }

            rafRef.current = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(rafRef.current);
        };
    }, [reducedMotion]);

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{
                position: "relative",
                width: "100%",
                height: 70,
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid rgba(74,124,247,0.15)",
                background: "rgba(4,8,14,0.5)",
            }}
        >
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
    );
}

/* Pulsing status dot */
function StatusDot({ color = COLORS.green, size = 8, reducedMotion }) {
    return (
        <div style={{ position: "relative", width: size, height: size }}>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                }}
            />
            {!reducedMotion && (
                <motion.div
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: color,
                    }}
                    animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </div>
    );
}

/* Mini radar sweep for collapsed widget */
function RadarSweep({ reducedMotion }) {
    return (
        <div
            style={{
                position: "relative",
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "1px solid rgba(60,242,153,0.35)",
                overflow: "hidden",
                background: "radial-gradient(circle, rgba(60,242,153,0.08) 0%, transparent 70%)",
            }}
        >
            {!reducedMotion && (
                <motion.div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: "50%",
                        height: 1,
                        background:
                            "linear-gradient(90deg, rgba(60,242,153,0.9), rgba(60,242,153,0))",
                        transformOrigin: "0% 50%",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                />
            )}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 3,
                    height: 3,
                    marginTop: -1.5,
                    marginLeft: -1.5,
                    borderRadius: "50%",
                    background: COLORS.green,
                }}
            />
        </div>
    );
}

function useClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

function formatClock(d) {
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
}

/* ------------------------------------------------------------------ */

export default function SysMonitorHUD() {
    const prefersReducedMotion = useReducedMotion();
    const [expanded, setExpanded] = useState(false);
    const [borderFlash, setBorderFlash] = useState(false);
    const [glitching, setGlitching] = useState(false);
    const [logs, setLogs] = useState(() => [
        { id: 0, text: "[SYS] SESSION HANDSHAKE OK", isNew: false },
    ]);
    const logIdRef = useRef(1);
    const scrollRef = useRef(null);
    const signalContainerRef = useRef(null);

    const [metrics, setMetrics] = useState({
        cpu: 34,
        mem: 51,
        celery: 22,
    });

    const clock = useClock();

    /* Flash the border briefly on any interaction */
    const flashBorder = useCallback(() => {
        setBorderFlash(true);
        setTimeout(() => setBorderFlash(false), 400);
    }, []);

    /* Simulated log stream */
    useEffect(() => {
        let timeoutId;
        const pushLog = () => {
            const text = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)];
            setLogs((prev) => {
                const next = [
                    ...prev,
                    { id: logIdRef.current++, text, isNew: !prefersReducedMotion },
                ];
                return next.length > 60 ? next.slice(next.length - 60) : next;
            });
            const delay = 3000 + Math.random() * 2000;
            timeoutId = setTimeout(pushLog, delay);
        };
        timeoutId = setTimeout(pushLog, 3000 + Math.random() * 2000);
        return () => clearTimeout(timeoutId);
    }, [prefersReducedMotion]);

    /* Auto-scroll log console */
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    /* Fluctuate telemetry metrics */
    useEffect(() => {
        const id = setInterval(() => {
            setMetrics((prev) => {
                const jitter = (base, min = 4, max = 96) => {
                    const delta = (Math.random() - 0.5) * 6; // +-3
                    return Math.min(max, Math.max(min, base + delta));
                };
                return {
                    cpu: jitter(prev.cpu),
                    mem: jitter(prev.mem),
                    celery: jitter(prev.celery, 0, 100),
                };
            });
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const handlePurge = useCallback(() => {
        flashBorder();
        setGlitching(true);
        setTimeout(() => setGlitching(false), 380);
        setTimeout(() => {
            setLogs([
                {
                    id: logIdRef.current++,
                    text: "[SYS] LOGS PURGED · SECURE CONSOLE FLUSHED",
                    isNew: !prefersReducedMotion,
                },
            ]);
        }, 180);
    }, [flashBorder, prefersReducedMotion]);

    const handleSignalSync = useCallback(() => {
        flashBorder();
        const el = signalContainerRef.current;
        if (el && el.__triggerSweep) el.__triggerSweep();
        setLogs((prev) => {
            const next = [
                ...prev,
                {
                    id: logIdRef.current++,
                    text: "[NET] SIGNAL SYNC · SCANLINE SWEEP INITIATED",
                    isNew: !prefersReducedMotion,
                },
            ];
            return next.length > 60 ? next.slice(next.length - 60) : next;
        });
    }, [flashBorder, prefersReducedMotion]);

    const clockStr = useMemo(() => formatClock(clock), [clock]);

    return (
        <div
            style={{
                position: "fixed",
                bottom: 20,
                right: 20,
                zIndex: 9999,
                fontFamily: FONT_STACK,
            }}
        >
            <AnimatePresence mode="wait">
                {!expanded ? (
                    <motion.button
                        key="collapsed"
                        layoutId="hud-shell"
                        onClick={() => {
                            setExpanded(true);
                            flashBorder();
                        }}
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                        whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            borderRadius: 14,
                            border: `1px solid ${borderFlash ? COLORS.borderActive : COLORS.border}`,
                            background: COLORS.bg,
                            backdropFilter: "blur(16px)",
                            WebkitBackdropFilter: "blur(16px)",
                            boxShadow: borderFlash ? COLORS.glowActive : COLORS.glow,
                            cursor: "pointer",
                            color: COLORS.textBright,
                            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                        }}
                        aria-label="Expand system monitor HUD"
                    >
                        <StatusDot reducedMotion={prefersReducedMotion} />
                        <span
                            style={{
                                fontSize: 12,
                                letterSpacing: 1,
                                color: COLORS.textDim,
                                minWidth: 58,
                            }}
                        >
                            {clockStr}
                        </span>
                        <RadarSweep reducedMotion={prefersReducedMotion} />
                    </motion.button>
                ) : (
                    <motion.div
                        key="expanded"
                        layoutId="hud-shell"
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        style={{
                            width: 340,
                            borderRadius: 16,
                            border: `1px solid ${borderFlash ? COLORS.borderActive : COLORS.border}`,
                            background: COLORS.bg,
                            backdropFilter: "blur(16px)",
                            WebkitBackdropFilter: "blur(16px)",
                            boxShadow: borderFlash ? COLORS.glowActive : COLORS.glow,
                            overflow: "hidden",
                            position: "relative",
                            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                        }}
                    >
                        {/* Glitch flash overlay */}
                        <AnimatePresence>
                            {glitching && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.6, 0.1, 0.5, 0] }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.38, times: [0, 0.2, 0.4, 0.6, 1] }}
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        zIndex: 50,
                                        pointerEvents: "none",
                                        background:
                                            "repeating-linear-gradient(0deg, rgba(120,170,255,0.25) 0px, rgba(120,170,255,0.05) 2px, transparent 4px)",
                                        mixBlendMode: "screen",
                                    }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Header */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 14px",
                                borderBottom: "1px solid rgba(74,124,247,0.12)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <StatusDot reducedMotion={prefersReducedMotion} />
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        letterSpacing: 1.5,
                                        color: COLORS.textBright,
                                    }}
                                >
                                    SYS.MONITOR
                                </span>
                                <span style={{ fontSize: 10, color: COLORS.textDim }}>
                                    · {clockStr}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setExpanded(false);
                                    flashBorder();
                                }}
                                aria-label="Collapse HUD"
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: COLORS.textDim,
                                    cursor: "pointer",
                                    fontSize: 14,
                                    lineHeight: 1,
                                    padding: 4,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                            {/* Signal canvas */}
                            <div ref={signalContainerRef}>
                                <div
                                    style={{
                                        fontSize: 9.5,
                                        letterSpacing: 1.2,
                                        color: COLORS.textDim,
                                        marginBottom: 6,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Signal Telemetry
                                </div>
                                <SignalCanvas reducedMotion={prefersReducedMotion} />
                            </div>

                            {/* Gauges */}
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                                <Gauge
                                    label="CPU"
                                    value={metrics.cpu}
                                    color={COLORS.blue}
                                    microLabel="Core Temp"
                                    microValue={`${(38 + metrics.cpu / 20).toFixed(0)}°C`}
                                />
                                <Gauge
                                    label="MEM"
                                    value={metrics.mem}
                                    color={COLORS.amber}
                                    microLabel="Alloc"
                                    microValue={`${(metrics.mem * 0.16).toFixed(1)}GB`}
                                />
                                <Gauge
                                    label="CELERY"
                                    value={metrics.celery}
                                    color={COLORS.green}
                                    microLabel="Queue"
                                    microValue={`${Math.round(metrics.celery / 4)} jobs`}
                                />
                            </div>

                            {/* Terminal logs */}
                            <div>
                                <div
                                    style={{
                                        fontSize: 9.5,
                                        letterSpacing: 1.2,
                                        color: COLORS.textDim,
                                        marginBottom: 6,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Console
                                </div>
                                <div
                                    ref={scrollRef}
                                    style={{
                                        height: 110,
                                        overflowY: "auto",
                                        borderRadius: 8,
                                        border: "1px solid rgba(74,124,247,0.12)",
                                        background: "rgba(4,8,14,0.5)",
                                        padding: "8px 10px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 3,
                                    }}
                                >
                                    {logs.map((log) => (
                                        <LogLine key={log.id} text={log.text} isNew={log.isNew} />
                                    ))}
                                </div>
                            </div>

                            {/* Controls */}
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={handlePurge}
                                    style={{
                                        flex: 1,
                                        padding: "8px 0",
                                        borderRadius: 8,
                                        border: `1px solid ${COLORS.red}55`,
                                        background: "rgba(247,90,90,0.08)",
                                        color: COLORS.red,
                                        fontFamily: FONT_STACK,
                                        fontSize: 10.5,
                                        letterSpacing: 1,
                                        cursor: "pointer",
                                        transition: "background 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(247,90,90,0.18)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(247,90,90,0.08)")}
                                >
                                    ⨯ PURGE
                                </button>
                                <button
                                    onClick={handleSignalSync}
                                    style={{
                                        flex: 1,
                                        padding: "8px 0",
                                        borderRadius: 8,
                                        border: `1px solid ${COLORS.blue}55`,
                                        background: "rgba(74,124,247,0.08)",
                                        color: "#9db8f7",
                                        fontFamily: FONT_STACK,
                                        fontSize: 10.5,
                                        letterSpacing: 1,
                                        cursor: "pointer",
                                        transition: "background 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(74,124,247,0.18)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(74,124,247,0.08)")}
                                >
                                    ⟳ SIGNAL SYNC
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}