import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FieldSelect } from '../../components/ui/Select';
import { DatePickerField } from '../../components/ui/DatePicker';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/Icon';
import { SkeletonLines } from '../../components/ui/Skeleton';
import { Spinner } from '../../components/ui/Spinner';
import { apiService, API_BASE_URL, getAccessToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PermissionsProvider, usePermissions } from '../../context/PermissionsContext';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { formatDateTime, getUserInitials, PRIORITY_CONFIG, formatRelativeTime } from '../../lib/constants';
import { Task, TaskActivity, TaskComment, TaskSubtask, TaskAttachment } from '../../types';

interface TaskDetailSheetProps {
  taskId: string | null;
  onClose: () => void;
}

/**
 * TaskDetailSheet — port of web `features/tasks/TaskDetailDrawer.tsx` (1080 lines).
 * Same sections & data contract: header actions (favorite / archive / delete),
 * editable title+description, status/priority/assignee/due-date selects with
 * dirty-tracking + single save button, progress slider, subtasks, comments,
 * attachments (pick / open / delete) and activity log.
 */
export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({ taskId, onClose }) => {
  const { activeProject } = useAppState();
  // Body sits inside its own PermissionsProvider (the task shop provides the project id;
  // without an open task there are no abilities anyway).
  return (
    <PermissionsProvider projectId={taskId ? (activeProject?.id ?? null) : null}>
      <TaskDetailBody taskId={taskId} onClose={onClose} />
    </PermissionsProvider>
  );
};

