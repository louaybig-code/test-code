import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
  useDroppable,
  rectIntersection,
  pointerWithin,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Flag, MessageSquare, Star } from 'lucide-react';
import { apiService } from '../../services/api';
import { BoardData, Task } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { KanbanBoardSkeleton } from '../../components/Skeleton';
import { ErrorView } from '../../components/ErrorView';
import { PRIORITY_CONFIG } from '../../lib/constants';
import { usePermissions } from '../../context/PermissionsContext';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  projectId: string;
  onSelectTask: (task: Task) => void;
  onQuickCreateTask: (statusKey: string) => void;
}

const TaskCard: React.FC<{ task: Task; isDragging: boolean; onClick: () => void }> = ({ task, isDragging, onClick }) => {
  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const progress = task.progress ?? 0;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-[#DDE1E9] dark:border-[#2E3450] bg-white dark:bg-[#1C2033] shadow-sm cursor-pointer select-none transition-all duration-150 ${
        isDragging ? 'rotate-1 scale-105 shadow-2xl ring-2 ring-[#E8531A]/60' : 'hover:shadow-md hover:border-[#1A8C8C]/40'
      }`}
    >
      {progress > 0 && (
        <div
          className="absolute top-0 left-0 h-full pointer-events-none"
          style={{ width: `${progress}%`, backgroundColor: '#22C55E', opacity: 0.25, zIndex: 0 }}
        />
      )}
      <div className="relative p-4" style={{ zIndex: 1 }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-xs font-semibold text-[#1C2033] dark:text-[#E8EAF0] group-hover:text-[#E8531A] leading-snug line-clamp-2">
            {task.title}
          </h4>
          {task.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
        </div>
        {task.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{task.description}</p>}
        <div className="flex items-center justify-between pt-2 border-t border-[#DDE1E9] dark:border-[#2E3450]/60 text-[11px]">
          <Badge color={priorityInfo.color} bg={priorityInfo.bg} icon={<Flag className="w-3 h-3" />}>
            {priorityInfo.label}
          </Badge>
          <div className="flex items-center gap-2 text-[#6B7280] dark:text-[#8890A8]">
            {(task._count?.comments || 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
                {task._count?.comments}
              </span>
            )}
            {task.assignee && (
              <Avatar
                src={task.assignee.avatarUrl}
                firstName={task.assignee.firstName}
                lastName={task.assignee.lastName}
                email={task.assignee.email}
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SortableTask: React.FC<{ task: Task; onSelect: () => void }> = ({ task, onSelect }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} onClick={onSelect} />
    </div>
  );
};

const DroppableColumn: React.FC<{ columnId: string; children: React.ReactNode }> = ({ columnId, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  
  return (
    <div 
      ref={setNodeRef}
      style={{
        backgroundColor: isOver ? 'rgba(26, 140, 140, 0.08)' : 'transparent',
        transition: 'background-color 0.2s',
      }}
    >
      {children}
    </div>
  );
};

const SortableColumn: React.FC<{
  column: BoardData['columns'][0];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectTask: (task: Task) => void;
  onQuickCreate: () => void;
  canCreateTask: boolean;
}> = ({ column, isCollapsed, onToggleCollapse, onSelectTask, onQuickCreate, canCreateTask }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `col-${column.status.id}`,
    data: { type: 'column', columnId: column.status.id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    ...(isDragging ? {
      border: '2px dashed rgba(232, 83, 26, 0.4)',
      backgroundColor: 'transparent',
    } : {}),
  };

  const color = column.status.color || '#6366f1';
  const statusKey = column.status.key || column.status.name.toLowerCase();

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(isCollapsed ? { width: 48, minWidth: 48, maxWidth: 48 } : { flex: 1, minWidth: 220, maxWidth: 320 }),
      }}
      className="flex flex-col shrink-0 rounded-2xl border border-[var(--sp-border)] shadow-md bg-[var(--sp-surface)]"
    >
      <div 
        {...attributes}
        {...listeners}
        className="flex items-center justify-between px-3 py-3 shrink-0 select-none rounded-t-2xl cursor-move" 
        style={{ backgroundColor: color }}
      >
        {isCollapsed ? (
          <div 
            onClick={onToggleCollapse} 
            className="flex-1 flex items-center justify-center cursor-pointer"
          >
            <span
              className="text-white text-xs font-bold tracking-widest whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {column.status.name} ({column.tasks.length})
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-bold text-sm text-white tracking-wide truncate">{column.status.name}</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/20 text-white shrink-0">
                {column.tasks.length}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/25 text-white transition cursor-pointer shrink-0 text-lg font-bold leading-none border-0"
            >
              −
            </button>
          </>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex flex-col flex-1 bg-[#EEF0F4] dark:bg-[#131620]/60 rounded-b-2xl" style={{ minHeight: 120 }}>
          <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2.5 p-3 flex-1" style={{ minHeight: 60 }}>
              {column.tasks.length === 0 ? (
                <DroppableColumn columnId={column.status.id}>
                  <div 
                    className="flex items-center justify-center text-[#6B7280] dark:text-[#8890A8] text-xs italic flex-1"
                    style={{ pointerEvents: 'none', minHeight: 60 }}
                  >
                    Drop tasks here
                  </div>
                </DroppableColumn>
              ) : (
                <>
                  {column.tasks.map((task) => (
                    <SortableTask key={task.id} task={task} onSelect={() => onSelectTask(task)} />
                  ))}
                  <DroppableColumn columnId={`${column.status.id}-bottom`}>
                    <div style={{ minHeight: 40, pointerEvents: 'auto' }} />
                  </DroppableColumn>
                </>
              )}
            </div>
          </SortableContext>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (canCreateTask) {
                onQuickCreate();
              } else {
                toast.error('You do not have permission to create tasks');
              }
            }}
            disabled={!canCreateTask}
            className={`mx-3 mb-3 py-2 rounded-xl border border-dashed text-xs transition flex items-center justify-center gap-1 font-medium shrink-0 bg-transparent ${
              canCreateTask
                ? 'border-[#DDE1E9] dark:border-[#2E3450] hover:border-[#E8531A]/60 text-[#6B7280] hover:text-[#E8531A] cursor-pointer'
                : 'border-[#DDE1E9]/50 dark:border-[#2E3450]/50 text-[#6B7280]/50 cursor-not-allowed opacity-50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Add task
          </button>
        </div>
      )}

      {isCollapsed && <div style={{ flex: 1, minHeight: 40, borderRadius: '0 0 16px 16px', backgroundColor: color }} />}
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = React.memo(({ projectId, onSelectTask, onQuickCreateTask }) => {
  const { hasAbility } = usePermissions();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Permission checks
  const canMoveTask = hasAbility('task:move');
  const canCreateTask = hasAbility('task:create');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Custom collision detection: use pointerWithin for columns, closestCenter for tasks
  const customCollisionDetection: CollisionDetection = (args) => {
    const { active } = args;
    
    // If dragging a column, use pointerWithin for better drop zone detection at the top
    if (active.id.toString().startsWith('col-')) {
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }
      // Fallback to rectIntersection for columns
      return rectIntersection(args);
    }
    
    // For tasks, use closestCenter
    return closestCenter(args);
  };

  const loadBoard = async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    setIsLoading(true);
    setIsError(false);
    try {
      const boardData = await apiService.getBoard(projectId);
      if (boardData?.columns) {
        try {
          const tasksData = await apiService.getProjectTasks(projectId);
          const tasksList: Task[] = Array.isArray(tasksData) ? tasksData : ((tasksData as any)?.data ?? []);

          if (tasksList.length > 0) {
            const taskMap = new Map<string, Task>(tasksList.map((t) => [t.id, t]));
            const enriched = boardData.columns.map((col) => ({
              ...col,
              tasks: col.tasks.map((bt) => taskMap.get(bt.id) ?? bt),
            }));
            setBoard({ columns: enriched.sort((a, b) => (a.status.position ?? 0) - (b.status.position ?? 0)) });
          } else {
            setBoard({ columns: [...boardData.columns].sort((a, b) => (a.status.position ?? 0) - (b.status.position ?? 0)) });
          }
        } catch {
          setBoard({ columns: [...boardData.columns].sort((a, b) => (a.status.position ?? 0) - (b.status.position ?? 0)) });
        }
      } else {
        setBoard({ columns: [] });
      }
    } catch (err) {
      console.error('Failed to load board:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      hasLoadedRef.current = false;
      loadBoard();
    }
  }, [projectId]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const findTaskColumn = (taskId: string) => {
    if (!board) return null;
    return board.columns.find((col) => col.tasks.some((t) => t.id === taskId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    // Check permission before allowing drag
    if (!canMoveTask) {
      toast.error('You do not have permission to move tasks');
      return;
    }
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id as string;
    let overId = over.id as string;

    if (activeId === overId) return;

    // Check if dragging a column
    if (activeId.startsWith('col-')) {
      const activeColId = activeId.replace('col-', '');
      const overColId = overId.startsWith('col-') ? overId.replace('col-', '') : overId;
      
      const oldIndex = board.columns.findIndex((c) => c.status.id === activeColId);
      const newIndex = board.columns.findIndex((c) => c.status.id === overColId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        console.log('🔄 Column reorder:', { from: oldIndex, to: newIndex, activeColId, overColId });
        setBoard((prev) => {
          if (!prev) return prev;
          const reordered = arrayMove(prev.columns, oldIndex, newIndex);
          return { columns: reordered };
        });
      }
      return;
    }

    // Handle bottom drop zone (columnId-bottom)
    const isBottomZone = overId.endsWith('-bottom');
    if (isBottomZone) {
      overId = overId.replace('-bottom', '');
    }

    // Task dragging logic
    const activeColumn = findTaskColumn(activeId);
    
    // Try to find over column by task ID first, then by direct column ID (for empty columns)
    let overColumn = findTaskColumn(overId);
    if (!overColumn) {
      overColumn = board.columns.find((c) => c.status.id === overId);
    }

    if (!activeColumn || !overColumn) {
      return;
    }

    // Don't update if already in correct position
    if (activeColumn.status.id === overColumn.status.id && !isBottomZone) {
      const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
      const overIndex = activeColumn.tasks.findIndex((t) => t.id === overId);
      if (activeIndex === overIndex) return;
    }

    setBoard((prev) => {
      if (!prev) return prev;

      const activeColIndex = prev.columns.findIndex((c) => c.status.id === activeColumn.status.id);
      const overColIndex = prev.columns.findIndex((c) => c.status.id === overColumn.status.id);

      const newColumns = prev.columns.map((c) => ({ ...c, tasks: [...c.tasks] }));
      
      const activeTaskIndex = newColumns[activeColIndex].tasks.findIndex((t) => t.id === activeId);
      if (activeTaskIndex === -1) return prev;
      
      const [task] = newColumns[activeColIndex].tasks.splice(activeTaskIndex, 1);

      // Same column - reorder
      if (activeColIndex === overColIndex) {
        if (isBottomZone) {
          // Drop at bottom
          newColumns[overColIndex].tasks.push(task);
        } else {
          // Check if overId is a task or the column itself
          const overTaskIndex = newColumns[overColIndex].tasks.findIndex((t) => t.id === overId);
          if (overTaskIndex >= 0) {
            // Insert at specific position
            newColumns[overColIndex].tasks.splice(overTaskIndex, 0, task);
          } else {
            // overId is the column itself - add to bottom
            newColumns[overColIndex].tasks.push(task);
          }
        }
      } else {
        // Different column - update status and add to target
        task.status = overColumn.status.key;
        if (isBottomZone) {
          // Drop at bottom of target column
          newColumns[overColIndex].tasks.push(task);
        } else {
          const overTaskIndex = newColumns[overColIndex].tasks.findIndex((t) => t.id === overId);
          if (overTaskIndex >= 0) {
            newColumns[overColIndex].tasks.splice(overTaskIndex, 0, task);
          } else {
            // Dropping into empty column or at end
            newColumns[overColIndex].tasks.push(task);
          }
        }
      }

      return { columns: newColumns };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !board) {
      console.log('❌ No drop target');
      return;
    }

    // Double-check permission
    if (!canMoveTask) {
      toast.error('You do not have permission to move tasks');
      // Reload board to revert optimistic UI update
      hasLoadedRef.current = false;
      loadBoard();
      return;
    }

    const activeId = active.id as string;

    // Column drag end
    if (activeId.startsWith('col-')) {
      console.log('📊 Column drag ended - saving positions');
      
      // Update position numbers based on current order
      const updated = board.columns.map((c, i) => ({ 
        ...c, 
        status: { ...c.status, position: i + 1 } 
      }));
      setBoard({ columns: updated });

      const statusIds = updated.map((c) => c.status.id);
      console.log('💾 Saving column order:', statusIds);
      
      apiService
        .updateBoardColumns(projectId, statusIds)
        .then(() => { 
          console.log('✅ Columns saved successfully'); 
          toast.success('Colonnes réordonnées'); 
        })
        .catch((e: any) => { 
          console.error('❌ Column save error', e); 
          toast.error('Erreur colonne');
          // Reload on error
          hasLoadedRef.current = false;
          loadBoard();
        });
      return;
    }

    // Task drag end
    const activeColumn = findTaskColumn(activeId);
    if (!activeColumn) {
      console.error('❌ Could not find column for task:', activeId);
      return;
    }

    const activeTask = activeColumn.tasks.find((t) => t.id === activeId);
    if (!activeTask) {
      console.error('❌ Could not find task:', activeId);
      return;
    }

    const taskIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
    
    console.log('📤 Moving task:', {
      taskId: activeId,
      taskTitle: activeTask.title,
      status: activeTask.status,
      position: taskIndex,
      columnName: activeColumn.status.name
    });

    // Call API to save - DO NOT reload on success, only on error
    apiService
      .moveTask(activeId, { status: activeTask.status, position: taskIndex })
      .then((response) => {
        console.log('✅ Task moved successfully:', response);
        toast.success('Tâche déplacée');
        // Keep the optimistic UI update, don't reload
      })
      .catch((e: any) => {
        console.error('❌ Task move API error:', e);
        toast.error('Erreur déplacement');
        // Only reload on error to revert
        hasLoadedRef.current = false;
        loadBoard();
      });
  };

  if (isLoading) return <KanbanBoardSkeleton />;
  if (isError || !board) return <ErrorView onRetry={loadBoard} />;

  const columns = board.columns;
  const columnIds = columns.map((c) => `col-${c.status.id}`);
  
  // Find active task or column
  const activeTask = activeId && !activeId.toString().startsWith('col-') 
    ? board.columns.flatMap((c) => c.tasks).find((t) => t.id === activeId) 
    : null;
  
  const activeColumn = activeId && activeId.toString().startsWith('col-')
    ? board.columns.find((c) => `col-${c.status.id}` === activeId.toString())
    : null;

  return (
    <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex items-stretch gap-3 pl-4 pb-4" style={{ overflowX: 'auto', overflowY: 'visible', minHeight: 'calc(100vh - 160px)' }}>
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {columns.map((column) => (
            <SortableColumn
              key={column.status.id}
              column={column}
              isCollapsed={collapsed.has(column.status.id)}
              onToggleCollapse={() => toggleCollapse(column.status.id)}
              onSelectTask={onSelectTask}
              onQuickCreate={() => onQuickCreateTask(column.status.key || column.status.name.toLowerCase())}
              canCreateTask={canCreateTask}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div style={{ opacity: 0.95, transform: 'rotate(2deg)', cursor: 'grabbing' }}>
            <TaskCard task={activeTask} isDragging={true} onClick={() => {}} />
          </div>
        ) : activeColumn ? (
          <div 
            style={{ 
              opacity: 0.95, 
              width: 280,
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 3px rgba(232, 83, 26, 0.5)',
              cursor: 'grabbing',
              transform: 'rotate(-1deg) scale(1.03)',
            }}
            className="rounded-2xl border-2 border-[#E8531A] bg-[var(--sp-surface)]"
          >
            <div 
              className="px-3 py-3 rounded-t-2xl flex items-center gap-2"
              style={{ backgroundColor: activeColumn.status.color }}
            >
              <h3 className="font-bold text-sm text-white tracking-wide">{activeColumn.status.name}</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/20 text-white">
                {activeColumn.tasks.length}
              </span>
            </div>
            <div className="h-20 bg-[#EEF0F4] dark:bg-[#131620]/60 rounded-b-2xl flex items-center justify-center">
              <span className="text-xs text-[#6B7280] dark:text-[#8890A8]">
                {activeColumn.tasks.length} task{activeColumn.tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});
