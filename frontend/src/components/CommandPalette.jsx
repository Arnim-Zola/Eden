/**
 * CommandPalette.jsx — Eden AI · Step 9 "Command Palette"
 * Triggered by ⌘K / Ctrl+K. Raycast/Linear style.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ─── Icons ────────────────────────────────────────────────────────────────────
function PlusIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="rgba(232,230,224,0.4)" strokeWidth="1.2" />
            <path d="M7 4.5V9.5M4.5 7H9.5" stroke="rgba(232,230,224,0.4)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}
function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 4H11.5M5 4V2.5H9V4M5.5 6.5V10M8.5 6.5V10M3.5 4L4.5 11.5H9.5L10.5 4" stroke="rgba(232,230,224,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function SearchIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="rgba(232,230,224,0.25)" strokeWidth="1.2" />
            <path d="M9.5 9.5L12 12" stroke="rgba(232,230,224,0.25)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

const RISK_COLOR = { high: "#EF4444", medium: "#F97316", low: "#22C55E" };

function RiskDot({ level }) {
    const color = RISK_COLOR[level] ?? "#6B7280";
    return (
        <span style={{
            width: 6, height: 6, borderRadius: "50%", background: color,
            flexShrink: 0, display: "inline-block", boxShadow: `0 0 4px ${color}66`,
        }} />
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
        <div
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderRadius: 6,
                cursor: "pointer",
                borderLeft: isActive ? "2px solid #4A7CF7" : "2px solid transparent",
                background: isActive ? "rgba(74,124,247,0.12)" : "transparent",
                transition: "background 0.1s",
                userSelect: "none",
            }}
        >
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                {item.icon}
            </span>
            <span style={{
                fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                fontSize: 13,
                color: isActive ? "#E8E6E0" : "rgba(232,230,224,0.75)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            }}>
                {item.label}
            </span>
            {item.meta && (
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 10,
                    color: "rgba(232,230,224,0.25)",
                    flexShrink: 0,
                }}>
                    {item.meta}
                </span>
            )}
            {item.shortcut && (
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 10,
                    color: "rgba(232,230,224,0.3)",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    flexShrink: 0,
                }}>
                    {item.shortcut}
                </span>
            )}
        </div>
    );
}

// ─── Group Header ────────────────────────────────────────────────────────────
function GroupHeader({ label }) {
    return (
        <div style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "rgba(232,230,224,0.25)",
            textTransform: "uppercase",
            padding: "10px 14px 4px",
        }}>
            {label}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CommandPalette({ isOpen, onClose, operations = [], onClearHistory }) {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setActiveIndex(0);
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
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        zIndex: 500,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: "18vh",
                    }}
                >
                    <motion.div
                        key="cp-panel"
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: 560,
                            background: "#111111",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                            overflow: "hidden",
                            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                        }}
                    >
                        {/* ── Search Input ── */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "12px 14px",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}>
                            <SearchIcon />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                                placeholder="Search operations or run a command…"
                                style={{
                                    flex: 1,
                                    background: "transparent",
                                    border: "none",
                                    outline: "none",
                                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                    fontSize: 13,
                                    color: "#E8E6E0",
                                    caretColor: "#4A7CF7",
                                }}
                            />
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
                                maxHeight: 360,
                                overflowY: "auto",
                                padding: "4px 6px 8px",
                            }}
                        >
                            {groups.map((group) => (
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
                                            return (
                                                <Row
                                                    key={item.id}
                                                    item={item}
                                                    isActive={activeIndex === idx}
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

                        {/* ── Footer hint ── */}
                        <div style={{
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                            padding: "7px 14px",
                            display: "flex",
                            gap: 16,
                        }}>
                            {[["↑↓", "navigate"], ["↵", "select"], ["esc", "close"]].map(([key, label]) => (
                                <span key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <span style={{
                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                        fontSize: 10,
                                        color: "rgba(232,230,224,0.3)",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                        borderRadius: 3,
                                        padding: "1px 5px",
                                    }}>{key}</span>
                                    <span style={{
                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                        fontSize: 9,
                                        color: "rgba(232,230,224,0.2)",
                                        letterSpacing: "0.06em",
                                    }}>{label}</span>
                                </span>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}