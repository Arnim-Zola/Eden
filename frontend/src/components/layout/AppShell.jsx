/**
 * AppShell.jsx — Eden AI · Step 11 (mobile responsive)
 * Desktop: CommandRail (left) + ContextPanel (sidebar) + main
 * Mobile:  main full-width + fixed bottom tab bar
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import CommandRail from "./CommandRail";
import ContextPanel from "./ContextPanel";

// ─── Tab Bar Icons ────────────────────────────────────────────────────────────
function HomeIcon({ active }) {
    const c = active ? "#4A7CF7" : "rgba(232,230,224,0.35)";
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 9.5L10 3L17 9.5V17H13V13H7V17H3V9.5Z"
                stroke={c} strokeWidth="1.4" strokeLinejoin="round" fill="none" />
        </svg>
    );
}
function HistoryIcon({ active }) {
    const c = active ? "#4A7CF7" : "rgba(232,230,224,0.35)";
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.4" />
            <path d="M10 6.5V10.5L13 12.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function CmdIcon({ active }) {
    const c = active ? "#4A7CF7" : "rgba(232,230,224,0.35)";
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 7H5.5C4.67 7 4 6.33 4 5.5C4 4.67 4.67 4 5.5 4C6.33 4 7 4.67 7 5.5V7ZM7 7H13M7 7V13M13 7H14.5C15.33 7 16 7.67 16 8.5C16 9.33 15.33 10 14.5 10H13V7ZM7 13H5.5C4.67 13 4 13.67 4 14.5C4 15.33 4.67 16 5.5 16C6.33 16 7 15.33 7 14.5V13ZM7 13V10M13 13V14.5C13 15.33 13.67 16 14.5 16C15.33 16 16 15.33 16 14.5C16 13.67 15.33 13 14.5 13H13ZM13 10H10M13 10V13M7 10H10M10 10V7M10 10V13"
                stroke={c} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
}

// ─── Mobile Bottom Sheet (ContextPanel overlay) ───────────────────────────────
function BottomSheet({ isOpen, onClose, operations, activeId, onClear }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="sheet-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        style={{
                            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
                            zIndex: 400,
                        }}
                    />
                    <motion.div
                        key="sheet-panel"
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.8 }}
                        style={{
                            position: "fixed", bottom: 52, left: 0, right: 0,
                            height: "60dvh", background: "#0A0A0A",
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "16px 16px 0 0",
                            zIndex: 401, overflow: "hidden",
                        }}
                    >
                        {/* drag handle */}
                        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
                        </div>
                        <div style={{ height: "calc(100% - 24px)", overflow: "hidden" }}>
                            <ContextPanel
                                operations={operations}
                                activeId={activeId}
                                onClear={() => { onClear?.(); onClose(); }}
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─── Mobile Tab Bar ───────────────────────────────────────────────────────────
function TabBar({ onHome, onHistory, onPalette, activeTab }) {
    const tabs = [
        { id: "home", label: "Home", Icon: HomeIcon, onPress: onHome },
        { id: "history", label: "History", Icon: HistoryIcon, onPress: onHistory },
        { id: "cmd", label: "Palette", Icon: CmdIcon, onPress: onPalette },
    ];
    return (
        <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            height: 52, background: "#0A0A0A",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center",
            zIndex: 300,
        }}>
            {tabs.map(({ id, label, Icon, onPress }) => {
                const isActive = activeTab === id;
                return (
                    <button
                        key={id}
                        onClick={onPress}
                        style={{
                            flex: 1, height: "100%",
                            background: "transparent", border: "none",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            gap: 3, cursor: "pointer",
                        }}
                    >
                        <Icon active={isActive} />
                        <span style={{
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            fontSize: 9, letterSpacing: "0.08em",
                            color: isActive ? "#4A7CF7" : "rgba(232,230,224,0.25)",
                            textTransform: "uppercase",
                        }}>
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
export default function AppShell({
    children,
    operations = [],
    activeId = null,
    onClearHistory,
    onOpenPalette,
}) {
    const navigate = useNavigate();
    const isMobile = useMediaQuery("(max-width: 767px)");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("home");

    const handleHome = useCallback(() => {
        setActiveTab("home");
        navigate("/");
    }, [navigate]);

    const handleHistory = useCallback(() => {
        setActiveTab(t => t === "history" ? "home" : "history");
        setSheetOpen(v => !v);
    }, []);

    const handlePalette = useCallback(() => {
        setActiveTab("cmd");
        onOpenPalette?.();
        // reset tab highlight after palette closes (palette is self-closing)
        setTimeout(() => setActiveTab("home"), 300);
    }, [onOpenPalette]);

    if (isMobile) {
        return (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#080808" }}>
                {/* Main workspace */}
                <main style={{ flex: 1, overflowY: "auto", paddingBottom: 64 }}>
                    {children}
                </main>

                {/* Bottom sheet (history) */}
                <BottomSheet
                    isOpen={sheetOpen}
                    onClose={() => { setSheetOpen(false); setActiveTab("home"); }}
                    operations={operations}
                    activeId={activeId}
                    onClear={onClearHistory}
                />

                {/* Tab bar */}
                <TabBar
                    activeTab={activeTab}
                    onHome={handleHome}
                    onHistory={handleHistory}
                    onPalette={handlePalette}
                />
            </div>
        );
    }

    // ── Desktop ──
    return (
        <div style={{ display: "flex", height: "100dvh", background: "#080808", overflow: "hidden" }}>
            <div className="no-print">
                <CommandRail onOpenPalette={onOpenPalette} />
            </div>
            <div className="no-print">
                <ContextPanel operations={operations} activeId={activeId} onClear={onClearHistory} />
            </div>
            <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
                {children}
            </main>
        </div>
    );
}