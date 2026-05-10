import React from 'react';

const Button = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center font-sans text-[13px] font-medium rounded-[var(--radius-sm)] transition-all duration-[var(--duration-fast)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[var(--text-primary)] text-[var(--bg-base)] hover:bg-white px-4 py-2",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] px-4 py-2 border border-transparent",
    destructive: "bg-[color-mix(in_srgb,var(--color-false)_10%,transparent)] text-[var(--color-false)] hover:bg-[color-mix(in_srgb,var(--color-false)_20%,transparent)] border border-[color-mix(in_srgb,var(--color-false)_30%,transparent)] px-4 py-2"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
