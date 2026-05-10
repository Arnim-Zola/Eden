/**
 * ContextPanel.jsx
 * Sidebar showing persisted operation history. Highlights active route entry.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const RISK_COLOR = {
    high:   '#EF4444',
    medium: '#F97316',
    low:    '#22C55E',
    pending: '#4A7CF7',
};

function RiskDot({ level }) {
    const color = RISK_COLOR[level] ?? '#6B7280';
    return (
        <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: color,
            flexShrink: 0,
            boxShadow: `0 0 4px ${color}88`,
            display: 'inline-block',
        }} />
    );
}

function RelativeTime({ ts }) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const label = days > 0
        ? `${days}d ago`
        : hrs > 0
        ? `${hrs}h ago`
        : mins > 0
        ? `${mins}m ago`
        : 'just now';
    return <span>{label}</span>;
}

export default function ContextPanel({ operations = [], activeId = null, onClear }) {
    return (
        <aside style={{
            width: 220,
            height: '100dvh',
            background: '#0A0A0A',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '18px 14px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    color: 'rgba(232,230,224,0.3)',
                    textTransform: 'uppercase',
                }}>
                    Operations
                </span>
                {operations.length > 0 && (
                    <button
                        onClick={onClear}
                        title="Clear history"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            fontSize: 9, color: 'rgba(232,230,224,0.2)',
                            letterSpacing: '0.08em', padding: 0,
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(239,68,68,0.6)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,230,224,0.2)'}
                    >
                        CLEAR
                    </button>
                )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
                <AnimatePresence initial={false}>
                    {operations.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{
                                padding: '24px 14px',
                                fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                fontSize: 12,
                                color: 'rgba(232,230,224,0.2)',
                                lineHeight: 1.6,
                            }}
                        >
                            No operations yet.
                            <br />Submit a URL to begin.
                        </motion.div>
                    ) : (
                        operations.map((op) => {
                            const isActive = op.id === activeId;
                            return (
                                <motion.div
                                    key={op.id}
                                    layout
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Link
                                        to={`/operation/${op.id}`}
                                        style={{ textDecoration: 'none', display: 'block' }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 5,
                                                width: '100%',
                                                padding: '9px 14px',
                                                background: isActive ? 'rgba(74,124,247,0.08)' : 'transparent',
                                                borderLeft: isActive ? '2px solid #4A7CF7' : '2px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s',
                                                boxSizing: 'border-box',
                                            }}
                                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {/* Label row */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <RiskDot level={op.riskLevel} />
                                                <span style={{
                                                    fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                                    fontSize: 12,
                                                    color: isActive ? '#E8E6E0' : 'rgba(232,230,224,0.65)',
                                                    fontWeight: isActive ? 500 : 400,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                }}>
                                                    {op.label ?? op.url?.replace(/^https?:\/\//, '').slice(0, 35) ?? op.id}
                                                </span>
                                            </div>
                                            {/* Meta row */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingLeft: 13,
                                            }}>
                                                {op.riskScore != null && (
                                                    <span style={{
                                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                                        fontSize: 10,
                                                        color: RISK_COLOR[op.riskLevel] ?? '#6B7280',
                                                    }}>
                                                        {Math.round(op.riskScore * 100)}
                                                    </span>
                                                )}
                                                {op.timestamp && (
                                                    <span style={{
                                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                                        fontSize: 9,
                                                        color: 'rgba(232,230,224,0.22)',
                                                        marginLeft: 'auto',
                                                    }}>
                                                        <RelativeTime ts={op.timestamp} />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </aside>
    );
}