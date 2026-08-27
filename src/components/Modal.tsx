import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

const MAX_W: Record<string, string> = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', fn);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', fn);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
            style={{ backgroundColor: 'rgba(15,17,23,0.72)', backdropFilter: 'blur(6px)' }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={  { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`relative w-full ${MAX_W[maxWidth] ?? MAX_W.md}
              max-h-[90vh] flex flex-col z-10 overflow-hidden`}
            style={{
              backgroundColor: 'var(--sp-surface)',
              border: '1px solid var(--sp-border)',
              borderRadius: 'var(--sp-radius-2xl)',
              boxShadow: 'var(--sp-shadow-lg)',
            }}
          >
            {title && (
              <div
                className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--sp-border)' }}
              >
                <div className="flex items-center gap-3">
                  {/* Orange left-accent bar */}
                  <span
                    className="w-[3px] h-5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--sp-orange)' }}
                  />
                  <h3
                    className="text-base font-bold"
                    style={{ color: 'var(--sp-text)', fontFamily: "'Sora', sans-serif" }}
                  >
                    {title}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ color: 'var(--sp-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--sp-text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--sp-text-muted)')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto sp-scrollbar px-6 py-5 space-y-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