const TaskDetailBody: React.FC<TaskDetailSheetProps> = ({ taskId, onClose }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { activeProject } = useAppState();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  // editable fields (dirty track like web)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [epicId, setEpicId] = useState<string | null>(null);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // panel data
  const [statuses, setStatuses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [attachmentsBusy, setAttachmentsBusy] = useState<string | null>(null);

  // comments composer
  const [commentDraft, setCommentDraft] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // subtask composer
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  // delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { hasAbility } = usePermissions();
  const canEdit = hasAbility('task:update');
  const canDelete = hasAbility('task:delete');
  const canComment = hasAbility('comment:create');

  // ── load everything (same as web: abortless parallel fetch) ─────────────
  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    setHasChanges(false);
    setComments([]);
    setActivity([]);
    setAttachments([]);
    setConfirmDelete(false);

    const tid = taskId;
    const pjId = activeProject?.id ?? undefined;

    apiService
      .getTask(tid)
      .then((data: any) => {
        const t = data as Task;
        setTask(t);
        setTitle(t.title ?? '');
        setDescription(t.description ?? '');
        setStatus((t as any).status ?? '');
        setPriority((t as any).priority ?? 'MEDIUM');
        setAssigneeId((t as any).assigneeId ?? null);
        setEpicId((t as any).epicId ?? null);
        setSprintId((t as any).sprintId ?? null);
        setDueDate((t as any).dueDate ? String(t.dueDate).slice(0, 10) : null);
        setProgress((t as any).progress ?? 0);
        setAttachments((t as any).attachments ?? []);
      })
      .catch((err: any) => toast.error(err.message || 'Impossible de charger la tâche'))
      .finally(() => setLoading(false));

    apiService.getTaskComments(tid).then((c: any) => setComments(c ?? [])).catch(() => {});
    apiService.getTaskActivity(tid).then((data: any) => setActivity(data ?? [])).catch(() => {});

    if (pjId) {
      apiService.getStatuses(pjId).then((d: any) => setStatuses(d ?? [])).catch(() => {});
      // web parity: epic & sprint option lists for the edit selects
      apiService.getEpics(pjId).then((d: any) => setEpics(d ?? [])).catch(() => {});
      apiService.getSprints(pjId).then((d: any) => setSprints(d ?? [])).catch(() => {});
      apiService
        .getProjectMembers(pjId)
        .then((ms: any) => {
          const list = (Array.isArray(ms) ? ms : ms?.members ?? []) as any[];
          setMembers(list);
        })
        .catch(() => {});
    }
  }, [taskId]);

  // mark dirty on edits
  const mark = (fn: () => void) => () => {
    fn();
    setHasChanges(true);
  };

  // ── save ────────────────────────────────────────────────────────────────
  const handleSaveChanges = async () => {
    if (!task || !hasChanges) return;
    setSaving(true);
    try {
      // web parity: progress goes through setTaskProgress, not updateTask
      const progressChanged = progress !== ((task as any).progress ?? 0);
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigneeId: assigneeId || null,
        epicId: epicId || null,
        sprintId: sprintId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };
      const updated: any = await apiService.updateTask(task.id, payload);
      if (progressChanged) {
        try {
          await apiService.setTaskProgress(task.id, progress);
        } catch { /* non-fatal: field update already saved */ }
      }
      setTask((prev) => (prev ? { ...prev, ...updated, progress } : prev));
      setHasChanges(false);
      toast.success('Modifications enregistrées');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ── header actions ──────────────────────────────────────────────────────
  const changeTaskState = (patch: Partial<Task>) => {
    setTask((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleFavorite = async () => {
    if (!task) return;
    const fav = !(task as any).isFavorite;
    changeTaskState({ isFavorite: fav } as any);
    try {
      await apiService.toggleFavoriteTask(task.id, fav);
    } catch (err: any) {
      changeTaskState({ isFavorite: !fav } as any);
      toast.error(err.message || 'Erreur');
    }
  };

  const handleArchive = async () => {
    if (!task) return;
    const archived = !(task as any).archivedAt;
    try {
      if (archived) {
        await apiService.archiveTask(task.id);
        toast.success('Tâche archivée');
        changeTaskState({ archivedAt: new Date().toISOString() } as any);
      } else {
        await apiService.restoreTask(task.id);
        toast.success('Tâche restaurée');
        changeTaskState({ archivedAt: null } as any);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      await apiService.deleteTask(task.id);
      toast.success('Tâche supprimée');
      setConfirmDelete(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Impossible de supprimer');
    } finally {
      setDeleting(false);
    }
  };

  const handleRefetchProgress = async (p: number) => {
    if (!task) return;
    setProgress(p);
    setHasChanges(true);
  };

  // ── subtasks ─────────────────────────────────────────────────────────────
  const subtasks: TaskSubtask[] = (task as any)?.subtasks ?? [];

  const addSubtask = async () => {
    if (!task || !subtaskDraft.trim()) return;
    setAddingSubtask(true);
    try {
      const sub = await apiService.createSubtask(task.id, { title: subtaskDraft.trim() });
      changeTaskState({ subtasks: [...subtasks, sub] } as any);
      setSubtaskDraft('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setAddingSubtask(false);
    }
  };

  const toggleSubtask = async (sub: TaskSubtask) => {
    if (!task) return;
    const updated = subtasks.map((s) => (s.id === sub.id ? { ...s, completed: !s.completed } : s));
    changeTaskState({ subtasks: updated } as any);
    try {
      await apiService.updateSubtask(sub.id, { completed: !sub.completed });
    } catch (err: any) {
      changeTaskState({ subtasks: subtasks } as any);
      toast.error(err.message || 'Erreur');
    }
  };

  const deleteSubtask = async (sub: TaskSubtask) => {
    if (!task) return;
    const before = subtasks;
    changeTaskState({ subtasks: subtasks.filter((s) => s.id !== sub.id) } as any);
    try {
      await apiService.deleteSubtask(sub.id);
    } catch (err: any) {
      changeTaskState({ subtasks: before } as any);
      toast.error(err.message || 'Erreur');
    }
  };

  // ── comments ────────────────────────────────────────────────────────────
  const addComment = async () => {
    if (!task || !commentDraft.trim()) return;
    setSendingComment(true);
    try {
      const c = await apiService.createComment(task.id, { body: commentDraft.trim() });
      setComments((prev) => [...prev, c]);
      setCommentDraft('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSendingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    const before = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await apiService.deleteComment(commentId);
    } catch (err: any) {
      setComments(before);
      toast.error(err.message || 'Erreur');
    }
  };

  // ── attachments ─────────────────────────────────────────────────────────
  const pickFile = async () => {
    if (!task) return;
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: '*/*',
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setAttachmentsBusy('upload');
    try {
      const uploaded = await apiService.uploadAttachment(task.id, {
        uri: a.uri,
        name: a.name ?? 'fichier',
        type: a.mimeType ?? 'application/octet-stream',
      } as any);
      setAttachments((prev) => [...prev, uploaded]);
      toast.success('Pièce jointe ajoutée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur de téléversement');
    } finally {
      setAttachmentsBusy(null);
    }
  };

  const openAttachment = async (att: TaskAttachment) => {
    const id = att.id;
    setAttachmentsBusy(id);
    try {
      // resolve the authenticated download URL (may 302 → signed URL), like web
      const res = await apiService.downloadAttachment(id);
      const url: string =
        (res as any)?.request?.responseURL ||
        (res as any)?.config?.url ||
        `${API_BASE_URL}/api/v1/attachments/${id}/download`;

      if ((Sharing as any) && (await (Sharing as any).isAvailableAsync?.()) && !url.startsWith('blob:')) {
        const target = await (FileSystem as any).downloadAsync?.(
          url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
          (FileSystem as any).cacheDirectory + (att as any).fileName?.replace(/[^\w.\-]/g, '_') || 'fichier',
          {
            headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : undefined,
          }
        );
        if (target?.uri) {
          await (Sharing as any).shareAsync(target.uri);
          return;
        }
      }
      toast.success('Téléchargement terminé');
    } catch (err: any) {
      // signed-URL style: even a non-2xx after redirect often means the file was fetched.
      toast.error(err.message || 'Erreur lors du téléchargement');
    } finally {
      setAttachmentsBusy(null);
    }
  };

  const removeAttachment = async (att: TaskAttachment) => {
    const before = attachments;
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    try {
      await apiService.deleteAttachment(att.id);
    } catch (err: any) {
      setAttachments(before);
      toast.error(err.message || 'Erreur');
    }
  };

  const prioCfg = PRIORITY_CONFIG[priority as Task['priority']] ?? PRIORITY_CONFIG.MEDIUM;

  return (
    <Sheet visible={!!taskId} onClose={onClose} title="Détail de la tâche" subtitle={activeProject?.name} heightFraction={0.94}>
      {loading || !task ? (
        <View style={{ paddingVertical: 12 }}>
          <SkeletonLines lines={6} gap={14} />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* ── header actions ── */}
          <View style={styles.headerActions}>
            <Pressable onPress={handleFavorite} hitSlop={8} style={styles.headBtn}>
              <Icon name="Star" size={16} color={(task as any).isFavorite ? '#F59E0B' : colors.textMuted} />
            </Pressable>
            <Pressable onPress={handleArchive} hitSlop={8} style={styles.headBtn}>
              <Icon name="Archive" size={15} color={(task as any).archivedAt ? BRAND.teal : colors.textMuted} />
            </Pressable>
            {canDelete && (
              <Pressable onPress={() => setConfirmDelete(true)} hitSlop={8} style={styles.headBtn}>
                <Icon name="Trash2" size={15} color="#EF4444" />
              </Pressable>
            )}
            {(task as any).archivedAt && (
              <View style={styles.archivedPill}>
                <Text style={styles.archivedPillText}>Archivée</Text>
              </View>
            )}
          </View>

          {/* ── title + description ── */}
          <TextInput
            value={title}
            onChangeText={(v) => { setTitle(v); setHasChanges(true); }}
            editable={canEdit}
            multiline
            style={[styles.titleInput, { color: colors.text }]}
            placeholder="Titre de la tâche"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            value={description}
            onChangeText={(v) => { setDescription(v); setHasChanges(true); }}
            editable={canEdit}
            multiline
            style={[styles.descInput, { color: colors.textSecondary }]}
            placeholder="Ajouter une description…"
            placeholderTextColor={colors.textMuted}
          />

          {/* ── field grid ── */}
          <View style={{ gap: 12 }}>
            <FieldSelect
              label="Statut"
              value={status}
              disabled={!canEdit}
              onChange={(v) => {
                setStatus(v);
                setHasChanges(true);
              }}
              options={statuses.map((s: any) => ({ value: s.id ?? s.key, label: s.name, color: s.color }))}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <FieldSelect
                label="Priorité"
                value={priority}
                disabled={!canEdit}
                onChange={(v) => {
                  setPriority(v);
                  setHasChanges(true);
                }}
                options={[
                  { value: 'LOW', label: 'Low', color: '#6B7280' },
                  { value: 'MEDIUM', label: 'Medium', color: BRAND.teal },
                  { value: 'HIGH', label: 'High', color: BRAND.orange },
                  { value: 'URGENT', label: 'Urgent', color: '#F43F5E' },
                ]}
                style={{ flex: 1 }}
              />
              <View style={{ flex: 1 }}>
                <DatePickerField
                  label="Échéance"
                  value={dueDate}
                  onChange={(v) => {
                    if (canEdit) {
                      setDueDate(v);
                      setHasChanges(true);
                    }
                  }}
                />
              </View>
            </View>
            <FieldSelect
              label="Assigné à"
              value={assigneeId ?? ''}
              disabled={!canEdit}
              onChange={(v) => {
                setAssigneeId(v || null);
                setHasChanges(true);
              }}
              options={[
                { value: '', label: 'Non assigné' },
                ...members.map((m: any) => {
                  const u = m.user ?? m;
                  return {
                    value: u.id ?? m.userId ?? m.id,
                    label: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Inconnu',
                  };
                }),
              ]}
            />

            {/* epic + sprint (web drawer parity) */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <FieldSelect
                label="Epic"
                value={epicId ?? ''}
                disabled={!canEdit}
                onChange={(v) => {
                  setEpicId(v || null);
                  setHasChanges(true);
                }}
                options={[
                  { value: '', label: 'Aucun epic' },
                  ...epics.map((e: any) => ({ value: e.id, label: e.name })),
                ]}
                style={{ flex: 1 }}
              />
              <FieldSelect
                label="Sprint"
                value={sprintId ?? ''}
                disabled={!canEdit}
                onChange={(v) => {
                  setSprintId(v || null);
                  setHasChanges(true);
                }}
                options={[
                  { value: '', label: 'Aucun sprint' },
                  ...sprints.map((s: any) => ({ value: s.id, label: s.name })),
                ]}
                style={{ flex: 1 }}
              />
            </View>

            {/* progress */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Progression — {progress}%</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.surface3 }]}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: BRAND.teal }]} />
              </View>
              {canEdit && (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {[0, 25, 50, 75, 100].map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => handleRefetchProgress(v)}
                      style={[
                        styles.progressChip,
                        {
                          backgroundColor: progress === v ? BRAND.orange : 'transparent',
                          borderColor: progress === v ? BRAND.orange : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontFamily: FONT.inter.semibold, color: progress === v ? '#fff' : colors.textMuted }}>
                        {v === 100 ? 'Terminé' : `${v}%`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* ── save bar (sticky-ish) ── */}
          {hasChanges && (
            <Button onPress={handleSaveChanges} isLoading={saving} style={{ marginTop: 16 }} icon={<Icon name="Check" size={15} color="#fff" />}>
              Enregistrer les modifications
            </Button>
          )}

          {/* ── subtasks ── */}
          <Section icon="CheckSquare" title={`Sous-tâches (${subtasks.filter((s) => s.completed).length}/${subtasks.length})`}>
            <View style={{ gap: 4 }}>
              {subtasks.map((s) => (
                <View key={s.id} style={styles.subtaskRow}>
                  <Pressable onPress={canEdit ? () => toggleSubtask(s) : undefined} style={styles.subtaskMain} hitSlop={4}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: s.completed ? BRAND.teal : colors.borderStrong,
                          backgroundColor: s.completed ? BRAND.teal : 'transparent',
                        },
                      ]}
                    >
                      {s.completed && <Icon name="Check" size={10} color="#fff" />}
                    </View>
                    <Text
                      style={[
                        styles.subtaskText,
                        { color: s.completed ? colors.textMuted : colors.text, textDecorationLine: s.completed ? 'line-through' : 'none' },
                      ]}
                    >
                      {s.title}
                    </Text>
                  </Pressable>
                  {canEdit && (
                    <Pressable onPress={() => deleteSubtask(s)} hitSlop={8}>
                      <Icon name="X" size={13} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
            {canEdit && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput
                  value={subtaskDraft}
                  onChangeText={setSubtaskDraft}
                  placeholder="Ajouter une sous-tâche…"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={addSubtask}
                  style={[styles.inlineInput, { backgroundColor: colors.surface3, borderColor: colors.border, color: colors.text }]}
                />
                <Pressable
                  onPress={addSubtask}
                  disabled={addingSubtask || !subtaskDraft.trim()}
                  style={[styles.inlineAddBtn, { backgroundColor: BRAND.teal, opacity: !subtaskDraft.trim() ? 0.5 : 1 }]}
                >
                  {addingSubtask ? <Spinner size={13} /> : <Icon name="Plus" size={15} color="#fff" />}
                </Pressable>
              </View>
            )}
          </Section>

          {/* ── attachments ── */}
          <Section icon="Paperclip" title={`Pièces jointes (${attachments.length})`}>
            <View style={{ gap: 6 }}>
              {attachments.map((att) => (
                <View key={att.id} style={[styles.attRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <Icon name="FileText" size={14} color={BRAND.orange} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontFamily: FONT.inter.medium, color: colors.text }}>
                    {(att as any).fileName ?? (att as any).name ?? 'Fichier'}
                  </Text>
                  <Pressable onPress={() => openAttachment(att)} hitSlop={8} style={{ padding: 4 }}>
                    {attachmentsBusy === att.id ? (
                      <Spinner size={12} color={BRAND.teal} />
                    ) : (
                      <Icon name="Download" size={14} color={BRAND.teal} />
                    )}
                  </Pressable>
                  {canEdit && (
                    <Pressable onPress={() => removeAttachment(att)} hitSlop={8} style={{ padding: 4 }}>
                      <Icon name="X" size={13} color="#EF4444" />
                    </Pressable>
                  )}
                </View>
              ))}
              {attachments.length === 0 && (
                <Text style={{ fontSize: 12, fontFamily: FONT.inter.regular, color: colors.textMuted }}>Aucune pièce jointe.</Text>
              )}
            </View>
            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                onPress={pickFile}
                isLoading={attachmentsBusy === 'upload'}
                icon={<Icon name="Plus" size={13} color={BRAND.teal} />}
                style={{ alignSelf: 'flex-start', marginTop: 10 }}
              >
                Ajouter un fichier
              </Button>
            )}
          </Section>

          {/* ── comments ── */}
          <Section icon="MessageSquare" title={`Commentaires (${comments.length})`}>
            <View style={{ gap: 10 }}>
              {comments.map((c) => {
                const author: any = (c as any).user ?? (c as any).author ?? {};
                const mine = author.id === user?.id || author.email === user?.email;
                return (
                  <View key={c.id} style={styles.commentRow}>
                    <Avatar
                      src={author.avatarUrl}
                      firstName={author.firstName ?? undefined}
                      lastName={author.lastName ?? undefined}
                      email={author.email}
                      size="sm"
                    />
                    <View style={[styles.commentBubble, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 11, fontFamily: FONT.inter.bold, color: colors.text }}>
                          {[author.firstName, author.lastName].filter(Boolean).join(' ') || author.email || 'Utilisateur'}
                        </Text>
                        <Text style={{ fontSize: 9.5, color: colors.textMuted, fontFamily: FONT.inter.medium }}>
                          {formatDateTime((c as any).createdAt)}
                        </Text>
                        <View style={{ flex: 1 }} />
                        {mine && (
                          <Pressable onPress={() => deleteComment(c.id)} hitSlop={8}>
                            <Icon name="Trash2" size={11} color={colors.textMuted} />
                          </Pressable>
                        )}
                      </View>
                      <Text style={{ fontSize: 12.5, fontFamily: FONT.inter.regular, color: colors.text, marginTop: 4, lineHeight: 18 }}>
                        {(c as any).body}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {comments.length === 0 && (
                <Text style={{ fontSize: 12, fontFamily: FONT.inter.regular, color: colors.textMuted }}>Aucun commentaire pour le moment.</Text>
              )}
            </View>
            {canComment && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
                <TextInput
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  placeholder="Écrire un commentaire…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.inlineInput, { backgroundColor: colors.surface3, borderColor: colors.border, color: colors.text, minHeight: 38, paddingVertical: 8 }]}
                />
                <Pressable
                  onPress={addComment}
                  disabled={sendingComment || !commentDraft.trim()}
                  style={[styles.inlineAddBtn, { backgroundColor: BRAND.orange, opacity: !commentDraft.trim() ? 0.5 : 1 }]}
                >
                  {sendingComment ? <Spinner size={13} /> : <Icon name="Send" size={14} color="#fff" />}
                </Pressable>
              </View>
            )}
          </Section>

          {/* ── activity ── */}
          <Section icon="Activity" title="Activité">
            <View style={{ gap: 8 }}>
              {activity.slice(0, 15).map((a) => (
                <View key={a.id} style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.activityDot, { backgroundColor: BRAND.teal }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.regular, color: colors.text, lineHeight: 16 }}>
                      {(a as any).description ?? (a as any).action ?? (a as any).type ?? 'Mise à jour'}
                    </Text>
                    {(a as any).createdAt && (
                      <Text style={{ fontSize: 9.5, color: colors.textMuted, fontFamily: FONT.inter.medium, marginTop: 1 }}>
                        {formatRelativeTime((a as any).createdAt)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {activity.length === 0 && (
                <Text style={{ fontSize: 12, fontFamily: FONT.inter.regular, color: colors.textMuted }}>Aucune activité enregistrée.</Text>
              )}
            </View>
          </Section>
        </ScrollView>
      )}

      {/* ── delete confirm ── */}
      {task && (
        <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} autoHeight>
          <View style={{ paddingBottom: 18 }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(239,68,68,0.10)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="AlertTriangle" size={24} color="#EF4444" />
              </View>
            </View>
            <Text style={{ fontSize: 15, fontFamily: FONT.sora.bold, color: colors.text, textAlign: 'center' }}>Supprimer cette tâche ?</Text>
            <Text style={{ fontSize: 12.5, fontFamily: FONT.inter.regular, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
              « {task.title} » sera définitivement supprimée.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Button variant="ghost" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }}>Annuler</Button>
              <Button variant="danger" onPress={handleDelete} isLoading={deleting} style={{ flex: 1 }}>Supprimer</Button>
            </View>
          </View>
        </Sheet>
      )}
    </Sheet>
  );
};

const Section: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <Icon name={icon as any} size={13} color={BRAND.teal} />
        <Text style={{ fontSize: 13, fontFamily: FONT.inter.bold, color: colors.text }}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  headBtn: {
    padding: 7,
  },
  archivedPill: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(26,140,140,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  archivedPillText: {
    color: BRAND.teal,
    fontSize: 10.5,
    fontFamily: FONT.inter.semibold,
  },
  titleInput: {
    fontSize: 18,
    fontFamily: FONT.sora.bold,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  descInput: {
    fontSize: 13.5,
    fontFamily: FONT.inter.regular,
    lineHeight: 19,
    minHeight: 54,
    paddingVertical: 6,
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: FONT.inter.semibold,
    marginBottom: 7,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressChip: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.inter.medium,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: FONT.inter.medium,
  },
  inlineAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  commentBubble: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 10,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
});
