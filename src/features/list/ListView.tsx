import React, { useState, useEffect } from 'react';
import { Search, Flag, Calendar, Archive, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { apiService } from '../../services/api';
import { Task } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { formatDate, PRIORITY_CONFIG } from '../../lib/constants';
import { Skeleton } from '../../components/Skeleton';
import { ErrorView } from '../../components/ErrorView';
import toast from 'react-hot-toast';

interface ListViewProps {
  projectId: string;
  onSelectTask: (task: Task) => void;
}

export const ListView: React.FC<ListViewProps> = ({ projectId, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const loadTasks = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res: any = await apiService.getProjectTasks(projectId, {
        search: search || undefined,
        priority: priorityFilter || undefined,
        archived: false,
      });
      if (Array.isArray(res)) {
        setTasks(res);
      } else if (res && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
      } else {
        setTasks([]);
      }
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadArchivedTasks = async () => {
    if (archivedTasks.length > 0) return; // already loaded
    setIsLoadingArchived(true);
    try {
      const res: any = await apiService.getProjectTasks(projectId, { archived: true });
      if (Array.isArray(res)) {
        setArchivedTasks(res);
      } else if (res && Array.isArray(res.tasks)) {
        setArchivedTasks(res.tasks);
      } else {
        setArchivedTasks([]);
      }
    } catch {
      toast.error('Erreur lors du chargement des tâches archivées');
    } finally {
      setIsLoadingArchived(false);
    }
  };

  const handleToggleArchived = () => {
    const next = !showArchived;
    setShowArchived(next);
    if (next) loadArchivedTasks();
  };

  const handleRestoreTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.restoreTask(task.id);
      setArchivedTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success(`"${task.title}" restaurée`);
      loadTasks(); // refresh active list
    } catch {
      toast.error('Erreur lors de la restauration');
    }
  };

  useEffect(() => {
    if (projectId) loadTasks();
    // Reset archived list when project or filters change
    setArchivedTasks([]);
    setShowArchived(false);
  }, [projectId, search, priorityFilter]);

  if (isError) return <ErrorView onRetry={loadTasks} />;

  // ── Shared table row renderer ──────────────────────────────────────────────
  const TaskRow: React.FC<{ task: Task; archived?: boolean }> = ({ task, archived }) => {
    const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
    return (
      <tr
        onClick={() => onSelectTask(task)}
        className={`transition cursor-pointer group ${
          archived
            ? 'opacity-60 hover:opacity-100 hover:bg-amber-500/5'
            : 'hover:bg-violet-500/10'
        }`}
      >
        <td className={`py-3.5 px-4 font-semibold ${archived ? 'text-slate-400 line-through group-hover:no-underline' : 'text-slate-900 dark:text-slate-100 group-hover:text-violet-500 dark:group-hover:text-violet-400'}`}>
          <span className="flex items-center gap-2">
            {archived && <Archive className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            {task.title}
          </span>
        </td>
        <td className="py-3.5 px-4">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/10 text-violet-400 font-semibold border border-violet-500/20">
            {task.status}
          </span>
        </td>
        <td className="py-3.5 px-4">
          <Badge color={priorityInfo.color} bg={priorityInfo.bg} icon={<Flag className="w-3 h-3" />}>
            {priorityInfo.label}
          </Badge>
        </td>
        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
          {task.dueDate ? formatDate(task.dueDate) : '-'}
        </td>
        <td className="py-3.5 px-4">
          {task.assignee ? (
            <div className="flex items-center gap-2">
              <Avatar
                src={task.assignee.avatarUrl}
                firstName={task.assignee.firstName}
                lastName={task.assignee.lastName}
                email={task.assignee.email}
                size="sm"
              />
              <span className="text-slate-700 dark:text-slate-300">{task.assignee.firstName} {task.assignee.lastName}</span>
            </div>
          ) : (
            <span className="text-slate-500 dark:text-slate-500">Non assigné</span>
          )}
        </td>
        {archived && (
          <td className="py-3.5 px-4">
            <button
              onClick={(e) => handleRestoreTask(task, e)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 text-[10px] font-semibold transition cursor-pointer"
              title="Restaurer la tâche"
            >
              <RotateCcw className="w-3 h-3" /> Restaurer
            </button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer les tâches par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        >
          <option value="">Toutes les priorités</option>
          <option value="LOW">Basse</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="HIGH">Haute</option>
          <option value="URGENT">Urgente</option>
        </select>
      </div>

      {/* Active tasks table */}
      <div className="rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Titre</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Priorité</th>
                <th className="py-3.5 px-4">Échéance</th>
                <th className="py-3.5 px-4">Assigné</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="p-4" colSpan={5}><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Aucune tâche active trouvée.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => <TaskRow key={task.id} task={task} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archived tasks toggle + section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Toggle header */}
        <button
          onClick={handleToggleArchived}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-100/60 dark:bg-slate-900/60 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Archive className="w-4 h-4 text-amber-400" />
            Tâches archivées
            {archivedTasks.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                {archivedTasks.length}
              </span>
            )}
          </span>
          {showArchived
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />
          }
        </button>

        {/* Archived table */}
        {showArchived && (
          <div className="overflow-x-auto bg-slate-50/50 dark:bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Titre</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Priorité</th>
                  <th className="py-3 px-4">Échéance</th>
                  <th className="py-3 px-4">Assigné</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
                {isLoadingArchived ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td className="p-4" colSpan={6}><Skeleton className="h-6 w-full" /></td>
                    </tr>
                  ))
                ) : archivedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Aucune tâche archivée.
                    </td>
                  </tr>
                ) : (
                  archivedTasks.map((task) => <TaskRow key={task.id} task={task} archived />)
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
