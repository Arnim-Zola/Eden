import React, { useState, useRef, useCallback, useMemo } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  IntelNetworkGraph                                                  */
/*  Tactical relationship graph: Target Media -> Pipelines -> Claims.  */
/*  Drop-in component with self-contained mock data.                   */
/* ------------------------------------------------------------------ */

const FONT_STACK =
    "'Geist Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

const COLORS = {
    bg: "rgba(8,12,18,0.72)",
    border: "rgba(74,124,247,0.18)",
    glow: "0 16px 40px -10px rgba(74,124,247,0.15)",
    grid: "rgba(74,124,247,0.05)",
    blue: "#4A7CF7",
    amber: "#F7B84A",
    purple: "#B084F7",
    red: "#F75A5A",
    green: "#3CF299",
    textDim: "rgba(190,205,225,0.55)",
    textBright: "#DCE8FF",
};

/* --------------------------- Mock data graph --------------------------- */

const NODES = [
    {
        id: "core",
        type: "core",
        label: "TARGET MEDIA",
        icon: "◎",
        color: COLORS.blue,
        x: 40,
        y: 220,
        meta: {
            Source: "Instagram_Reel_04.mp4",
            Duration: "00:01:45",
            Hash: "a3f9…c210",
            Ingested: "2026-07-14 03:12Z",
        },
    },
    {
        id: "ocr",
        type: "pipeline",
        label: "OCR PARSER",
        icon: "▤",
        color: COLORS.amber,
        x: 270,
        y: 80,
        meta: {
            Status: "COMPLETE",
            "Frames Scanned": "1,204",
            "Text Regions": "18",
            Confidence: "94%",
        },
    },
    {
        id: "audio",
        type: "pipeline",
        label: "AUDIO TRANSCRIBER",
        icon: "◈",
        color: COLORS.amber,
        x: 270,
        y: 220,
        meta: {
            Status: "COMPLETE",
            "Sample Rate": "48.0 kHz",
            Channels: "MONO",
            Confidence: "89%",
        },
    },
    {
        id: "meta",
        type: "pipeline",
        label: "META EXTRACTOR",
        icon: "▧",
        color: COLORS.purple,
        x: 270,
        y: 360,
        meta: {
            Status: "COMPLETE",
            EXIF: "STRIPPED",
            Geotag: "NOT FOUND",
            "Upload Origin": "UNVERIFIED",
        },
    },
    {
        id: "claim1",
        type: "claim",
        risk: "high",
        label: "CLAIM #01",
        icon: "▲",
        color: COLORS.red,
        x: 500,
        y: 120,
        meta: {
            Verdict: "HIGH RISK",
            Confidence: "98%",
            Source: "Instagram_Reel_04",
            Pipeline: "AUDIO + META",
        },
    },
    {
        id: "claim2",
        type: "claim",
        risk: "verified",
        label: "CLAIM #02",
        icon: "✓",
        color: COLORS.green,
        x: 500,
        y: 240,
        meta: {
            Verdict: "VERIFIED",
            Confidence: "91%",
            Source: "Instagram_Reel_04",
            Pipeline: "OCR",
        },
    },
    {
        id: "claim3",
        type: "claim",
        risk: "high",
        label: "CLAIM #03",
        icon: "▲",
        color: COLORS.red,
        x: 500,
        y: 360,
        meta: {
            Verdict: "HIGH RISK",
            Confidence: "82%",
            Source: "Instagram_Reel_04",
            Pipeline: "META",
        },
    },
];

const EDGES = [
    { from: "core", to: "ocr" },
    { from: "core", to: "audio" },
    { from: "core", to: "meta" },
    { from: "ocr", to: "claim2" },
    { from: "audio", to: "claim1" },
    { from: "meta", to: "claim3" },
];

/* ------------------------------------------------------------------ */

