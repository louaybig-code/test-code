import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Input, selectClass } from '../../components/Input';
import { Button } from '../../components/Button';
import { apiService } from '../../services/api';
import { Epic, ProjectFolder, ProjectStatus, Sprint, Task, TaskPriority, UserProfile } from '../../types';
import toast from 'react-hot-toast';
import { CheckSquare, Calendar, Flag, Tag, Layers, User } from 'lucide-react';

const schema = z.object({
  title:      z.string().min(2, 'Title must be at least 2 characters'),
  description:z.string().optional(),
  status:     z.string().optional(),
  priority:   z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  folderId:   z.string().optional().nullable(),
  epicId:     z.string().optional().nullable(),
  sprintId:   z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate:    z.string().optional().nullable(),
  progress:   z.number().min(0).max(100).optional(),
});

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  orgId?: string;
  initialStatus?: string;
  onTaskCreated: (task: Task) => void;
}

/* Small inline label */
const FieldLabel: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <label
    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider mb-1.5"
    style={{ color: 'var(--sp-text-muted)' }}
  >
    {icon && <span className="flex items-center" style={{ color: 'var(--sp-teal)' }}>{icon}</span>}
    {children}
  </label>
);

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen, onClose, projectId, orgId, initialStatus, onTaskCreated,
}) => {
  const [statuses,  setStatuses]  = useState<ProjectStatus[]>([]);
  const [folders,   setFolders]   = useState<ProjectFolder[]>([]);
  const [epics,     setEpics]     = useState<Epic[]>([]);
  const [sprints,   setSprints]   = useState<Sprint[]>([]);
  const [members,   setMembers]   = useState<UserProfile[]>([]);
  const [progress,  setProgress]  = useState<number>(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      priority:   'MEDIUM' as TaskPriority,
      status:     initialStatus || 'todo',
      assigneeId: '',
      progress:   0,
    },
  });

  useEffect(() => {
    if (initialStatus) setValue('status', initialStatus);
  }, [initialStatus, setValue]);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    apiService.getStatuses(projectId).then(setStatuses).catch(() => {});
    apiService.getProjectFolders(projectId).then(setFolders).catch(() => {});
    apiService.getEpics(projectId).then(setEpics).catch(() => {});
    apiService.getSprints(projectId).then(setSprints).catch(() => {});

    const loadMembers = async () => {
      try {
        let oid = orgId;
        if (!oid) {
          const orgs = await apiService.getOrganizations();
          if (orgs?.length) oid = orgs[0].id;
        }
        if (oid) {
          const om = await apiService.getOrgMembers(oid);
          const ul = om?.map((m) => m.user).filter((u): u is UserProfile => Boolean(u));
          if (ul?.length) { setMembers(ul); return; }
        }
      } catch { /* fallback */ }
      setMembers([
        { id: 'u1', email: 'alex@studiopilot.app',  firstName: 'Alexandre', lastName: 'Dev'       },
        { id: 'u2', email: 'jane@studiopilot.app',  firstName: 'Jane',      lastName: 'Doe'       },
        { id: 'u3', email: 'louay@studiopilot.app', firstName: 'Louay',     lastName: 'Kasdallah' },
      ]);
    };
    loadMembers();
  }, [isOpen, projectId, orgId]);

  const onSubmit = async (data: any) => {
    try {
      const clean = {
        ...data,
        folderId:   data.folderId   || null,
        epicId:     data.epicId     || null,
        sprintId:   data.sprintId   || null,
        assigneeId: data.assigneeId || null,
        dueDate:    data.dueDate    ? new Date(data.dueDate).toISOString() : null,
        progress:   progress || 0,
      };
      const task = await apiService.createTask(projectId, clean);
      toast.success('Task created!');
      onTaskCreated(task);
      reset();
      setProgress(0);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error creating task');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task" maxWidth="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Title */}
        <Input
          label="Task Title"
          placeholder="e.g. Implement Kanban drag-and-drop"
          icon={<CheckSquare className="w-4 h-4" />}
          {...register('title')}
          error={errors.title?.message as string}
        />

        {/* Description */}
        <div className="space-y-1.5">
          <label
            className="block text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--sp-text-muted)' }}
          >
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Details, acceptance criteria, context..."
            {...register('description')}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm resize-none
              focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/40 focus:border-[#1A8C8C]/60"
            style={{
              backgroundColor: 'var(--sp-surface-2)',
              border: '1px solid var(--sp-border)',
              color: 'var(--sp-text)',
            }}
          />
        </div>

        {/* Status + Priority */}
        <div className={`grid grid-cols-1 ${initialStatus ? '' : 'sm:grid-cols-2'} gap-4`}>
          {!initialStatus && (
            <div>
              <FieldLabel icon={<Tag className="w-3.5 h-3.5" />}>Status</FieldLabel>
              <select {...register('status')} className={selectClass}>
                {statuses.length > 0
                  ? statuses.map((s) => (
                      <option key={s.id} value={s.key || s.name.toLowerCase()}>{s.name}</option>
                    ))
                  : <>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </>
                }
              </select>
            </div>
          )}

          <div>
            <FieldLabel icon={<Flag className="w-3.5 h-3.5" />}>Priority</FieldLabel>
            <select {...register('priority')} className={selectClass}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        {/* Folder + Epic + Sprint */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel icon={<Layers className="w-3.5 h-3.5" />}>Folder</FieldLabel>
            <select {...register('folderId')} className={selectClass}>
              <option value="">(No folder)</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Epic</FieldLabel>
            <select {...register('epicId')} className={selectClass}>
              <option value="">(No epic)</option>
              {epics.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Sprint</FieldLabel>
            <select {...register('sprintId')} className={selectClass}>
              <option value="">Backlog (no sprint)</option>
              {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
            </select>
          </div>
        </div>

        {/* Assignee + Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel icon={<User className="w-3.5 h-3.5" />}>Assignee</FieldLabel>
            <select {...register('assigneeId')} className={selectClass}>
              <option value="">(Unassigned)</option>
              {members.map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel icon={<Calendar className="w-3.5 h-3.5" />}>Due Date</FieldLabel>
            <input
              type="date"
              {...register('dueDate')}
              className={selectClass}
            />
          </div>
        </div>

        {/* Progress Slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Progress</FieldLabel>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor:
                  progress === 100
                    ? 'rgba(34, 197, 94, 0.15)'
                    : progress >= 70
                    ? 'rgba(20, 184, 166, 0.15)'
                    : progress >= 40
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'rgba(156, 163, 175, 0.15)',
                color:
                  progress === 100
                    ? '#22C55E'
                    : progress >= 70
                    ? '#14B8A6'
                    : progress >= 40
                    ? '#3B82F6'
                    : '#9CA3AF',
              }}
            >
              {progress}%
            </span>
          </div>
          <div className="relative h-2 rounded-full overflow-visible" style={{ backgroundColor: 'var(--sp-surface-2)' }}>
            {/* Visual fill bar */}
            <div
              className="absolute inset-y-0 left-0 transition-all duration-300 rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor:
                  progress === 100
                    ? '#22C55E'
                    : progress >= 70
                    ? '#14B8A6'
                    : progress >= 40
                    ? '#3B82F6'
                    : '#9CA3AF',
              }}
            />
            {/* Draggable thumb/handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-300 pointer-events-none"
              style={{
                left: `calc(${progress}% - 8px)`,
                backgroundColor:
                  progress === 100
                    ? '#22C55E'
                    : progress >= 70
                    ? '#14B8A6'
                    : progress >= 40
                    ? '#3B82F6'
                    : '#9CA3AF',
              }}
            />
            {/* Invisible range input overlay */}
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setProgress(val);
                setValue('progress', val);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ zIndex: 10 }}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex justify-end gap-2 pt-2"
          style={{ borderTop: '1px solid var(--sp-border)' }}
        >
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            type="submit" 
            isLoading={isSubmitting}
          >
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
