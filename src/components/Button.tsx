import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'teal' | 'secondary' | 'danger' | 'outline' | 'outline-teal' | 'ghost';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const BASE =
  'inline-flex items-center justify-center font-semibold rounded-xl ' +
  'transition-all duration-200 cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E8531A]/60 ' +
  'active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none';

const SIZES: Record<Size, string> = {
  xs: 'px-2.5 py-1   text-[11px] gap-1',
  sm: 'px-3   py-1.5 text-xs     gap-1.5',
  md: 'px-4   py-2   text-sm     gap-2',
  lg: 'px-6   py-2.5 text-base   gap-2.5 font-bold',
};

const VARIANTS: Record<Variant, string> = {
  /** Orange CTA — primary action */
  primary:
    'bg-[#E8531A] hover:bg-[#F06535] active:bg-[#CC4515] text-white ' +
    'shadow-[0_4px_16px_rgba(232,83,26,0.30)] border border-[#E8531A]/0',

  /** Teal — secondary brand action */
  teal:
    'bg-[#1A8C8C] hover:bg-[#21AAAA] active:bg-[#147070] text-white ' +
    'shadow-[0_4px_16px_rgba(26,140,140,0.25)] border border-[#1A8C8C]/0',

  /** Neutral surface */
  secondary:
    'bg-[var(--sp-surface-2)] hover:bg-[var(--sp-surface-3)] ' +
    'text-[var(--sp-text)] border border-[var(--sp-border)] ' +
    'shadow-[var(--sp-shadow-sm)]',

  /** Destructive */
  danger:
    'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white ' +
    'shadow-[0_4px_14px_rgba(239,68,68,0.28)] border border-rose-500/10',

  /** Orange outline */
  outline:
    'bg-transparent border border-[#E8531A]/35 hover:border-[#E8531A]/70 ' +
    'text-[#E8531A] hover:bg-[#E8531A]/08',

  /** Teal outline */
  'outline-teal':
    'bg-transparent border border-[#1A8C8C]/35 hover:border-[#1A8C8C]/70 ' +
    'text-[#1A8C8C] hover:bg-[#1A8C8C]/08',

  /** Ghost — minimal */
  ghost:
    'bg-transparent hover:bg-[var(--sp-surface-2)] ' +
    'text-[var(--sp-text-muted)] hover:text-[var(--sp-text)]',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => (
  <button
    className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    disabled={disabled || isLoading}
    {...props}
  >
    {isLoading
      ? <Loader2 className="w-4 h-4 animate-spin text-current flex-shrink-0" />
      : icon && <span className="flex items-center flex-shrink-0">{icon}</span>}
    {children}
  </button>
);