export default function IntelNetworkGraph() {
    const prefersReducedMotion = useReducedMotion();
    const containerRef = useRef(null);
    const [positions, setPositions] = useState(() =>
        Object.fromEntries(NODES.map((n) => [n.id, { x: n.x, y: n.y }]))
    );
    const [hoveredId, setHoveredId] = useState(null);
    const [parallax, setParallax] = useState({ x: 0, y: 0 });

    const handleMouseMove = useCallback((e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const fracX = (e.clientX - rect.left) / rect.width - 0.5;
        const fracY = (e.clientY - rect.top) / rect.height - 0.5;
        setParallax({ x: fracX * -10, y: fracY * -10 });
    }, []);

    const handleDrag = useCallback((id, _, info) => {
        setPositions((prev) => ({
            ...prev,
            [id]: {
                x: prev[id].x + info.delta.x,
                y: prev[id].y + info.delta.y,
            },
        }));
    }, []);

    const nodeById = useMemo(
        () => Object.fromEntries(NODES.map((n) => [n.id, n])),
        []
    );

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: 460,
                borderRadius: 16,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bg,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                boxShadow: COLORS.glow,
                overflowX: "auto",
                overflowY: "hidden",
                fontFamily: FONT_STACK,
            }}
        >
            <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setParallax({ x: 0, y: 0 })}
                style={{
                    position: "relative",
                    width: "100%",
                    minWidth: 700,
                    height: "100%",
                }}
            >
            {/* Header */}
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 16,
                    zIndex: 5,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <div
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: COLORS.green,
                        boxShadow: `0 0 6px ${COLORS.green}`,
                    }}
                />
                <span
                    style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        letterSpacing: 1.4,
                        color: COLORS.textBright,
                    }}
                >
                    INTEL.NETWORK GRAPH
                </span>
            </div>
            <div
                style={{
                    position: "absolute",
                    top: 13,
                    right: 16,
                    zIndex: 5,
                    fontSize: 9.5,
                    color: COLORS.textDim,
                    letterSpacing: 0.5,
                }}
            >
                {NODES.length} NODES · {EDGES.length} LINKS
            </div>

            {/* Parallax grid background */}
            <motion.svg
                width="100%"
                height="100%"
                style={{ position: "absolute", inset: 0 }}
                animate={
                    prefersReducedMotion
                        ? {}
                        : { x: parallax.x, y: parallax.y }
                }
                transition={{ type: "spring", stiffness: 60, damping: 20 }}
            >
                <defs>
                    <pattern id="ing-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                        <path
                            d="M 34 0 L 0 0 0 34"
                            fill="none"
                            stroke={COLORS.grid}
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>
                <rect
                    x="-40"
                    y="-40"
                    width="calc(100% + 80px)"
                    height="calc(100% + 80px)"
                    fill="url(#ing-grid)"
                />
            </motion.svg>

            {/* Edges */}
            <svg
                width="100%"
                height="100%"
                style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
                <defs>
                    <filter id="ing-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {EDGES.map((edge, i) => {
                    const from = positions[edge.from];
                    const to = positions[edge.to];
                    const fromNode = nodeById[edge.from];
                    const toNode = nodeById[edge.to];
                    if (!from || !to) return null;

                    // offsets to connect from node edge rather than center
                    const x1 = from.x + 84;
                    const y1 = from.y + 24;
                    const x2 = to.x;
                    const y2 = to.y + 24;
                    const midX = (x1 + x2) / 2;
                    const pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

                    return (
                        <g key={i}>
                            <path
                                d={pathD}
                                fill="none"
                                stroke="rgba(120,150,200,0.14)"
                                strokeWidth="1.5"
                            />
                            <motion.path
                                d={pathD}
                                fill="none"
                                stroke={toNode.color}
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeDasharray="6 14"
                                filter="url(#ing-glow)"
                                animate={
                                    prefersReducedMotion
                                        ? {}
                                        : { strokeDashoffset: [0, -40] }
                                }
                                transition={{
                                    duration: 1.4,
                                    repeat: Infinity,
                                    ease: "linear",
                                    delay: i * 0.12,
                                }}
                                style={{ opacity: 0.85 }}
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Nodes */}
            {NODES.map((node, i) => {
                const pos = positions[node.id];
                return (
                    <GraphNode
                        key={node.id}
                        node={node}
                        pos={pos}
                        index={i}
                        hovered={hoveredId === node.id}
                        onHoverStart={() => setHoveredId(node.id)}
                        onHoverEnd={() => setHoveredId(null)}
                        onDrag={(e, info) => handleDrag(node.id, e, info)}
                        containerRef={containerRef}
                        reducedMotion={prefersReducedMotion}
                    />
                );
            })}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function GraphNode({
    node,
    pos,
    index,
    hovered,
    onHoverStart,
    onHoverEnd,
    onDrag,
    containerRef,
    reducedMotion,
}) {
    const isCore = node.type === "core";
    const isClaim = node.type === "claim";

    return (
        <motion.div
            drag
            dragConstraints={containerRef}
            dragMomentum={false}
            onDrag={onDrag}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
            initial={
                reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.4, x: pos.x, y: pos.y }
            }
            animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: reducedMotion ? 0 : index * 0.09,
            }}
            whileDrag={{ scale: 1.06, zIndex: 30 }}
            whileHover={{ scale: 1.04 }}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 168,
                cursor: "grab",
                zIndex: hovered ? 20 : 10,
                touchAction: "none",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: `1px solid ${hovered ? node.color : "rgba(255,255,255,0.08)"}`,
                    background: "rgba(10,14,22,0.85)",
                    boxShadow: hovered
                        ? `0 0 18px ${node.color}66, inset 0 0 12px ${node.color}22`
                        : `0 0 10px ${node.color}22`,
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
            >
                <div
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        flexShrink: 0,
                        color: node.color,
                        border: `1px solid ${node.color}55`,
                        background: `${node.color}14`,
                        textShadow: `0 0 6px ${node.color}`,
                    }}
                >
                    {node.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.6,
                            color: COLORS.textBright,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {node.label}
                    </div>
                    <div
                        style={{
                            fontSize: 8,
                            letterSpacing: 0.8,
                            color: node.color,
                            textTransform: "uppercase",
                            marginTop: 1,
                        }}
                    >
                        {isCore ? "SOURCE" : isClaim ? node.risk : "PIPELINE"}
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: pos.y > 220 ? -6 : 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: pos.y > 220 ? -6 : 6, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: "absolute",
                            top: pos.y > 220 ? "auto" : "calc(100% + 8px)",
                            bottom: pos.y > 220 ? "calc(100% + 8px)" : "auto",
                            left: isClaim ? "auto" : 0,
                            right: isClaim ? 0 : "auto",
                            width: 200,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${node.color}55`,
                            background: "rgba(6,10,16,0.92)",
                            backdropFilter: "blur(10px)",
                            boxShadow: `0 12px 30px -8px ${node.color}44, 0 0 20px ${node.color}22`,
                            zIndex: 40,
                            pointerEvents: "none",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 9,
                                letterSpacing: 1,
                                color: node.color,
                                marginBottom: 6,
                                borderBottom: `1px solid ${node.color}33`,
                                paddingBottom: 5,
                            }}
                        >
                            ▣ INTEL METADATA
                        </div>
                        {Object.entries(node.meta).map(([k, v]) => (
                            <div
                                key={k}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    fontSize: 9.5,
                                    marginBottom: 3,
                                }}
                            >
                                <span style={{ color: COLORS.textDim }}>{k}</span>
                                <span
                                    style={{
                                        color: COLORS.textBright,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {v}
                                </span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
// Tooltip position safety bounds.