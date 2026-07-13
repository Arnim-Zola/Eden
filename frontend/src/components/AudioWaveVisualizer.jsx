import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  AudioWaveVisualizer                                                */
/*  Canvas-based neon frequency spectrum for audio-intel dashboards.   */
/*  Drop-in component — self-contained simulated playback state.       */
/* ------------------------------------------------------------------ */

const FONT_STACK =
    "'Geist Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

const COLORS = {
    bg: "rgba(8,12,18,0.7)",
    border: "rgba(74,124,247,0.18)",
    borderActive: "rgba(120,170,255,0.55)",
    glow: "0 16px 40px -10px rgba(74,124,247,0.15)",
    green: "#3CF299",
    cyan: "#4AD8F7",
    indigo: "#242C4A",
    slate: "rgba(140,160,190,0.4)",
    textDim: "rgba(190,205,225,0.55)",
    textBright: "#DCE8FF",
    red: "#F75A5A",
};

const BAR_COUNT = 52;
const TOTAL_DURATION = 105; // seconds, simulated (00:01:45)

function formatTimecode(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
}

/* Deterministic-ish pseudo random per bar for stable "fingerprint" shape */
function seededRand(seed) {
    const x = Math.sin(seed * 999.7) * 43758.5453;
    return x - Math.floor(x);
}

