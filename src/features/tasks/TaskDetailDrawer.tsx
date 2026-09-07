import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Star, Archive, RotateCcw, Plus, Trash2, Paperclip,
  MessageSquare, Activity, FileText, Send, Download,
  CheckCircle2, Circle, Flag, Calendar, Loader2, User,
  Layers, Rocket, Check, Pencil,
} from 'lucide-react';
import { apiService } from '../../services/api';
import {
  Epic, Sprint, Task, TaskComment, TaskActivity,
  TaskSubtask, TaskAttachment, UserProfile,
} from '../../types';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { selectClass } from '../../components/Input';
import { formatDate, formatDateTime, PRIORITY_CONFIG } from '../../lib/constants';
import { usePermissions } from '../../context/PermissionsContext';
import toast from 'react-hot-toast';

interface TaskDetailDrawerProps {
  taskId: string | null;
  orgId?: string;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

/* ── Shared style tokens ── */
const SURFACE = { backgroundColor: 'var(--sp-surface)', border: '1px solid var(--sp-border)' } as const;
const SURFACE2 = { backgroundColor: 'var(--sp-surface-2)', border: '1px solid var(--sp-border)' } as const;
const TEXT    = { color: 'var(--sp-text)' } as const;
const MUTED   = { color: 'var(--sp-text-muted)' } as const;

const tabBtn = (active: boolean) =>
  `py-3 border-b-2 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
    active
      ? 'border-[#E8531A] text-[#E8531A]'
      : 'border-transparent hover:border-[var(--sp-border)]'
  }`;

const miniInput =
  `w-full rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer
   focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/40 focus:border-[#1A8C8C]/60
   border border-[var(--sp-border)] bg-[var(--sp-surface-2)]
   text-[var(--sp-text)] shadow-sm hover:shadow-md hover:border-[#1A8C8C]/30
   transition-all duration-150`;

const metaLabel = `flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1`;

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId, orgId, onClose, onTaskUpdated,
}) => {
  const { hasAbility, loading: permissionsLoading } = usePermissions();
  const [task,       setTask]       = useState<Task | null>(null);
  const [activeTab,  setActiveTab]  = useState<'desc'|'comments'|'activity'|'attachments'>('desc');
  const [isLoading,  setIsLoading]  = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [members,    setMembers]    = useState<UserProfile[]>([]);
  const [epics,      setEpics]      = useState<Epic[]>([]);
  const [sprints,    setSprints]    = useState<Sprint[]>([]);
  const [subtasks,   setSubtasks]   = useState<TaskSubtask[]>([]);
  const [newSub,     setNewSub]     = useState('');
  const [comments,   setComments]   = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [attachments,setAttachments]= useState<TaskAttachment[]>([]);
  const [isUploading,setIsUploading]= useState(false);

  // Store original task for comparison
  const [originalTask, setOriginalTask] = useState<Task | null>(null);

  // Store uploaded filenames locally (workaround for backend returning null fileName)
  const [uploadedFileNames, setUploadedFileNames] = useState<Record<string, string>>({});

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Permission checks
  const canUpdateTask = hasAbility('task:update');
  const canDeleteTask = hasAbility('task:delete');
  const canCreateComment = hasAbility('comment:create');

  const loadTask = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await apiService.getTask(id);
      setTask(data);
      setOriginalTask(data); // Store original for comparison
      setHasChanges(false); // Reset changes flag
      setSubtasks(data.subtasks || []);
      setAttachments(data.attachments || []);
      if (data.projectId) {
        apiService.getEpics(data.projectId).then(setEpics).catch(() => {});
        apiService.getSprints(data.projectId).then(setSprints).catch(() => {});
      }
    } catch { toast.error('Erreur lors du chargement de la tâche'); }
    finally   { setIsLoading(false); }
  };

  useEffect(() => {
    if (!taskId) { setTask(null); return; }
    loadTask(taskId);
    const loadMembers = async () => {
      try {
        // Load the task first to get projectId, then fetch project members only
        const taskData = await apiService.getTask(taskId);
        const pid = taskData?.projectId;
        if (pid) {
          const pm = await apiService.getProjectMembers(pid);
          const ul = pm?.map((m: any) => m.user).filter((u: any): u is UserProfile => Boolean(u));
          if (ul?.length) { setMembers(ul); return; }
        }
        // Fallback: try org members
        let oid = orgId;
        if (!oid) { const orgs = await apiService.getOrganizations(); oid = orgs?.[0]?.id; }
        if (oid) {
          const om = await apiService.getOrgMembers(oid);
          const ul = om?.map((m: any) => m.user).filter((u: any): u is UserProfile => Boolean(u));
          if (ul?.length) { setMembers(ul); return; }
        }
      } catch { /* fallback */ }
      setMembers([]);
    };
    loadMembers();
  }, [taskId, orgId]);

  useEffect(() => {
    if (!taskId) return;
    if (activeTab === 'comments')  apiService.getTaskComments(taskId).then(setComments).catch(() => {});
    if (activeTab === 'activity') {
      apiService.getTaskActivity(taskId).then((data) => {

        setActivities(data);
      }).catch(() => {});
    }
  }, [taskId, activeTab]);

  if (!taskId) return null;

  const priorityInfo = task ? (PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM) : PRIORITY_CONFIG.MEDIUM;

  /* ── Handlers ── */
  const toggleFav = async () => {
    if (!task) return;
    const nxt = !task.isFavorite;
    setTask({ ...task, isFavorite: nxt });
    try { await apiService.toggleFavoriteTask(task.id, nxt); onTaskUpdated?.(); }
    catch { setTask({ ...task, isFavorite: !nxt }); }
  };

  const archive = async () => {
    if (!task) return;
    try {
      task.archivedAt ? await apiService.restoreTask(task.id) : await apiService.archiveTask(task.id);
      toast.success(task.archivedAt ? 'Tâche restaurée' : 'Tâche archivée');
      loadTask(task.id); onTaskUpdated?.();
    } catch (error: any) { 
      toast.error(error?.message || 'Erreur lors de l\'archivage de la tâche'); 
    }
  };

  const assigneeChange = (id: string) => {
    if (!task || !canUpdateTask) {
      if (!canUpdateTask) toast.error('Vous n\'avez pas la permission de modifier les tâches');
      return;
    }
    const user = members.find((m) => m.id === id) ?? null;
    setTask({ ...task, assigneeId: id || null, assignee: user });
    setHasChanges(true); // Mark as changed
  };

  const startEditingTitle = () => {
    if (!canUpdateTask) {
      toast.error('Vous n\'avez pas la permission de modifier les tâches');
      return;
    }
    setEditedTitle(task?.title || '');
    setIsEditingTitle(true);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const saveTitle = async () => {
    if (!task || !editedTitle.trim() || editedTitle === task.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await apiService.updateTask(task.id, { title: editedTitle.trim() });
      setTask({ ...task, title: editedTitle.trim() });
      setOriginalTask({ ...task, title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Titre mis à jour');
      onTaskUpdated?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la mise à jour du titre');
    }
  };

  const handleSaveChanges = async () => {
    if (!task || !hasChanges) return;
    
    if (!canUpdateTask) {
      toast.error('Vous n\'avez pas la permission de modifier les tâches');
      return;
    }
    
    setIsSaving(true);
    try {
      // Prepare update payload with only changed fields
      const updates: Partial<Task> = {};
      
      if (task.assigneeId !== originalTask?.assigneeId) {
        updates.assigneeId = task.assigneeId;
      }
      if (task.epicId !== originalTask?.epicId) {
        updates.epicId = task.epicId;
      }
      if (task.sprintId !== originalTask?.sprintId) {
        updates.sprintId = task.sprintId;
      }
      if (task.priority !== originalTask?.priority) {
        updates.priority = task.priority;
      }
      if (task.progress !== originalTask?.progress) {
        updates.progress = task.progress;
      }
      
      // Update task
      await apiService.updateTask(task.id, updates);
      
      // Update progress separately if changed
      if (updates.progress !== undefined) {
        await apiService.setTaskProgress(task.id, updates.progress);
      }
      
      toast.success('Tâche enregistrée avec succès');
      setOriginalTask(task); // Update original
      setHasChanges(false); // Reset changes flag
      onTaskUpdated?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de l\'enregistrement de la tâche');
    } finally {
      setIsSaving(false);
    }
  };

  const addSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.trim() || !task) return;
    try {
      const sub = await apiService.createSubtask(task.id, { title: newSub.trim() });
      setSubtasks([...subtasks, sub]); setNewSub('');
      onTaskUpdated?.();
    } catch (error: any) { 
      toast.error(error?.message || 'Erreur lors de l\'ajout de la sous-tâche'); 
    }
  };

  const toggleSubtask = async (sub: TaskSubtask) => {
    const nxt = !sub.completed;
    setSubtasks(subtasks.map((s) => s.id === sub.id ? { ...s, completed: nxt } : s));
    try { await apiService.updateSubtask(sub.id, { completed: nxt }); }
    catch { setSubtasks(subtasks.map((s) => s.id === sub.id ? { ...s, completed: sub.completed } : s)); }
  };

  const delSubtask = async (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
    try { await apiService.deleteSubtask(id); }
    catch (error: any) { 
      toast.error(error?.message || 'Erreur lors de la suppression de la sous-tâche'); 
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;
    
    if (!canCreateComment) {
      toast.error('Vous n\'avez pas la permission de créer des commentaires');
      return;
    }
    
    setIsSendingComment(true);
    try {
      const c = await apiService.createComment(task.id, { body: newComment.trim() });
      setComments([c, ...comments]); setNewComment('');
    } catch (error: any) { 
      toast.error(error?.message || 'Erreur lors de l\'envoi du commentaire'); 
    }
    finally { setIsSendingComment(false); }
  };

  const delComment = async (id: string) => {
    if (!canDeleteTask) {
      toast.error('Vous n\'avez pas la permission de supprimer des commentaires');
      return;
    }
    setComments(comments.filter((c) => c.id !== id));
    try { await apiService.deleteComment(id); }
    catch (error: any) { 
      toast.error(error?.message || 'Erreur lors de la suppression du commentaire'); 
    }
  };

  const fileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    setIsUploading(true);
    const originalName = file.name;
    try {
      const uploaded = await apiService.uploadAttachment(task.id, file);

      
      // Store the original filename in our local map (keyed by attachment ID)
      if (uploaded?.id) {
        setUploadedFileNames((prev) => ({
          ...prev,
          [uploaded.id]: originalName,
        }));
      }
      
      toast.success(`"${originalName}" uploaded`);
      // Reload task to sync with server
      await loadTask(task.id);
    }
    catch (error: any) { 
      toast.error(error?.message || 'Erreur lors du téléchargement du fichier'); 
    }
    finally { setIsUploading(false); }
  };

  const delAttachment = async (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
    try { await apiService.deleteAttachment(id); }
    catch (error: any) { 
      toast.error(error?.message || 'Erreur lors de la suppression de la pièce jointe'); 
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,17,23,0.65)', backdropFilter: 'blur(5px)' }}
        />
        {/* Drawer panel */}
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-2xl flex flex-col h-full z-10 overflow-hidden"
          style={{ ...SURFACE, borderLeft: '1px solid var(--sp-border)', boxShadow: 'var(--sp-shadow-lg)' }}
        >
          {/* ── Loading ── */}
          {isLoading || !task ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#E8531A] border-t-transparent animate-spin" />
              <p className="text-xs" style={MUTED}>Chargement de la tâche...</p>
            </div>
          ) : (
            <>
              {/* ── Top action bar ── */}
              <div
                className="px-5 py-3 flex items-center justify-between shrink-0"
                style={{ borderBottom: '1px solid var(--sp-border)', backgroundColor: 'var(--sp-surface-2)' }}
              >
                <div className="flex items-center gap-2">
                  {/* Favourite */}
                  <button
                    onClick={toggleFav}
                    className="p-1.5 rounded-lg border transition cursor-pointer"
                    style={task.isFavorite
                      ? { backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.35)', color: '#F59E0B' }
                      : { borderColor: 'var(--sp-border)', color: 'var(--sp-text-muted)' }
                    }
                  >
                    <Star className={`w-4 h-4 ${task.isFavorite ? 'fill-amber-400' : ''}`} />
                  </button>
                  {/* Archive */}
                  <button
                    onClick={archive}
                    className="p-1.5 rounded-lg border transition cursor-pointer"
                    style={{ borderColor: 'var(--sp-border)', color: 'var(--sp-text-muted)' }}
                    title={task.archivedAt ? 'Restaurer' : 'Archiver'}
                  >
                    {task.archivedAt
                      ? <RotateCcw className="w-4 h-4" style={{ color: 'var(--sp-teal)' }} />
                      : <Archive className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition cursor-pointer"
                  style={{ color: 'var(--sp-text-muted)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Task meta header ── */}
              <div className="px-6 py-5 space-y-4 shrink-0" style={{ borderBottom: '1px solid var(--sp-border)' }}>
                {/* Task Title - Editable */}
                <div className="group relative">
                  {!isEditingTitle ? (
                    <div className="flex items-start gap-3">
                      <h2 className="text-xl font-bold leading-snug flex-1" style={{ ...TEXT, fontFamily: "'Sora', sans-serif" }}>
                        {task.title}
                      </h2>
                      {canUpdateTask && (
                        <button
                          onClick={startEditingTitle}
                          className="p-1.5 rounded-lg transition cursor-pointer opacity-0 group-hover:opacity-100"
                          style={{ color: 'var(--sp-text-muted)', backgroundColor: 'var(--sp-surface-2)' }}
                          title="Modifier le titre"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle();
                          if (e.key === 'Escape') cancelEditingTitle();
                        }}
                        className="flex-1 text-xl font-bold leading-snug px-3 py-2 rounded-xl border-2 focus:outline-none"
                        style={{
                          ...TEXT,
                          fontFamily: "'Sora', sans-serif",
                          backgroundColor: 'var(--sp-surface-2)',
                          borderColor: 'var(--sp-teal)',
                        }}
                        autoFocus
                      />
                      <button
                        onClick={saveTitle}
                        className="p-2 rounded-lg transition cursor-pointer"
                        style={{ backgroundColor: 'var(--sp-teal)', color: 'white' }}
                        title="Enregistrer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditingTitle}
                        className="p-2 rounded-lg transition cursor-pointer"
                        style={{ backgroundColor: 'var(--sp-surface-2)', color: 'var(--sp-text-muted)' }}
                        title="Annuler"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Status / Priority / Due Date badges */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="teal" className="uppercase font-mono">{task.status}</Badge>
                  <Badge color={priorityInfo.color} bg={priorityInfo.bg} icon={<Flag className="w-3 h-3" />}>
                    {priorityInfo.label}
                  </Badge>
                  {task.dueDate && (
                    <Badge variant="orange" icon={<Calendar className="w-3 h-3" />}>
                      Due {formatDate(task.dueDate)}
                    </Badge>
                  )}
                </div>

                {/* Epic + Sprint + Priority selectors */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className={metaLabel} style={MUTED}>
                      <Layers className="w-3 h-3" style={{ color: 'var(--sp-teal)' }} /> Epic
                    </p>
                    <select
                      value={task.epicId || ''}
                      onChange={(e) => {
                        const epicId = e.target.value || null;
                        setTask({ ...task, epicId });
                        setHasChanges(true);
                      }}
                      disabled={!canUpdateTask}
                      className={miniInput + (!canUpdateTask ? ' opacity-50 cursor-not-allowed' : '')}
                    >
                      <option value="">(Pas d'epic)</option>
                      {epics.map((ep) => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className={metaLabel} style={MUTED}>
                      <Rocket className="w-3 h-3" style={{ color: 'var(--sp-orange)' }} /> Sprint
                    </p>
                    <select
                      value={task.sprintId || ''}
                      onChange={(e) => {
                        const sprintId = e.target.value || null;
                        setTask({ ...task, sprintId });
                        setHasChanges(true);
                      }}
                      disabled={!canUpdateTask}
                      className={miniInput + (!canUpdateTask ? ' opacity-50 cursor-not-allowed' : '')}
                    >
                      <option value="">(Backlog)</option>
                      {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <p className={metaLabel} style={MUTED}>
                      <Flag className="w-3 h-3" style={{ color: 'var(--sp-violet)' }} /> Priorité
                    </p>
                    <select
                      value={task.priority || 'MEDIUM'}
                      onChange={(e) => {
                        setTask({ ...task, priority: e.target.value as any });
                        setHasChanges(true);
                      }}
                      disabled={!canUpdateTask}
                      className={miniInput + (!canUpdateTask ? ' opacity-50 cursor-not-allowed' : '')}
                    >
                      <option value="LOW">🟢 Basse</option>
                      <option value="MEDIUM">🟡 Moyenne</option>
                      <option value="HIGH">🟠 Haute</option>
                      <option value="URGENT">🔴 Urgente</option>
                    </select>
                  </div>
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--sp-border)' }}>
                  <User className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--sp-teal)' }} />
                  <span className="text-xs font-semibold" style={MUTED}>Assigné à</span>
                  {task.assignee && (
                    <Avatar
                      src={task.assignee.avatarUrl}
                      firstName={task.assignee.firstName}
                      lastName={task.assignee.lastName}
                      email={task.assignee.email}
                      size="sm"
                    />
                  )}
                  <select
                    value={task.assigneeId || task.assignee?.id || ''}
                    onChange={(e) => assigneeChange(e.target.value)}
                    disabled={!canUpdateTask}
                    className={miniInput + ' max-w-[200px]' + (!canUpdateTask ? ' opacity-50 cursor-not-allowed' : '')}
                  >
                    <option value="">(Non assigné)</option>
                    {members.map((u) => (
                      <option key={u.id} value={u.id}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Progress Slider */}
                <div className="pt-3" style={{ borderTop: '1px solid var(--sp-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold flex items-center gap-1.5" style={MUTED}>
                      <span>Progression</span>
                    </span>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor:
                          (task.progress ?? 0) === 100
                            ? 'rgba(34, 197, 94, 0.15)'
                            : (task.progress ?? 0) >= 70
                            ? 'rgba(20, 184, 166, 0.15)'
                            : (task.progress ?? 0) >= 40
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(156, 163, 175, 0.15)',
                        color:
                          (task.progress ?? 0) === 100
                            ? '#22C55E'
                            : (task.progress ?? 0) >= 70
                            ? '#14B8A6'
                            : (task.progress ?? 0) >= 40
                            ? '#3B82F6'
                            : '#9CA3AF',
                      }}
                    >
                      {task.progress ?? 0}%
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full overflow-visible" style={{ backgroundColor: 'var(--sp-surface-2)' }}>
                    {/* Visual fill bar */}
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-300 rounded-full"
                      style={{
                        width: `${task.progress ?? 0}%`,
                        backgroundColor:
                          (task.progress ?? 0) === 100
                            ? '#22C55E'
                            : (task.progress ?? 0) >= 70
                            ? '#14B8A6'
                            : (task.progress ?? 0) >= 40
                            ? '#3B82F6'
                            : '#9CA3AF',
                      }}
                    />
                    {/* Draggable thumb/handle */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-300 pointer-events-none"
                      style={{
                        left: `calc(${task.progress ?? 0}% - 8px)`,
                        backgroundColor:
                          (task.progress ?? 0) === 100
                            ? '#22C55E'
                            : (task.progress ?? 0) >= 70
                            ? '#14B8A6'
                            : (task.progress ?? 0) >= 40
                            ? '#3B82F6'
                            : '#9CA3AF',
                      }}
                    />
                    {/* Invisible range input overlay */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={task.progress ?? 0}
                      onChange={(e) => {
                        const newProgress = parseInt(e.target.value, 10);
                        setTask({ ...task, progress: newProgress });
                        setHasChanges(true);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      style={{ zIndex: 10 }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Tabs ── */}
              <div
                className="flex gap-5 px-6 shrink-0 overflow-x-auto no-scrollbar"
                style={{ borderBottom: '1px solid var(--sp-border)', backgroundColor: 'var(--sp-surface-2)' }}
              >
                <button onClick={() => setActiveTab('desc')} className={tabBtn(activeTab === 'desc')} style={activeTab !== 'desc' ? MUTED : {}}>
                  <FileText className="w-4 h-4" /> Description
                </button>
                <button onClick={() => setActiveTab('comments')} className={tabBtn(activeTab === 'comments')} style={activeTab !== 'comments' ? MUTED : {}}>
                  <MessageSquare className="w-4 h-4" /> Commentaires ({comments.length})
                </button>
                <button onClick={() => setActiveTab('activity')} className={tabBtn(activeTab === 'activity')} style={activeTab !== 'activity' ? MUTED : {}}>
                  <Activity className="w-4 h-4" /> Activité
                </button>
                <button onClick={() => setActiveTab('attachments')} className={tabBtn(activeTab === 'attachments')} style={activeTab !== 'attachments' ? MUTED : {}}>
                  <Paperclip className="w-4 h-4" /> Fichiers ({attachments.length})
                </button>
              </div>

              {/* ── Tab content ── */}
              <div className="flex-1 overflow-y-auto sp-scrollbar px-6 py-5 space-y-5">

                {/* Description & Subtasks */}
                {activeTab === 'desc' && (
                  <div className="space-y-6">
                    <div>
                      <p className="sp-label mb-2">Description</p>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-line p-4 rounded-xl"
                        style={{ ...SURFACE2, color: 'var(--sp-text-secondary)' }}
                      >
                        {task.description || 'Aucune description ajoutée.'}
                      </p>
                    </div>

                    {/* Subtasks */}
                    <div>
                      <p className="sp-label mb-3">
                        Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
                      </p>
                      <div className="space-y-2 mb-3">
                        {subtasks.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-2.5 rounded-xl group"
                            style={SURFACE2}
                          >
                            <button onClick={() => toggleSubtask(sub)} className="flex items-center gap-2.5 text-xs text-left cursor-pointer flex-1 min-w-0">
                              {sub.completed
                                ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--sp-teal)' }} />
                                : <Circle className="w-4 h-4 shrink-0" style={{ color: 'var(--sp-text-muted)' }} />}
                              <span className={sub.completed ? 'line-through' : ''} style={sub.completed ? MUTED : TEXT}>
                                {sub.title}
                              </span>
                            </button>
                            <button
                              onClick={() => delSubtask(sub.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded transition cursor-pointer"
                              style={{ color: 'var(--sp-text-muted)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={addSubtask} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ajouter une sous-tâche..."
                          value={newSub}
                          onChange={(e) => setNewSub(e.target.value)}
                          className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/40"
                          style={SURFACE2}
                        />
                        <Button variant="secondary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>Ajouter</Button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {activeTab === 'comments' && (
                  <div className="space-y-5">
                    {canCreateComment ? (
                      <form onSubmit={addComment} className="space-y-3">
                        <textarea
                          rows={3}
                          placeholder="Écrire un commentaire..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="w-full rounded-xl px-3.5 py-2.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/40"
                          style={SURFACE2}
                        />
                        <div className="flex justify-end">
                          <Button variant="primary" size="sm" type="submit" isLoading={isSendingComment} icon={<Send className="w-3.5 h-3.5" />}>
                            Post
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-400">Vous n'avez pas la permission de créer des commentaires</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {comments.map((c) => {
                        const isConfirming = confirmDeleteCommentId === c.id;
                        return (
                          <div key={c.id} className={`p-4 rounded-xl space-y-2 transition ${isConfirming ? 'ring-1 ring-rose-500/40' : ''}`} style={SURFACE2}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar src={c.author?.avatarUrl} firstName={c.author?.firstName} lastName={c.author?.lastName} email={c.author?.email} size="sm" />
                                <span className="text-xs font-bold" style={TEXT}>{c.author?.firstName} {c.author?.lastName}</span>
                                <span className="text-[10px]" style={MUTED}>{formatDateTime(c.createdAt)}</span>
                              </div>
                              {canDeleteTask && !isConfirming && (
                                <button
                                  onClick={() => setConfirmDeleteCommentId(c.id)}
                                  className="p-1 rounded cursor-pointer hover:text-rose-500 transition"
                                  style={MUTED}
                                  title="Supprimer ce commentaire"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--sp-text-secondary)' }}>{c.body}</p>

                            {/* Inline confirm */}
                            {isConfirming && (
                              <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 gap-3">
                                <p className="text-xs text-rose-400 font-semibold">Supprimer ce commentaire ?</p>
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    onClick={() => { setConfirmDeleteCommentId(null); delComment(c.id); }}
                                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
                                  >
                                    Oui
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteCommentId(null)}
                                    className="px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    style={SURFACE2}
                                  >
                                    Non
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Activity */}
                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    {activities.length === 0
                      ? <p className="text-xs text-center py-6" style={MUTED}>No activity history yet.</p>
                      : activities.map((act) => {
                          // Support both new API shape (actor/type/data) and legacy (user/action/changes)
                          const actor = act.actor || act.user;
                          const eventType = act.type || act.action || '';
                          const eventData = act.data || act.changes || {};

                          const userName = actor
                            ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email || 'Unknown'
                            : 'Someone';

                          // Map event types to human-readable verbs
                          let actionVerb = '';
                          if (!eventType) {
                            actionVerb = 'performed an action';
                          } else if (eventType === 'task.created') {
                            actionVerb = 'created this task';
                          } else if (eventType === 'task.updated') {
                            actionVerb = 'updated this task';
                          } else if (eventType === 'task.moved' || eventType === 'task.move') {
                            const from = eventData.from;
                            const to = eventData.to;
                            if (from && to && from !== to) {
                              actionVerb = `moved this task from`;
                            } else if (from && to && from === to) {
                              actionVerb = `reordered this task in`;
                            } else {
                              actionVerb = 'moved this task';
                            }
                          } else if (eventType === 'task.archived') {
                            actionVerb = 'archived this task';
                          } else if (eventType === 'task.restored') {
                            actionVerb = 'restored this task';
                          } else if (eventType === 'task.deleted') {
                            actionVerb = 'deleted this task';
                          } else if (eventType === 'comment.created') {
                            actionVerb = 'commented on this task';
                          } else if (eventType === 'comment.updated') {
                            actionVerb = 'updated a comment';
                          } else if (eventType === 'comment.deleted') {
                            actionVerb = 'deleted a comment';
                          } else {
                            actionVerb = eventType.replace(/\./g, ' ').replace(/_/g, ' ');
                          }

                          // Build change detail label
                          let changeDetails: React.ReactNode = null;
                          const from = eventData.from;
                          const to = eventData.to;

                          if ((eventType === 'task.moved' || eventType === 'task.move') && from && to) {
                            if (from !== to) {
                              // Status change — show from → to inline with the verb
                              changeDetails = (
                                <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--sp-text-secondary)' }}>
                                  <span
                                    className="inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold mr-1"
                                    style={{ backgroundColor: 'rgba(107,114,128,0.15)', color: 'var(--sp-text-secondary)' }}
                                  >
                                    {from}
                                  </span>
                                  <span className="mx-1">→</span>
                                  <span
                                    className="inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold"
                                    style={{ backgroundColor: 'rgba(26,140,140,0.15)', color: 'var(--sp-teal)' }}
                                  >
                                    {to}
                                  </span>
                                </p>
                              );
                              // Override verb to be simpler since labels handle the detail
                              actionVerb = 'moved this task';
                            } else {
                              // Same column reorder
                              changeDetails = (
                                <p className="text-[10px] mt-0.5" style={MUTED}>
                                  in <span className="font-mono">{to}</span>
                                </p>
                              );
                              actionVerb = 'reordered this task';
                            }
                          } else if (from && to) {
                            changeDetails = (
                              <div className="flex items-center gap-2 mt-1.5 text-xs">
                                <span
                                  className="px-2 py-0.5 rounded-md font-mono text-[10px]"
                                  style={{ backgroundColor: 'rgba(107,114,128,0.15)', color: 'var(--sp-text-secondary)' }}
                                >
                                  {from}
                                </span>
                                <span style={MUTED}>→</span>
                                <span
                                  className="px-2 py-0.5 rounded-md font-mono text-[10px]"
                                  style={{ backgroundColor: 'rgba(26,140,140,0.15)', color: 'var(--sp-teal)' }}
                                >
                                  {to}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div key={act.id} className="flex items-start gap-3 p-3.5 rounded-xl" style={SURFACE2}>
                              {actor ? (
                                <Avatar
                                  src={actor.avatarUrl}
                                  firstName={actor.firstName}
                                  lastName={actor.lastName}
                                  email={actor.email}
                                  size="sm"
                                />
                              ) : (
                                <div
                                  className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: 'rgba(26, 140, 140, 0.1)' }}
                                >
                                  <Activity className="w-4 h-4" style={{ color: 'var(--sp-teal)' }} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs leading-relaxed" style={TEXT}>
                                  <span className="font-bold">{userName}</span>
                                  {' '}
                                  <span style={{ color: 'var(--sp-text-secondary)' }}>{actionVerb}</span>
                                </p>
                                {changeDetails}
                                <span className="text-[10px] mt-1.5 inline-block" style={MUTED}>
                                  {formatDateTime(act.createdAt)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                    }
                  </div>
                )}

                {/* Attachments */}
                {activeTab === 'attachments' && (
                  <div className="space-y-4">
                    <label
                      className="flex flex-col items-center gap-2 p-6 rounded-xl cursor-pointer transition-colors"
                      style={{
                        border: '2px dashed var(--sp-border)',
                        backgroundColor: 'var(--sp-surface-2)',
                      }}
                    >
                      <Paperclip className="w-6 h-6" style={{ color: 'var(--sp-teal)' }} />
                      <p className="text-xs font-semibold" style={MUTED}>
                        {isUploading ? 'Uploading...' : 'Click or drag to upload a file'}
                      </p>
                      <input type="file" className="hidden" onChange={fileUpload} disabled={isUploading} />
                    </label>

                    <div className="space-y-2">
                      {attachments.map((att) => {
                        // Build filename with priority:
                        // 1. Backend filename (lowercase)
                        // 2. Backend fileName (camelCase, for backward compatibility)
                        // 3. Locally stored upload name (fallback if backend fails)
                        // 4. Extract from URL
                        // 5. Generic fallback
                        const displayName = att.filename
                          || att.fileName
                          || uploadedFileNames[att.id]
                          || (att.url ? decodeURIComponent(att.url.split('/').pop()?.split('?')[0] || '') : '')
                          || `Attachment ${att.id.slice(0, 6)}`;

                        return (
                          <div key={att.id} className="flex items-center justify-between p-3 rounded-xl" style={SURFACE2}>
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--sp-orange)' }} />
                              <span className="text-xs font-medium truncate" style={TEXT}>
                                {displayName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await apiService.downloadAttachment(att.id);
                                    const blob = new Blob([res.data], {
                                      type: res.headers['content-type'] || 'application/octet-stream',
                                    });
                                    // Extract filename from Content-Disposition header if available
                                    const disposition = res.headers['content-disposition'] || '';
                                    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
                                    const serverFileName = match ? decodeURIComponent(match[1].trim()) : null;
                                    // Use same priority for download filename
                                    const downloadName = serverFileName
                                      || att.filename
                                      || att.fileName
                                      || uploadedFileNames[att.id]
                                      || (att.url ? decodeURIComponent(att.url.split('/').pop()?.split('?')[0] || '') : '')
                                      || 'attachment';
                                    const objectUrl = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = objectUrl;
                                    a.download = downloadName;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    window.URL.revokeObjectURL(objectUrl);
                                  } catch (error: any) {
                                    toast.error(error?.message || 'Erreur lors du téléchargement du fichier');
                                  }
                                }}
                                className="p-1.5 rounded cursor-pointer"
                                style={MUTED}
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button onClick={() => delAttachment(att.id)} className="p-1.5 rounded cursor-pointer" style={MUTED}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button (sticky at bottom) */}
              {hasChanges && (
                <div
                  className="px-6 py-4 shrink-0 flex items-center justify-end gap-3"
                  style={{
                    borderTop: '1px solid var(--sp-border)',
                    backgroundColor: 'var(--sp-surface-2)',
                  }}
                >
                  <button
                    onClick={() => {
                      if (originalTask) {
                        setTask(originalTask);
                        setHasChanges(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--sp-surface)',
                      border: '1px solid var(--sp-border)',
                      color: 'var(--sp-text-muted)',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving || !canUpdateTask}
                    className="px-5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--sp-teal)',
                      color: 'white',
                    }}
                    title={!canUpdateTask ? 'Vous n\'avez pas la permission de modifier les tâches' : ''}
                  >
                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
