/**
 * CommandPalette.jsx — Eden AI · Step 9 "Command Palette"
 * God Mode+ revision: holographic glass slab, parallax tilt, energy-sweep
 * active rows, radar-blip risk indicators, terminal-decode search, and
 * mechanical-key footer. Triggered by ⌘K / Ctrl+K. Raycast/Linear, pushed further.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ─── Palette tokens ────────────────────────────────────────────────────────
const ACCENT = "#4A7CF7";
const ACCENT_SOFT = "rgba(74,124,247,0.35)";
const INK = "#E8E6E0";
const RISK_COLOR = { high: "#EF4444", medium: "#F97316", low: "#22C55E" };

// ─── Icons ────────────────────────────────────────────────────────────────────
function PlusIcon({ active }) {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke={active ? ACCENT : "rgba(232,230,224,0.4)"} strokeWidth="1.2" />
            <path d="M7 4.5V9.5M4.5 7H9.5" stroke={active ? ACCENT : "rgba(232,230,224,0.4)"} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}
function TrashIcon({ active }) {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 4H11.5M5 4V2.5H9V4M5.5 6.5V10M8.5 6.5V10M3.5 4L4.5 11.5H9.5L10.5 4" stroke={active ? ACCENT : "rgba(232,230,224,0.4)"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function SearchIcon({ focused }) {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ filter: focused ? `drop-shadow(0 0 3px ${ACCENT_SOFT})` : "none", transition: "filter 0.2s" }}>
            <circle cx="6" cy="6" r="4.5" stroke={focused ? ACCENT : "rgba(232,230,224,0.25)"} strokeWidth="1.2" style={{ transition: "stroke 0.2s" }} />
            <path d="M9.5 9.5L12 12" stroke={focused ? ACCENT : "rgba(232,230,224,0.25)"} strokeWidth="1.2" strokeLinecap="round" style={{ transition: "stroke 0.2s" }} />
        </svg>
    );
}

// ─── Radar-blip risk indicator ───────────────────────────────────────────────
function RiskDot({ level, isActive }) {
    const color = RISK_COLOR[level] ?? "#6B7280";
    return (
        <span style={{ position: "relative", width: 12, height: 12, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <motion.span
                animate={{
                    scale: isActive ? [1, 2.2, 1] : [1, 1.8, 1],
                    opacity: isActive ? [0.55, 0, 0.55] : [0.35, 0, 0.35],
                }}
                transition={{ duration: isActive ? 1.1 : 1.8, repeat: Infinity, ease: "easeOut" }}
                style={{
                    position: "absolute",
                    width: 6, height: 6, borderRadius: "50%",
                    border: `1px solid ${color}`,
                }}
            />
            <span style={{
                width: 6, height: 6, borderRadius: "50%", background: color,
                boxShadow: isActive ? `0 0 8px 2px ${color}aa` : `0 0 4px ${color}66`,
                transition: "box-shadow 0.2s",
            }} />
        </span>
    );
}

function RelTime({ ts }) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    return <>{d > 0 ? `${d}d` : h > 0 ? `${h}h` : m > 0 ? `${m}m` : "now"}</>;
}

// ─── Row ─────────────────────────────────────────────────────────────────────
function Row({ item, isActive, onClick, onMouseEnter }) {
    return (
        <motion.div
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            animate={{
                scale: isActive ? 1.015 : 1,
                x: isActive ? 2 : 0,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderRadius: 6,
                cursor: "pointer",
                overflow: "hidden",
                borderLeft: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
                background: isActive ? "rgba(74,124,247,0.12)" : "transparent",
                boxShadow: isActive ? `0 0 0 1px ${ACCENT_SOFT}, 0 4px 18px -6px rgba(74,124,247,0.5)` : "none",
            }}
        >
            {/* energy-grid sweep */}
            {isActive && (
                <motion.span
                    key="sweep"
                    initial={{ x: "-120%" }}
                    animate={{ x: "220%" }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: "absolute",
                        top: 0, bottom: 0, width: "40%",
                        background: "linear-gradient(90deg, transparent, rgba(74,124,247,0.16), transparent)",
                        pointerEvents: "none",
                    }}
                />
            )}
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center", position: "relative", zIndex: 1 }}>
                {item.icon}
            </span>
            <span style={{
                fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                fontSize: 13,
                color: isActive ? "#FFFFFF" : "rgba(232,230,224,0.75)",
                textShadow: isActive ? `0 0 12px ${ACCENT_SOFT}` : "none",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                position: "relative",
                zIndex: 1,
                transition: "color 0.15s, text-shadow 0.15s",
            }}>
                {item.label}
            </span>
            {item.meta && (
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 10,
                    color: isActive ? "rgba(232,230,224,0.55)" : "rgba(232,230,224,0.25)",
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 1,
                }}>
                    {item.meta}
                </span>
            )}
            {item.shortcut && (
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 10,
                    color: isActive ? ACCENT : "rgba(232,230,224,0.3)",
                    background: isActive ? "rgba(74,124,247,0.14)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isActive ? ACCENT_SOFT : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 4,
                    padding: "1px 5px",
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 1,
                }}>
                    {item.shortcut}
                </span>
            )}
        </motion.div>
    );
}

