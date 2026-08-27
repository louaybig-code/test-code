import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className = '', id: propId, ...props }, ref) => {
    const uid = useId();
    const inputId = propId ?? uid;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--sp-text-muted)' }}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div
              className="absolute left-3 pointer-events-none flex items-center"
              style={{ color: 'var(--sp-text-muted)' }}
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full text-sm transition-all duration-150',
              'rounded-xl py-2.5',
              'focus:outline-none focus:ring-2',
              error
                ? 'border-rose-500/60 focus:ring-rose-500/35 focus:border-rose-500/60'
                : 'focus:ring-[#1A8C8C]/40 focus:border-[#1A8C8C]/60',
              icon ? 'pl-10' : 'pl-3.5',
              iconRight ? 'pr-10' : 'pr-3.5',
              className,
            ].join(' ')}
            style={{
              backgroundColor: 'var(--sp-surface-2)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: error ? undefined : 'var(--sp-border)',
              color: 'var(--sp-text)',
            }}
            placeholder={props.placeholder}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3 pointer-events-none flex items-center"
              style={{ color: 'var(--sp-text-muted)' }}>
              {iconRight}
            </div>
          )}
        </div>

        {(error || hint) && (
          <p
            className="text-xs font-medium"
            style={{ color: error ? 'var(--sp-danger)' : 'var(--sp-text-muted)' }}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/* ── Textarea wrapper with same design system ─── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id: propId, ...props }, ref) => {
    const uid = useId();
    const inputId = propId ?? uid;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--sp-text-muted)' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            'w-full text-sm transition-all duration-150 resize-none',
            'rounded-xl px-3.5 py-2.5',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-rose-500/60 focus:ring-rose-500/35'
              : 'focus:ring-[#1A8C8C]/40 focus:border-[#1A8C8C]/60',
            className,
          ].join(' ')}
          style={{
            backgroundColor: 'var(--sp-surface-2)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: error ? undefined : 'var(--sp-border)',
            color: 'var(--sp-text)',
          }}
          {...props}
        />
        {(error || hint) && (
          <p className="text-xs font-medium"
            style={{ color: error ? 'var(--sp-danger)' : 'var(--sp-text-muted)' }}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

/* ── Shared select style helper ─── */
export const selectClass =
  'w-full rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/40 focus:border-[#1A8C8C]/60 cursor-pointer ' +
  'border border-[var(--sp-border)] bg-[var(--sp-surface-2)] text-[var(--sp-text)]';
