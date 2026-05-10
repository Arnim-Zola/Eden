import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ScanSearch, BookOpen, Settings } from 'lucide-react';

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard',  path: '/' },
    { icon: ScanSearch,      label: 'Operations', path: '/' },
    { icon: BookOpen,        label: 'Library',    path: '/' },
];

// ── ⌘K trigger button ─────────────────────────────────────────────────────────
function CmdKButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            title="Command Palette (⌘K)"
            style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s, border-color 0.15s',
                marginBottom: 4,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(74,124,247,0.1)';
                e.currentTarget.style.borderColor = 'rgba(74,124,247,0.3)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
        >
            <span style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: 11,
                color: 'rgba(232,230,224,0.4)',
                letterSpacing: '-0.02em',
            }}>
                ⌘
            </span>
        </button>
    );
}

export default function CommandRail({ onOpenPalette }) {
    const navigate = useNavigate();

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
            }}
        >
            {/* ⌘K palette trigger — top of rail */}
            <CmdKButton onClick={onOpenPalette} />

            {/* Wordmark / home link */}
            <button
                onClick={() => navigate('/')}
                title="Eden — Home"
                style={{
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
                E
            </button>

            {/* Nav icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
                    <NavLink
                        key={label}
                        to={path}
                        title={label}
                        end
                        style={({ isActive }) => ({
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: isActive
                                ? '1px solid var(--color-border-accent)'
                                : '1px solid transparent',
                            background: isActive
                                ? 'var(--color-surface-raised)'
                                : 'transparent',
                            color: isActive
                                ? 'var(--color-text-primary)'
                                : 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'color 120ms ease, background 120ms ease, border-color 120ms ease',
                            textDecoration: 'none',
                        })}
                    >
                        {({ isActive }) => (
                            <motion.span
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{ display: 'flex' }}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                            </motion.span>
                        )}
                    </NavLink>
                ))}
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