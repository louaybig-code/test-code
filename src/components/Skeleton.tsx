import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`sp-skeleton rounded-xl ${className}`} />
);

export const KanbanBoardSkeleton: React.FC = () => (
  <div className="flex items-stretch min-h-[calc(100vh-160px)] overflow-x-auto pl-4 gap-0">
    {[1, 2, 3, 4].map((col) => (
      <div
        key={col}
        className="flex-1 min-w-[220px] max-w-xs border-r border-[var(--sp-border)] flex flex-col"
      >
        {/* Column header skeleton */}
        <div className="h-11 sp-skeleton rounded-none" style={{ opacity: 0.6 }} />

        {/* Task cards */}
        <div className="flex-1 bg-[var(--sp-surface-2)] p-3 space-y-3">
          {[1, 2, col % 2 === 0 ? 3 : null].filter(Boolean).map((i) => (
            <div key={i} className="sp-card p-4 space-y-2.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
