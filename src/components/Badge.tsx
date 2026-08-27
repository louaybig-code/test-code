import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  className?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'orange' | 'teal' | 'charcoal' | 'success' | 'warning' | 'danger' | 'info';
}

const VARIANTS: Record<string, string> = {
  orange:  'bg-[#E8531A]/12 text-[#E8531A] border-[#E8531A]/25',
  teal:    'bg-[#1A8C8C]/12 text-[#1A8C8C] border-[#1A8C8C]/25',
  charcoal:'bg-[#2C3147]/10 text-[#2C3147] dark:bg-[#E8EBF4]/10 dark:text-[#E8EBF4] border-[#2C3147]/20 dark:border-[#E8EBF4]/15',
  success: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
  danger:  'bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25',
  info:    'bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/25',
  default: 'bg-[var(--sp-surface-2)] text-[var(--sp-text-secondary)] border-[var(--sp-border)]',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  color,
  bg,
  className = '',
  icon,
  variant,
}) => {
  const variantClass = variant ? VARIANTS[variant] ?? VARIANTS.default : '';
  const legacyClass  = !variant && (color || bg) ? `${color ?? ''} ${bg ?? ''}` : '';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
        text-xs font-semibold border
        whitespace-nowrap backdrop-blur-sm
        ${variantClass} ${legacyClass} ${className}`}
    >
      {icon && <span className="w-3 h-3 flex items-center justify-center shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