export default function AudioWaveVisualizer() {
    const prefersReducedMotion = useReducedMotion();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const rafRef = useRef(null);
    const mouseXRef = useRef(null); // fraction 0..1 or null
    const barLevelsRef = useRef(new Array(BAR_COUNT).fill(0.1));
    const tRef = useRef(0);
    const playbackRef = useRef(0); // seconds, mutable for rAF loop
    const playingRef = useRef(false);

    const [playing, setPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(14); // start mid-clip like example
    const [dbLevel, setDbLevel] = useState(-18);
    const [hoveredBar, setHoveredBar] = useState(null);
    const [scrubHover, setScrubHover] = useState(false);

    playingRef.current = playing;
    playbackRef.current = playbackTime;

    /* --------------------------- Canvas draw loop --------------------------- */
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

        let lastTime = performance.now();

        const draw = (now) => {
            const dt = Math.min(48, now - lastTime);
            lastTime = now;
            const speedMul = prefersReducedMotion ? 0.35 : 1;
            tRef.current += dt * 0.0016 * speedMul;

            // advance simulated playback
            if (playingRef.current) {
                playbackRef.current = Math.min(
                    TOTAL_DURATION,
                    playbackRef.current + (dt / 1000) * speedMul
                );
            }

            ctx.clearRect(0, 0, width, height);

            /* --- background grid with dB lines --- */
            const dbLines = [
                { label: "0dB", frac: 0.08 },
                { label: "-10dB", frac: 0.42 },
                { label: "-20dB", frac: 0.78 },
            ];
            ctx.font = `9px ${FONT_STACK}`;
            dbLines.forEach(({ label, frac }) => {
                const y = height * frac;
                ctx.strokeStyle = "rgba(74,124,247,0.09)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
                ctx.fillStyle = "rgba(140,160,190,0.35)";
                ctx.fillText(label, 4, y - 3);
            });
            // vertical time-interval ticks
            for (let x = 0; x < width; x += width / 16) {
                ctx.strokeStyle = "rgba(74,124,247,0.05)";
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }

            /* --- frequency bars --- */
            const gap = 3;
            const barWidth = width / BAR_COUNT - gap;
            const idleBase = 0.08;
            const magnetRadius = width * 0.22;

            const levels = barLevelsRef.current;
            let peakSum = 0;

            for (let i = 0; i < BAR_COUNT; i++) {
                const x = i * (width / BAR_COUNT) + gap / 2;
                const barCenter = x + barWidth / 2;

                // base organic movement (breathing idle vs playing pulse)
                const seed = i * 7.13;
                const speed = playingRef.current ? 3.2 : 0.9;
                const wobble =
                    Math.sin(tRef.current * speed + seed) * 0.5 +
                    Math.sin(tRef.current * speed * 1.7 + seed * 2.1) * 0.3 +
                    seededRand(i) * 0.2;

                let target = playingRef.current
                    ? idleBase + Math.abs(wobble) * 0.85
                    : idleBase + Math.abs(wobble) * 0.18;

                // magnetic cursor proximity boost
                if (mouseXRef.current !== null) {
                    const cursorX = mouseXRef.current * width;
                    const dist = Math.abs(barCenter - cursorX);
                    if (dist < magnetRadius) {
                        const proximity = 1 - dist / magnetRadius;
                        target += proximity * proximity * 0.75;
                    }
                }

                target = Math.min(1, target);
                // smooth toward target
                levels[i] += (target - levels[i]) * (playingRef.current ? 0.18 : 0.08);
                peakSum += levels[i];

                const barHeight = Math.max(2, levels[i] * (height * 0.82));
                const y = height - barHeight - height * 0.06;

                // color: neon green/cyan at top fading to deep indigo/slate at base
                const grad = ctx.createLinearGradient(0, y, 0, height);
                grad.addColorStop(0, COLORS.cyan);
                grad.addColorStop(0.35, COLORS.green);
                grad.addColorStop(1, "rgba(36,44,74,0.25)");

                ctx.fillStyle = grad;
                ctx.shadowColor = levels[i] > 0.55 ? COLORS.cyan : COLORS.green;
                ctx.shadowBlur = 6 + levels[i] * 10;

                const radius = Math.min(3, barWidth / 2);
                roundRectPath(ctx, x, y, barWidth, barHeight, radius);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            // approximate dB readout from average bar level (only update state occasionally)
            const avgLevel = peakSum / BAR_COUNT;
            const approxDb = Math.round(-30 + avgLevel * 30);

            if (frameCounter.current % 6 === 0) {
                setDbLevel(approxDb);
                if (playingRef.current) {
                    setPlaybackTime(playbackRef.current);
                    if (playbackRef.current >= TOTAL_DURATION) {
                        setPlaying(false);
                    }
                }
            }
            frameCounter.current++;

            rafRef.current = requestAnimationFrame(draw);
        };

        const frameCounter = { current: 0 };
        rafRef.current = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefersReducedMotion]);

    const handleMouseMove = useCallback((e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const fracX = (e.clientX - rect.left) / rect.width;
        mouseXRef.current = Math.min(1, Math.max(0, fracX));
        const barIdx = Math.floor(mouseXRef.current * BAR_COUNT);
        setHoveredBar(barIdx);
    }, []);

    const handleMouseLeave = useCallback(() => {
        mouseXRef.current = null;
        setHoveredBar(null);
    }, []);

    const handleScrub = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        setPlaybackTime(frac * TOTAL_DURATION);
    }, []);

    const togglePlay = useCallback(() => {
        setPlaying((p) => !p);
    }, []);

    const progressFrac = playbackTime / TOTAL_DURATION;

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 620,
                borderRadius: 16,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bg,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                boxShadow: COLORS.glow,
                fontFamily: FONT_STACK,
                color: COLORS.textBright,
                padding: 14,
                boxSizing: "border-box",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PulseDot playing={playing} reducedMotion={prefersReducedMotion} />
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.2 }}>
                        AUDIO.INTEL SPECTRUM
                    </span>
                </div>
                <span style={{ fontSize: 9.5, color: COLORS.textDim, letterSpacing: 1 }}>
                    TARGET_MEDIA_04.WAV
                </span>
            </div>

            {/* Body: left meter, canvas, right meta */}
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                {/* Left: dB SPL meter */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: 44,
                        padding: "6px 0",
                    }}
                >
                    <span style={{ fontSize: 8.5, color: COLORS.textDim, letterSpacing: 0.5 }}>
                        DB_SPL
                    </span>
                    <div
                        style={{
                            flex: 1,
                            width: 6,
                            margin: "6px 0",
                            borderRadius: 3,
                            background: "rgba(255,255,255,0.06)",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <motion.div
                            animate={{ height: `${Math.min(100, Math.max(4, ((dbLevel + 30) / 30) * 100))}%` }}
                            transition={{ duration: 0.25 }}
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: `linear-gradient(180deg, ${COLORS.cyan}, ${COLORS.green})`,
                                boxShadow: `0 0 6px ${COLORS.green}`,
                            }}
                        />
                    </div>
                    <span
                        style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: dbLevel > -6 ? COLORS.red : COLORS.textBright,
                        }}
                    >
                        {dbLevel}
                    </span>
                </div>

                {/* Center: canvas visualizer */}
                <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        position: "relative",
                        flex: 1,
                        height: 150,
                        borderRadius: 10,
                        overflow: "hidden",
                        border: "1px solid rgba(74,124,247,0.15)",
                        background: "rgba(4,8,14,0.55)",
                    }}
                >
                    <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
                    {hoveredBar !== null && (
                        <div
                            style={{
                                position: "absolute",
                                top: 4,
                                left: 6,
                                fontSize: 8.5,
                                color: COLORS.cyan,
                                letterSpacing: 0.5,
                                pointerEvents: "none",
                            }}
                        >
                            BAND_{String(hoveredBar).padStart(2, "0")}
                        </div>
                    )}
                </div>

                {/* Right: sample rate / channel status */}
                <div
                    style={{
                        width: 92,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        fontSize: 8.8,
                        color: COLORS.textDim,
                        lineHeight: 1.6,
                        textAlign: "right",
                    }}
                >
                    <div>
                        <div style={{ color: COLORS.textBright, fontWeight: 600 }}>48.0 kHz</div>
                        <div>SAMPLE RATE</div>
                    </div>
                    <div>
                        <div style={{ color: COLORS.textBright, fontWeight: 600 }}>MONO</div>
                        <div>CHANNEL</div>
                    </div>
                    <div>
                        <div style={{ color: COLORS.green, fontWeight: 600 }}>E2E INTEL</div>
                        <div>CHANNEL SEC.</div>
                    </div>
                </div>
            </div>

            {/* Bottom: transport controls + scrub bar */}
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <button
                    onClick={togglePlay}
                    aria-label={playing ? "Pause playback" : "Play playback"}
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: playing ? "rgba(60,242,153,0.12)" : "rgba(74,124,247,0.08)",
                        color: playing ? COLORS.green : COLORS.textBright,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        fontSize: 12,
                    }}
                >
                    {playing ? "❚❚" : "►"}
                </button>

                <div style={{ flex: 1 }}>
                    <div
                        onClick={handleScrub}
                        onMouseEnter={() => setScrubHover(true)}
                        onMouseLeave={() => setScrubHover(false)}
                        style={{
                            position: "relative",
                            height: scrubHover ? 8 : 5,
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.07)",
                            cursor: "pointer",
                            transition: "height 0.15s ease",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: `${progressFrac * 100}%`,
                                borderRadius: 4,
                                background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.cyan})`,
                                boxShadow: `0 0 6px rgba(60,242,153,0.5)`,
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: `${progressFrac * 100}%`,
                                width: 10,
                                height: 10,
                                marginTop: -5,
                                marginLeft: -5,
                                borderRadius: "50%",
                                background: COLORS.textBright,
                                boxShadow: `0 0 6px ${COLORS.cyan}`,
                                opacity: scrubHover ? 1 : 0,
                                transition: "opacity 0.15s ease",
                            }}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 5,
                            fontSize: 9.5,
                            color: COLORS.textDim,
                            letterSpacing: 0.5,
                        }}
                    >
                        <span style={{ color: COLORS.textBright }}>
                            {formatTimecode(playbackTime)}
                        </span>
                        <span>{formatTimecode(TOTAL_DURATION)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* --- helpers --- */

function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function PulseDot({ playing, reducedMotion }) {
    const color = playing ? COLORS.green : "rgba(140,160,190,0.6)";
    return (
        <div style={{ position: "relative", width: 8, height: 8 }}>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                }}
            />
            {playing && !reducedMotion && (
                <motion.div
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: color,
                    }}
                    animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </div>
    );
}