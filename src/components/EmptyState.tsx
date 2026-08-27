import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Aucun élément',
  description = 'Il n’y a aucun contenu à afficher pour le moment.',
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-slate-800 my-4">
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4 ring-1 ring-violet-500/20 shadow-lg shadow-violet-500/5">
        {icon || <FolderOpen className="w-7 h-7" />}
      </div>
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
