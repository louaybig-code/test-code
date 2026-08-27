import React, { useState, useEffect } from 'react';
import { Search, X, CheckSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from '../services/api';
import { Task } from '../types';
import { PRIORITY_CONFIG } from '../lib/constants';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
  onSelectTask: (task: Task) => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  isOpen,
  onClose,
  activeProjectId,
  onSelectTask,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
          setResults([]);
        }
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Use dedicated search API for better results
        const searchResults = await apiService.search(query, 'task');
        // Extract tasks from search results
        const tasks = searchResults?.tasks || [];
        setResults(tasks);
      } catch {
        // Fallback to project-specific search if global search fails
        if (activeProjectId) {
          try {
            const res = await apiService.getProjectTasks(activeProjectId, { search: query });
            if (Array.isArray(res)) {
              setResults(res);
            } else if (res && Array.isArray(res.tasks)) {
              setResults(res.tasks);
            } else {
              setResults([]);
            }
          } catch {
            setResults([]);
          }
        } else {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, activeProjectId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#131620]/75 backdrop-blur-md"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="relative w-full max-w-xl rounded-2xl
              bg-white dark:bg-[#1C2033]
              border border-[#DDE1E9] dark:border-[#2E3450]
              shadow-2xl backdrop-blur-xl overflow-hidden z-10"
          >
            {/* Search input row */}
            <div className="flex items-center px-4 py-3 border-b border-[#DDE1E9] dark:border-[#2E3450]">
              <Search className="w-5 h-5 text-[#E8531A] mr-3 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search tasks, descriptions... (e.g. Figma, API, Bug)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm
                  text-[#1C2033] dark:text-[#E8EAF0]
                  placeholder-[#6B7280] dark:placeholder-[#8890A8]
                  focus:outline-none"
              />
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#1A8C8C] ml-2 shrink-0" />
              ) : (
                <button
                  onClick={onClose}
                  className="p-1 text-[#6B7280] hover:text-[#1C2033] dark:hover:text-[#E8EAF0] rounded-lg
                    hover:bg-[#EEF0F4] dark:hover:bg-[#252A3D] ml-2 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2">
              {!query.trim() && (
                <p className="p-4 text-xs text-[#8890A8] text-center">
                  Start typing to search across all tasks, projects, and comments...
                </p>
              )}

              {activeProjectId && query.trim() && !isLoading && results.length === 0 && (
                <p className="p-4 text-xs text-[#8890A8] text-center">
                  No results for "{query}".
                </p>
              )}

              {results.map((task) => {
                const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                return (
                  <button
                    key={task.id}
                    onClick={() => { onSelectTask(task); onClose(); }}
                    className="w-full flex items-center justify-between p-3 rounded-xl
                      hover:bg-[#EEF0F4] dark:hover:bg-[#252A3D]
                      text-left group transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <CheckSquare className="w-4 h-4 text-[#1A8C8C] shrink-0" />
                      <div>
                        <h5 className="text-sm font-medium
                          text-[#1C2033] dark:text-[#E8EAF0]
                          group-hover:text-[#E8531A]">
                          {task.title}
                        </h5>
                        {task.description && (
                          <p className="text-xs text-[#6B7280] dark:text-[#8890A8] line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityInfo.bg} ${priorityInfo.color}`}>
                      {priorityInfo.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2
              bg-[#EEF0F4] dark:bg-[#252A3D]
              border-t border-[#DDE1E9] dark:border-[#2E3450]
              flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#8890A8]">
              <span>Press ESC to close</span>
              <span className="font-mono bg-[#DDE1E9] dark:bg-[#2E3450] px-1.5 py-0.5 rounded">
                Cmd + K
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
