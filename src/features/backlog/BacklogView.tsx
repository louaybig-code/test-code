import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Play, CheckCircle2, Plus, Flag, Calendar, Layers, GripVertical, Rocket, Target, X, Pencil, Trash2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { Epic, Sprint, Task } from '../../types';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { PRIORITY_CONFIG, formatDate } from '../../lib/constants';
import { usePermissions } from '../../context/PermissionsContext';
import toast from 'react-hot-toast';

interface BacklogViewProps {
  projectId: string;
  onSelectTask: (task: Task) => void;
}

// ─── Sortable Task Component ─────────────────────────────────────────────────
interface SortableTaskProps {
  task: Task;
  epics: Epic[];
  onSelectTask: (task: Task) => void;
}

const SortableTask: React.FC<SortableTaskProps> = ({ task, epics, onSelectTask }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const epic = epics.find((e) => e.id === task.epicId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-xl border transition group ${
        isDragging
          ? 'bg-[var(--sp-surface-2)] border-violet-500/60 shadow-xl'
          : 'bg-[var(--sp-surface)] border-[var(--sp-border)] hover:border-violet-500/40'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-[var(--sp-text-disabled)] hover:text-[var(--sp-text-secondary)] shrink-0" />
        </div>
        <button
          onClick={() => onSelectTask(task)}
          className="text-xs font-semibold text-[var(--sp-text)] hover:text-violet-400 text-left cursor-pointer truncate"
        >
          {task.title}
        </button>
        {epic && (
          <span
            className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white shrink-0"
            style={{ backgroundColor: epic.color || '#8b5cf6' }}
          >
            {epic.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge color={priorityInfo.color} bg={priorityInfo.bg} icon={<Flag className="w-3 h-3" />}>
          {priorityInfo.label}
        </Badge>
        {task.dueDate && (
          <span className="hidden md:flex items-center gap-1 text-[10px] text-[var(--sp-text-muted)]">
            <Calendar className="w-3 h-3" />{formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Droppable Zone Component ────────────────────────────────────────────────
interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}

const DroppableZone: React.FC<DroppableZoneProps> = ({ id, children, isEmpty, emptyMessage }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[56px] p-2 rounded-xl border border-dashed transition-colors ${
        isOver
          ? 'bg-violet-500/10 border-violet-500/40'
          : 'bg-[var(--sp-surface-2)] border-[var(--sp-border)]'
      }`}
    >
      {isEmpty ? (
        <div className="text-center py-3 text-xs text-[var(--sp-text-disabled)] italic">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const BacklogView: React.FC<BacklogViewProps> = ({ projectId, onSelectTask }) => {
  const { hasAbility } = usePermissions();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Permission checks
  const canMoveTask = hasAbility('task:move');
  const canManageSprints = hasAbility('sprint:manage');

  // Drag state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Active epic filter — null means "show all"
  const [activeEpicFilter, setActiveEpicFilter] = useState<string | null>(null);

  // Sprint Modal (create)
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [sprintEndDate, setSprintEndDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);

  // Inline close-sprint confirmation
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);

  // Sprint Edit Modal
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editSprintName, setEditSprintName] = useState('');
  const [editSprintGoal, setEditSprintGoal] = useState('');
  const [editSprintStartDate, setEditSprintStartDate] = useState('');
  const [editSprintEndDate, setEditSprintEndDate] = useState('');
  const [isSavingSprint, setIsSavingSprint] = useState(false);

  // Epic Modal
  const [isEpicModalOpen, setIsEpicModalOpen] = useState(false);
  const [epicName, setEpicName] = useState('');
  const [epicColor, setEpicColor] = useState('#8b5cf6');

  // Sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load sprints, epics, backlog, and board in parallel
      const [sprintList, epicList, backlogTasks, boardData] = await Promise.all([
        apiService.getSprints(projectId),
        apiService.getEpics(projectId),
        apiService.getBacklog(projectId), // Get backlog tasks in correct order
        apiService.getBoard(projectId),   // Get all tasks from board
      ]);

      setSprints(Array.isArray(sprintList) ? sprintList : []);
      setEpics(Array.isArray(epicList) ? epicList : []);

      // Combine backlog tasks and board tasks
      // Backlog tasks are already in correct order from API
      // Board tasks need to be added (they're in sprints)
      const taskMap = new Map<string, Task>();
      
      // First, add backlog tasks (they're in the correct order)
      if (Array.isArray(backlogTasks)) {
        backlogTasks.forEach(task => taskMap.set(task.id, task));
      }
      
      // Then add tasks from board columns (for tasks in sprints)
      if (boardData?.columns) {
        for (const col of boardData.columns) {
          for (const task of col.tasks) {
            if (!taskMap.has(task.id)) {
              taskMap.set(task.id, task);
            }
          }
        }
      }
      
      // Convert map to array, keeping backlog order at the start
      const allTasksArray = Array.from(taskMap.values());
      
      // Sort: backlog tasks first (no sprintId), then sprint tasks by position
      allTasksArray.sort((a, b) => {
        // Backlog tasks come first
        if (!a.sprintId && b.sprintId) return -1;
        if (a.sprintId && !b.sprintId) return 1;
        // Within same category, sort by position
        return a.position - b.position;
      });
      
      setAllTasks(allTasksArray);
    } catch {
      setAllTasks([]);
      setSprints([]);
      setEpics([]);
      toast.error('Erreur de chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  // ─── Filter helper ───────────────────────────────────────────────────────────
  const applyEpicFilter = (tasks: Task[]) => {
    const filtered = activeEpicFilter ? tasks.filter((t) => t.epicId === activeEpicFilter) : tasks;
    // Don't sort by position - preserve the order from state (which includes manual reorders)
    return filtered;
  };

  // ─── Drag handlers ───────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    if (!canMoveTask) {
      toast.error('Vous n\'avez pas la permission de déplacer les tâches');
      return;
    }
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) return;

    // Double-check permission
    if (!canMoveTask) {
      toast.error('Vous n\'avez pas la permission de déplacer les tâches');
      loadData(); // Reload to revert optimistic update
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;

    const draggedTask = allTasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    // Determine target sprint
    let targetSprintId: string | null = null;
    let overTask: Task | undefined;
    
    if (overId.startsWith('sprint-')) {
      targetSprintId = overId.replace('sprint-', '');
    } else if (overId === 'backlog-tasks') {
      targetSprintId = null;
    } else {
      // Dropped on another task
      overTask = allTasks.find(t => t.id === overId);
      if (overTask) {
        targetSprintId = overTask.sprintId || null;
      }
    }

    // Check if we're reordering within the same sprint/backlog
    const isSameContainer = draggedTask.sprintId === targetSprintId;

    if (isSameContainer && overTask && taskId !== overId) {
      // Reordering within same container
      // First, calculate the reordered list
      const filtered = allTasks.filter(t => 
        (targetSprintId ? t.sprintId === targetSprintId : !t.sprintId)
      );
      
      const oldIndex = filtered.findIndex(t => t.id === taskId);
      const newIndex = filtered.findIndex(t => t.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return;
      
      const reordered = [...filtered];
      const [movedTask] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, movedTask);
      
      // Update local state optimistically
      setAllTasks((prev) => {
        const other = prev.filter(t => 
          !(targetSprintId ? t.sprintId === targetSprintId : !t.sprintId)
        );
        return [...other, ...reordered];
      });
      
      // Persist reordering via backend API
      if (targetSprintId === null) {
        // Backlog reordering: use dedicated reorderBacklog API
        try {
          const taskIds = reordered.map(t => t.id);

          await apiService.reorderBacklog(projectId, taskIds);

          toast.success('Ordre sauvegardé');
        } catch (err) {
          console.error('❌ Failed to reorder backlog:', err);
          toast.error('Erreur lors du réordonnancement');
          loadData(); // Reload on error
        }
      } else {
        // Sprint reordering: use moveTask API with status+position
        // Position is per-status globally, but it's the only way to persist order
        try {
          // Update each task's position in the reordered list
          await Promise.all(
            reordered.map((task, index) =>
              apiService.moveTask(task.id, {
                status: task.status,
                position: index,
              })
            )
          );

          toast.success('Ordre sauvegardé');
        } catch (err) {
          console.error('❌ Failed to reorder sprint tasks:', err);
          toast.error('Erreur lors du réordonnancement');
          loadData(); // Reload on error
        }
      }
      
      return;
    }

    // Moving between containers
    if (!isSameContainer) {
      // Update local state optimistically
      setAllTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, sprintId: targetSprintId } : t))
      );

      // Persist to backend
      try {
        await apiService.updateTask(taskId, { sprintId: targetSprintId });
        toast.success(targetSprintId ? 'Tâche ajoutée au sprint' : 'Tâche retirée du sprint');
      } catch {
        toast.error('Erreur lors du déplacement');
        loadData();
      }
    }
  };

  // ─── Sprint actions ───────────────────────────────────────────────────────────
  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSprints) {
      toast.error('Vous n\'avez pas la permission de gérer les sprints');
      return;
    }
    if (!sprintName.trim()) return;
    try {
      await apiService.createSprint(projectId, {
        name: sprintName.trim(),
        goal: sprintGoal.trim() || undefined,
        startDate: sprintStartDate ? new Date(sprintStartDate).toISOString() : undefined,
        endDate: sprintEndDate ? new Date(sprintEndDate).toISOString() : undefined,
      });
      toast.success('Sprint créé !');
      setSprintName(''); setSprintGoal('');
      setIsSprintModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    if (!canManageSprints) {
      toast.error('Vous n\'avez pas la permission de gérer les sprints');
      return;
    }
    try {
      await apiService.startSprint(sprintId);
      toast.success('Sprint démarré ! 🚀');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleCloseSprint = async (sprintId: string) => {
    if (!canManageSprints) {
      toast.error('Vous n\'avez pas la permission de gérer les sprints');
      return;
    }
    try {
      await apiService.closeSprint(sprintId);
      toast.success('Sprint clôturé ! 🎉');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const openEditSprint = (sprint: Sprint) => {
    if (!canManageSprints) {
      toast.error('Vous n\'avez pas la permission de gérer les sprints');
      return;
    }
    setEditingSprint(sprint);
    setEditSprintName(sprint.name);
    setEditSprintGoal(sprint.goal ?? '');
    setEditSprintStartDate(sprint.startDate ? sprint.startDate.split('T')[0] : '');
    setEditSprintEndDate(sprint.endDate ? sprint.endDate.split('T')[0] : '');
  };

  const handleUpdateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSprints) {
      toast.error('Vous n\'avez pas la permission de gérer les sprints');
      return;
    }
    if (!editingSprint || !editSprintName.trim()) return;
    setIsSavingSprint(true);
    try {
      await apiService.updateSprint(editingSprint.id, {
        name: editSprintName.trim(),
        goal: editSprintGoal.trim() || undefined,
        startDate: editSprintStartDate ? new Date(editSprintStartDate).toISOString() : undefined,
        endDate: editSprintEndDate ? new Date(editSprintEndDate).toISOString() : undefined,
      });
      toast.success('Sprint updated!');
      setEditingSprint(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update sprint');
    } finally {
      setIsSavingSprint(false);
    }
  };

  // ─── Epic actions ─────────────────────────────────────────────────────────────
  const [confirmDeleteEpicId, setConfirmDeleteEpicId] = useState<string | null>(null);
  
  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!epicName.trim()) return;
    try {
      await apiService.createEpic(projectId, { name: epicName.trim(), color: epicColor });
      toast.success('Epic créé !');
      setEpicName('');
      setIsEpicModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    try {
      await apiService.deleteEpic(epicId);
      toast.success('Epic supprimé');
      setConfirmDeleteEpicId(null);
      // Clear filter if we're filtering by the deleted epic
      if (activeEpicFilter === epicId) {
        setActiveEpicFilter(null);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  const backlogTasks = applyEpicFilter(allTasks.filter((t) => !t.sprintId));
  const activeTask = activeTaskId ? allTasks.find(t => t.id === activeTaskId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)]">
          <div className="flex items-center gap-3">
            <Rocket className="w-6 h-6 text-violet-500" />
            <div>
              <h3 className="text-base font-bold text-[var(--sp-text)]">Backlog & Gestion des Sprints</h3>
              <p className="text-xs text-[var(--sp-text-muted)]">Planifiez vos itérations, gérez vos Epics et réordonnez vos priorités.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<Target className="w-3.5 h-3.5" />} onClick={() => setIsEpicModalOpen(true)}>
              Nouvel Epic
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              icon={<Plus className="w-3.5 h-3.5" />} 
              onClick={() => canManageSprints ? setIsSprintModalOpen(true) : toast.error('Vous n\'avez pas la permission de gérer les sprints')}
              disabled={!canManageSprints}
            >
              Créer un Sprint
            </Button>
          </div>
        </div>

        {/* Epics filter bar — clickable pills */}
        {epics.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase text-[var(--sp-text-muted)] shrink-0 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-violet-500" /> Epics :
            </span>

            {/* "All" pill */}
            <button
              onClick={() => setActiveEpicFilter(null)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                activeEpicFilter === null
                  ? 'bg-[var(--sp-surface-3)] border-[var(--sp-border-strong)] text-[var(--sp-text)]'
                  : 'bg-[var(--sp-surface)] border-[var(--sp-border)] text-[var(--sp-text-muted)] hover:border-[var(--sp-border-strong)]'
              }`}
            >
              Tous
            </button>

            {epics.map((epic) => {
              const isActive = activeEpicFilter === epic.id;
              const taskCount = allTasks.filter((t) => t.epicId === epic.id).length;
              const isConfirmingDelete = confirmDeleteEpicId === epic.id;
              
              return (
                <div
                  key={epic.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-white border transition group ${
                    isActive ? 'ring-2 ring-white/30 scale-105' : 'opacity-80 hover:opacity-100'
                  } ${isConfirmingDelete ? 'ring-2 ring-rose-500' : ''}`}
                  style={{ backgroundColor: epic.color || '#8b5cf6', borderColor: isActive ? 'white' : 'transparent' }}
                >
                  <button
                    onClick={() => setActiveEpicFilter(isActive ? null : epic.id)}
                    className="flex items-center gap-1.5 cursor-pointer"
                    title={`Filtrer par epic : ${epic.name}`}
                  >
                    {epic.name}
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isActive ? 'bg-white/30' : 'bg-black/20'}`}>
                      {taskCount}
                    </span>
                    {isActive && <X className="w-3 h-3 opacity-70" />}
                  </button>
                  
                  {/* Delete button - shows on hover */}
                  {!isConfirmingDelete ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteEpicId(epic.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:scale-110 transition cursor-pointer ml-1"
                      title="Supprimer cet epic"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteEpic(epic.id)}
                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        Oui
                      </button>
                      <button
                        onClick={() => setConfirmDeleteEpicId(null)}
                        className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        Non
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {activeEpicFilter && (
              <span className="text-xs text-[var(--sp-text-muted)] italic ml-1">
                — filtre actif, {allTasks.filter((t) => t.epicId === activeEpicFilter).length} tâches
              </span>
            )}
          </div>
        )}

        {/* Sprints */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--sp-text-muted)]">
            Sprints du projet ({sprints.length})
          </h4>

          {sprints.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)] text-center text-xs text-[var(--sp-text-muted)]">
              Aucun sprint. Cliquez sur "Créer un Sprint" pour démarrer une itération.
            </div>
          ) : (
            sprints.map((sprint) => {
              const sprintTasks = applyEpicFilter(allTasks.filter((t) => t.sprintId === sprint.id));
              const allSprintTasks = allTasks.filter((t) => t.sprintId === sprint.id);
              const statusColor = sprint.status === 'ACTIVE' ? 'text-emerald-400' : sprint.status === 'CLOSED' ? 'text-[var(--sp-text-muted)]' : 'text-amber-400';

              return (
                <div key={sprint.id} className="p-5 rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)] space-y-4">
                  {/* Sprint header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h5 className="font-bold text-base text-[var(--sp-text)]">{sprint.name}</h5>
                        <Badge color={statusColor} bg="bg-[var(--sp-surface-2)]">
                          {sprint.status || 'PLANNED'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--sp-text-muted)]">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-violet-400" />
                          {sprint.startDate ? formatDate(sprint.startDate) : '—'} → {sprint.endDate ? formatDate(sprint.endDate) : '—'}
                        </span>
                        <span className="text-[var(--sp-text-disabled)]">•</span>
                        <span>{allSprintTasks.length} tâche{allSprintTasks.length !== 1 ? 's' : ''}</span>
                        {activeEpicFilter && sprintTasks.length !== allSprintTasks.length && (
                          <span className="text-violet-400">({sprintTasks.length} filtrées)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditSprint(sprint)}
                        disabled={!canManageSprints}
                        className={`p-1.5 rounded-lg transition ${
                          canManageSprints
                            ? 'text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-2)] cursor-pointer'
                            : 'text-[var(--sp-text-disabled)] cursor-not-allowed opacity-50'
                        }`}
                        title={canManageSprints ? 'Edit sprint' : 'You do not have permission to manage sprints'}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {sprint.status === 'PLANNED' && (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          icon={<Play className="w-3.5 h-3.5" />} 
                          onClick={() => handleStartSprint(sprint.id)}
                          disabled={!canManageSprints}
                        >
                          Démarrer
                        </Button>
                      )}
                      {sprint.status === 'ACTIVE' && confirmCloseId !== sprint.id && (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />} 
                          onClick={() => canManageSprints ? setConfirmCloseId(sprint.id) : toast.error('Vous n\'avez pas la permission de gérer les sprints')}
                          disabled={!canManageSprints}
                        >
                          Clôturer
                        </Button>
                      )}
                      {sprint.status === 'ACTIVE' && confirmCloseId === sprint.id && (
                        <div className="flex items-center gap-2 bg-[var(--sp-surface-2)] border border-rose-500/30 rounded-xl px-3 py-2">
                          <span className="text-xs text-[var(--sp-text-secondary)] font-medium whitespace-nowrap">Close this sprint?</span>
                          <button
                            onClick={() => { setConfirmCloseId(null); handleCloseSprint(sprint.id); }}
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
                          >
                            Yes, close
                          </button>
                          <button
                            onClick={() => setConfirmCloseId(null)}
                            className="px-3 py-1 rounded-lg bg-[var(--sp-surface-3)] hover:bg-slate-600 text-[var(--sp-text-secondary)] text-xs font-semibold transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {sprint.goal && (
                    <p className="text-xs text-[var(--sp-text-muted)] italic bg-[var(--sp-surface-2)] p-2.5 rounded-xl border border-[var(--sp-border)]">
                      🎯 Objectif : {sprint.goal}
                    </p>
                  )}

                  {/* Tasks droppable zone with SortableContext */}
                  <DroppableZone
                    id={`sprint-${sprint.id}`}
                    isEmpty={sprintTasks.length === 0}
                    emptyMessage={
                      activeEpicFilter
                        ? 'Aucune tâche de cet epic dans ce sprint.'
                        : 'Glissez des tâches ici pour les ajouter à ce sprint'
                    }
                  >
                    <SortableContext
                      items={sprintTasks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {sprintTasks.map((task) => (
                          <SortableTask
                            key={task.id}
                            task={task}
                            epics={epics}
                            onSelectTask={onSelectTask}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DroppableZone>
                </div>
              );
            })
          )}
        </div>

        {/* Unplanned backlog */}
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--sp-text-muted)]">
            Tâches non planifiées (Backlog) — {backlogTasks.length}
            {activeEpicFilter && allTasks.filter((t) => !t.sprintId).length !== backlogTasks.length && (
              <span className="text-violet-400 ml-1 normal-case font-normal">
                (filtrées sur {allTasks.filter((t) => !t.sprintId).length})
              </span>
            )}
          </h4>

          <DroppableZone
            id="backlog-tasks"
            isEmpty={backlogTasks.length === 0}
            emptyMessage={
              activeEpicFilter
                ? 'Aucune tâche non planifiée pour cet epic.'
                : 'Toutes les tâches sont planifiées dans des sprints.'
            }
          >
            <SortableContext
              items={backlogTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {backlogTasks.map((task) => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    epics={epics}
                    onSelectTask={onSelectTask}
                  />
                ))}
              </div>
            </SortableContext>
          </DroppableZone>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="flex items-center justify-between p-3 rounded-xl border bg-[var(--sp-surface-2)] border-violet-500/60 shadow-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <GripVertical className="w-4 h-4 text-[var(--sp-text-secondary)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--sp-text)] truncate">
                  {activeTask.title}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Sprint Modal */}
      <Modal isOpen={isSprintModalOpen} onClose={() => setIsSprintModalOpen(false)} title="Nouveau Sprint">
        <form onSubmit={handleCreateSprint} className="space-y-4">
          <Input label="Nom du Sprint" placeholder="Ex: Sprint 1 - Core features" value={sprintName} onChange={(e) => setSprintName(e.target.value)} />
          <Input label="Objectif (optionnel)" placeholder="Ex: Finaliser l'authentification" value={sprintGoal} onChange={(e) => setSprintGoal(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--sp-text-muted)] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-violet-400" /> Début
              </label>
              <input type="date" value={sprintStartDate} onChange={(e) => setSprintStartDate(e.target.value)}
                className="w-full rounded-xl bg-[var(--sp-surface-2)] dark:bg-[var(--sp-surface)] border border-[var(--sp-border)] dark:border-[var(--sp-border)] text-xs py-2.5 px-3 text-[var(--sp-text)] dark:text-[var(--sp-text)] focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--sp-text-muted)] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-violet-400" /> Fin
              </label>
              <input type="date" value={sprintEndDate} onChange={(e) => setSprintEndDate(e.target.value)}
                className="w-full rounded-xl bg-[var(--sp-surface-2)] dark:bg-[var(--sp-surface)] border border-[var(--sp-border)] dark:border-[var(--sp-border)] text-xs py-2.5 px-3 text-[var(--sp-text)] dark:text-[var(--sp-text)] focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsSprintModalOpen(false)}>Annuler</Button>
            <Button variant="primary" type="submit">Créer le Sprint</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Sprint Modal */}
      <Modal isOpen={Boolean(editingSprint)} onClose={() => setEditingSprint(null)} title={`Edit Sprint — ${editingSprint?.name ?? ''}`}>
        <form onSubmit={handleUpdateSprint} className="space-y-4">
          <Input
            label="Sprint name"
            placeholder="e.g. Sprint 1 - Core features"
            value={editSprintName}
            onChange={(e) => setEditSprintName(e.target.value)}
          />
          <Input
            label="Goal (optional)"
            placeholder="e.g. Ship authentication flow"
            value={editSprintGoal}
            onChange={(e) => setEditSprintGoal(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--sp-text-muted)] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-violet-400" /> Start date
              </label>
              <input
                type="date"
                value={editSprintStartDate}
                onChange={(e) => setEditSprintStartDate(e.target.value)}
                className="w-full rounded-xl bg-[var(--sp-surface-2)] dark:bg-[var(--sp-surface)] border border-[var(--sp-border)] dark:border-[var(--sp-border)] text-xs py-2.5 px-3 text-[var(--sp-text)] dark:text-[var(--sp-text)] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--sp-text-muted)] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-violet-400" /> End date
              </label>
              <input
                type="date"
                value={editSprintEndDate}
                onChange={(e) => setEditSprintEndDate(e.target.value)}
                className="w-full rounded-xl bg-[var(--sp-surface-2)] dark:bg-[var(--sp-surface)] border border-[var(--sp-border)] dark:border-[var(--sp-border)] text-xs py-2.5 px-3 text-[var(--sp-text)] dark:text-[var(--sp-text)] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditingSprint(null)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSavingSprint}>Save changes</Button>
          </div>
        </form>
      </Modal>

      {/* Epic Modal */}
      <Modal isOpen={isEpicModalOpen} onClose={() => setIsEpicModalOpen(false)} title="Nouvel Epic">
        <form onSubmit={handleCreateEpic} className="space-y-4">
          <Input label="Nom de l'Epic" placeholder="Ex: Authentification, Facturation" value={epicName} onChange={(e) => setEpicName(e.target.value)} />
          <div>
            <label className="block text-xs font-semibold uppercase text-[var(--sp-text-muted)] mb-1.5">Couleur</label>
            <input type="color" value={epicColor} onChange={(e) => setEpicColor(e.target.value)}
              className="w-16 h-9 rounded-lg bg-transparent cursor-pointer" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsEpicModalOpen(false)}>Annuler</Button>
            <Button variant="primary" type="submit">Créer l'Epic</Button>
          </div>
        </form>
      </Modal>
    </DndContext>
  );
};
