import React from 'react';

const Badge = ({ variant = 'neutral', children, className = '' }) => {
  const getColors = () => {
    switch (variant) {
      case 'false':
        return 'text-[var(--color-false)] border-[var(--color-false)] bg-[color-mix(in_srgb,var(--color-false)_8%,transparent)]';
      case 'unverifiable':
        return 'text-[var(--color-unverifiable)] border-[var(--color-unverifiable)] bg-[color-mix(in_srgb,var(--color-unverifiable)_8%,transparent)]';
      case 'true':
        return 'text-[var(--color-true)] border-[var(--color-true)] bg-[color-mix(in_srgb,var(--color-true)_8%,transparent)]';
      case 'plausible':
        return 'text-[var(--color-plausible)] border-[var(--color-plausible)] bg-[color-mix(in_srgb,var(--color-plausible)_8%,transparent)]';
      case 'neutral':
      default:
        return 'text-[var(--color-neutral)] border-[var(--color-neutral)] bg-[color-mix(in_srgb,var(--color-neutral)_8%,transparent)]';
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-mono uppercase tracking-widest text-[9px] font-extrabold border rounded px-2 py-0.5 whitespace-nowrap transition-colors duration-[var(--duration-fast)] ${getColors()} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
