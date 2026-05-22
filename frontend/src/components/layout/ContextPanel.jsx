/**
 * ContextPanel.jsx
 * Sidebar showing persisted operation history. Highlights active route entry.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const RISK_COLOR = {
    high:   '#F43F5E',
    medium: '#F59E0B',
    low:    '#10B981',
    pending: '#3B82F6',
};

function RiskDot({ level }) {
    const color = RISK_COLOR[level] ?? '#6B7280';
    const isPending = level === 'pending';

    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPending && (
                <motion.span
                    animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    style={{
                        position: 'absolute',
                        width: 8, height: 8, borderRadius: '50%',
                        background: color,
                    }}
                />
            )}
            <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: color,
                flexShrink: 0,
                boxShadow: `0 0 6px ${color}aa`,
                display: 'inline-block',
                position: 'relative',
                zIndex: 2,
            }} />
        </span>
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
            background: 'rgba(10, 10, 14, 0.45)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 16px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.14em',
                    color: 'rgba(243, 244, 246, 0.4)',
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
                            fontSize: 10, color: 'rgba(243, 244, 246, 0.25)',
                            letterSpacing: '0.08em', padding: 0,
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F43F5E'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(243, 244, 246, 0.25)'}
                    >
                        CLEAR
                    </button>
                )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', scrollbarWidth: 'none' }}>
                <AnimatePresence initial={false}>
                    {operations.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{
                                padding: '24px 16px',
                                fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                fontSize: 13,
                                color: 'rgba(243, 244, 246, 0.3)',
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
                                                gap: 6,
                                                width: '100%',
                                                padding: '10px 16px',
                                                background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                                borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                            }}
                                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {/* Label row */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <RiskDot level={op.riskLevel} />
                                                <span style={{
                                                    fontFamily: "var(--font-sans, 'Geist', sans-serif)",
                                                    fontSize: 12.5,
                                                    color: isActive ? '#F3F4F6' : 'rgba(243, 244, 246, 0.75)',
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
                                                paddingLeft: 14,
                                            }}>
                                                {op.riskScore != null && (
                                                    <span style={{
                                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                                        fontSize: 10,
                                                        fontWeight: 500,
                                                        color: RISK_COLOR[op.riskLevel] ?? '#6B7280',
                                                    }}>
                                                        {Math.round(op.riskScore * 100)}%
                                                    </span>
                                                )}
                                                {op.timestamp && (
                                                    <span style={{
                                                        fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                                        fontSize: 9,
                                                        color: 'rgba(243, 244, 246, 0.25)',
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