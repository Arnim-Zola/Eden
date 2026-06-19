/**
 * CommandRail.jsx — Eden AI · Left Navigation Rail
 * God Mode+ revision: breathing neon glow on the ⌘ trigger and wordmark,
 * and a fluid liquid indicator pill that slides between nav items via
 * Framer Motion's shared layoutId. Props/behavior unchanged.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ScanSearch, BookOpen, Settings } from 'lucide-react';

const ACCENT = '#4A7CF7';
const ACCENT_SOFT = 'rgba(74,124,247,0.35)';

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ScanSearch, label: 'Operations', path: '/' },
    { icon: BookOpen, label: 'Library', path: '/' },
];

// ── ⌘K trigger button ─────────────────────────────────────────────────────────
function CmdKButton({ onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <motion.button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title="Command Palette (⌘K)"
            whileTap={{ scale: 0.92 }}
            style={{
                position: 'relative',
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${hover ? ACCENT_SOFT : 'rgba(255,255,255,0.08)'}`,
                background: hover ? 'rgba(74,124,247,0.1)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s, border-color 0.15s',
                marginBottom: 4,
                overflow: 'visible',
            }}
        >
            {/* breathing neon glow ring */}
            <motion.span
                aria-hidden
                animate={{
                    opacity: [0.25, 0.55, 0.25],
                    scale: [1, 1.08, 1],
                }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    inset: -2,
                    borderRadius: 10,
                    boxShadow: `0 0 10px 1px ${ACCENT_SOFT}`,
                    pointerEvents: 'none',
                }}
            />
            <span style={{
                position: 'relative',
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: 11,
                color: hover ? ACCENT : 'rgba(232,230,224,0.4)',
                letterSpacing: '-0.02em',
                textShadow: hover ? `0 0 6px ${ACCENT_SOFT}` : 'none',
                transition: 'color 0.15s, text-shadow 0.15s',
            }}>
                ⌘
            </span>
        </motion.button>
    );
}

export default function CommandRail({ onOpenPalette }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav
            style={{
                width: '52px',
                minHeight: '100vh',
                background: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '16px',
                paddingBottom: '16px',
                gap: '4px',
                flexShrink: 0,
                zIndex: 50,
                position: 'relative',
            }}
        >
            {/* ⌘K palette trigger — top of rail */}
            <CmdKButton onClick={onOpenPalette} />

            {/* Wordmark / home link */}
            <motion.button
                onClick={() => navigate('/')}
                title="Eden — Home"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    position: 'relative',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    color: 'var(--color-text-primary)',
                    marginBottom: '16px',
                    marginTop: '4px',
                    userSelect: 'none',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                }}
            >
                <motion.span
                    aria-hidden
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        position: 'absolute',
                        inset: -6,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${ACCENT_SOFT} 0%, transparent 70%)`,
                        filter: 'blur(3px)',
                        pointerEvents: 'none',
                    }}
                />
                <span style={{ position: 'relative' }}>E</span>
            </motion.button>

            {/* Nav icons with liquid sliding active-pill */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, position: 'relative' }}>
                {NAV_ITEMS.map(({ icon: Icon, label, path }, i) => {
                    // NAV_ITEMS share the same path in this app; disambiguate active
                    // state by index-of-first-match so the pill still has a single
                    // deterministic owner without altering routing behavior.
                    const isActive = location.pathname === path && NAV_ITEMS.findIndex(n => n.path === location.pathname) === i;
                    return (
                        <NavLink
                            key={label}
                            to={path}
                            title={label}
                            end
                            style={{
                                position: 'relative',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                textDecoration: 'none',
                            }}
                        >
                            {({ isActive: routerActive }) => (
                                <>
                                    {routerActive && (
                                        <motion.span
                                            layoutId="rail-active-pill"
                                            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: 8,
                                                border: '1px solid var(--color-border-accent)',
                                                background: 'var(--color-surface-raised)',
                                                boxShadow: `0 0 12px -2px ${ACCENT_SOFT}`,
                                            }}
                                        />
                                    )}
                                    <motion.span
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        style={{
                                            position: 'relative',
                                            display: 'flex',
                                            color: routerActive
                                                ? 'var(--color-text-primary)'
                                                : 'var(--color-text-muted)',
                                            transition: 'color 120ms ease',
                                        }}
                                    >
                                        <Icon size={16} strokeWidth={routerActive ? 2 : 1.5} />
                                    </motion.span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>

            {/* Settings pinned at bottom */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Settings"
                style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'color 120ms ease',
                }}
            >
                <Settings size={16} strokeWidth={1.5} />
            </motion.button>
        </nav>
    );
}