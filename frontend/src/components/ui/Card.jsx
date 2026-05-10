import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-4)] relative overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