// ─── Group Header ────────────────────────────────────────────────────────────
function GroupHeader({ label }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px 4px",
        }}>
            <span style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "rgba(232,230,224,0.25)",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
            }}>
                {label}
            </span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }} />
        </div>
    );
}

// ─── Terminal-decode ghost text (shown behind empty, unfocused input) ───────
const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#________";
function DecodeText({ text, active }) {
    const [display, setDisplay] = useState(text);
    const frame = useRef(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!active) { setDisplay(text); return; }
        frame.current = 0;
        const totalFrames = 18;
        const step = () => {
            frame.current += 1;
            const progress = frame.current / totalFrames;
            const revealCount = Math.floor(progress * text.length);
            let out = "";
            for (let i = 0; i < text.length; i++) {
                if (i < revealCount) out += text[i];
                else if (text[i] === " ") out += " ";
                else out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            }
            setDisplay(out);
            if (frame.current < totalFrames) {
                rafRef.current = setTimeout(step, 28);
            } else {
                setDisplay(text);
            }
        };
        step();
        return () => clearTimeout(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, text]);

    return <>{display}</>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CommandPalette({ isOpen, onClose, operations = [], onClearHistory }) {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const panelRef = useRef(null);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const [decodeKey, setDecodeKey] = useState(0);

    // ── Parallax tilt via spring-smoothed mouse position ──
    const mvX = useMotionValue(0);
    const mvY = useMotionValue(0);
    const springX = useSpring(mvX, { stiffness: 150, damping: 20, mass: 0.4 });
    const springY = useSpring(mvY, { stiffness: 150, damping: 20, mass: 0.4 });
    const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4]);
    const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);
    const glowX = useTransform(springX, [-0.5, 0.5], ["20%", "80%"]);
    const glowY = useTransform(springY, [-0.5, 0.5], ["10%", "60%"]);

    const handlePanelMouseMove = useCallback((e) => {
        const rect = panelRef.current?.getBoundingClientRect();
        if (!rect) return;
        mvX.set((e.clientX - rect.left) / rect.width - 0.5);
        mvY.set((e.clientY - rect.top) / rect.height - 0.5);
    }, [mvX, mvY]);
    const handlePanelMouseLeave = useCallback(() => {
        mvX.set(0);
        mvY.set(0);
    }, [mvX, mvY]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setActiveIndex(0);
            setDecodeKey(k => k + 1);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Build flat item list (filtered)
    const { groups, flatItems } = useMemo(() => {
        const q = query.toLowerCase().trim();

        const actions = [
            {
                id: "new-analysis",
                label: "New Analysis",
                icon: <PlusIcon />,
                shortcut: "↵",
                action: () => { navigate("/"); onClose(); },
            },
            {
                id: "clear-history",
                label: "Clear History",
                icon: <TrashIcon />,
                action: () => { onClearHistory?.(); onClose(); },
            },
        ].filter(i => !q || i.label.toLowerCase().includes(q));

        const ops = operations
            .filter(op => !q || op.label.toLowerCase().includes(q))
            .map(op => ({
                id: op.id,
                label: op.label,
                icon: <RiskDot level={op.riskLevel} />,
                meta: op.timestamp ? <RelTime ts={op.timestamp} /> : null,
                action: () => { navigate(`/operation/${op.id}`); onClose(); },
            }));

        const groups = [];
        if (actions.length) groups.push({ header: "Actions", items: actions });
        if (ops.length || !q) groups.push({ header: "Recent Operations", items: ops });

        const flatItems = groups.flatMap(g => g.items);
        return { groups, flatItems };
    }, [query, operations, navigate, onClose, onClearHistory]);

    // Keep activeIndex in bounds when list changes
    useEffect(() => {
        setActiveIndex(i => Math.min(i, Math.max(flatItems.length - 1, 0)));
    }, [flatItems.length]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!isOpen) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(i => (i + 1) % Math.max(flatItems.length, 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(i => (i - 1 + Math.max(flatItems.length, 1)) % Math.max(flatItems.length, 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            flatItems[activeIndex]?.action();
        } else if (e.key === "Escape") {
            onClose();
        }
    }, [isOpen, flatItems, activeIndex, onClose]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Running index across groups for active tracking
    let runningIndex = 0;

    // Re-run active-row icons with isActive awareness (icons defined inline above
    // don't know activeIndex at creation time, so we re-map here for Actions group only)
    const decoratedGroups = groups.map(group => ({
        ...group,
        items: group.items,
    }));

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="cp-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={onClose}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.65)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        zIndex: 500,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: "18vh",
                        perspective: 1200,
                    }}
                >
                    <motion.div
                        key="cp-panel"
                        ref={panelRef}
                        onMouseMove={handlePanelMouseMove}
                        onMouseLeave={handlePanelMouseLeave}
                        initial={{ opacity: 0, y: -16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: 560,
                            rotateX,
                            rotateY,
                            transformStyle: "preserve-3d",
                            background: "linear-gradient(180deg, rgba(17,17,17,0.92), rgba(10,10,10,0.96))",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px -20px ${ACCENT_SOFT}`,
                        }}
                    >
                        {/* holographic mouse-follow glow */}
                        <motion.div
                            aria-hidden
                            style={{
                                position: "absolute",
                                left: glowX,
                                top: glowY,
                                width: 320,
                                height: 320,
                                marginLeft: -160,
                                marginTop: -160,
                                background: `radial-gradient(circle, ${ACCENT_SOFT} 0%, transparent 70%)`,
                                opacity: 0.25,
                                pointerEvents: "none",
                                filter: "blur(10px)",
                            }}
                        />
                        {/* scanning grid overlay */}
                        <div aria-hidden style={{
                            position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.05,
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                            backgroundSize: "24px 24px",
                        }} />
                        <motion.div
                            aria-hidden
                            initial={{ y: "-100%" }}
                            animate={{ y: "100%" }}
                            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                            style={{
                                position: "absolute", left: 0, right: 0, height: "30%",
                                background: "linear-gradient(180deg, transparent, rgba(74,124,247,0.06), transparent)",
                                pointerEvents: "none",
                            }}
                        />

                        {/* ── Search Input ── */}
                        <div style={{
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "12px 14px",
                            borderBottom: `1px solid ${isFocused ? ACCENT_SOFT : "rgba(255,255,255,0.06)"}`,
                            transition: "border-color 0.25s",
                        }}>
                            {isFocused && (
                                <motion.div
                                    aria-hidden
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                    style={{
                                        position: "absolute", inset: 0,
                                        boxShadow: `inset 0 0 18px -6px ${ACCENT_SOFT}`,
                                        pointerEvents: "none",
                                    }}
                                />
                            )}
                            <SearchIcon focused={isFocused} />
                            <div style={{ position: "relative", flex: 1 }}>
                                {query.length === 0 && (
                                    <span style={{
                                        position: "absolute",
                                        left: 0, top: "50%", transform: "translateY(-50%)",
                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                        fontSize: 13,
                                        color: "rgba(232,230,224,0.28)",
                                        pointerEvents: "none",
                                        whiteSpace: "nowrap",
                                    }}>
                                        <DecodeText key={decodeKey} text="Search operations or run a command…" active={isOpen} />
                                    </span>
                                )}
                                <input
                                    ref={inputRef}
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder=""
                                    style={{
                                        width: "100%",
                                        background: "transparent",
                                        border: "none",
                                        outline: "none",
                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                        fontSize: 13,
                                        color: "#E8E6E0",
                                        caretColor: ACCENT,
                                    }}
                                />
                            </div>
                            <span style={{
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                fontSize: 10,
                                color: "rgba(232,230,224,0.2)",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 4,
                                padding: "2px 6px",
                                flexShrink: 0,
                            }}>
                                ⌘K
                            </span>
                        </div>

                        {/* ── Results ── */}
                        <div
                            ref={listRef}
                            style={{
                                position: "relative",
                                maxHeight: 360,
                                overflowY: "auto",
                                padding: "4px 6px 8px",
                            }}
                        >
                            {decoratedGroups.map((group) => (
                                <div key={group.header}>
                                    <GroupHeader label={group.header} />
                                    {group.items.length === 0 ? (
                                        <div style={{
                                            padding: "8px 14px",
                                            fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                            fontSize: 12,
                                            color: "rgba(232,230,224,0.2)",
                                        }}>
                                            No recent operations
                                        </div>
                                    ) : (
                                        group.items.map((item) => {
                                            const idx = runningIndex++;
                                            const isActive = activeIndex === idx;
                                            return (
                                                <Row
                                                    key={item.id}
                                                    item={{
                                                        ...item,
                                                        icon: item.id === "new-analysis"
                                                            ? <PlusIcon active={isActive} />
                                                            : item.id === "clear-history"
                                                                ? <TrashIcon active={isActive} />
                                                                : item.icon?.type === RiskDot
                                                                    ? <RiskDot level={item.icon.props.level} isActive={isActive} />
                                                                    : item.icon,
                                                    }}
                                                    isActive={isActive}
                                                    onClick={item.action}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                />
                                            );
                                        })
                                    )}
                                </div>
                            ))}

                            {flatItems.length === 0 && query && (
                                <div style={{
                                    padding: "20px 14px",
                                    textAlign: "center",
                                    fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                    fontSize: 13,
                                    color: "rgba(232,230,224,0.2)",
                                }}>
                                    No results for &ldquo;{query}&rdquo;
                                </div>
                            )}
                        </div>

                        {/* ── Mechanical footer ── */}
                        <div style={{
                            position: "relative",
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                            padding: "9px 14px",
                            display: "flex",
                            gap: 16,
                            background: "linear-gradient(180deg, rgba(255,255,255,0.015), transparent)",
                        }}>
                            {[["↑↓", "navigate"], ["↵", "select"], ["esc", "close"]].map(([key, label]) => (
                                <span key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <motion.span
                                        whileHover={{ y: 1 }}
                                        whileTap={{ y: 2, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)" }}
                                        style={{
                                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                            fontSize: 10,
                                            color: "rgba(232,230,224,0.35)",
                                            background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
                                            border: "1px solid rgba(255,255,255,0.09)",
                                            borderBottom: "2px solid rgba(0,0,0,0.4)",
                                            borderRadius: 4,
                                            padding: "2px 6px",
                                            boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 3px rgba(0,0,0,0.3)",
                                            cursor: "default",
                                        }}
                                    >{key}</motion.span>
                                    <span style={{
                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                        fontSize: 9,
                                        color: "rgba(232,230,224,0.2)",
                                        letterSpacing: "0.06em",
                                    }}>{label}</span>
                                </span>
                            ))}
                            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                                <motion.span
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1.6, repeat: Infinity }}
                                    style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
                                />
                                <span style={{
                                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                    fontSize: 9,
                                    color: "rgba(232,230,224,0.18)",
                                    letterSpacing: "0.08em",
                                }}>LIVE</span>
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}