import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { FieldSelect } from '../../components/ui/Select';
import { DatePickerField } from '../../components/ui/DatePicker';
import { Icon } from '../../components/Icon';
import { apiService } from '../../services/api';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Epic, ProjectFolder, ProjectStatus, Sprint, UserProfile } from '../../types';

/**
 * CreateTaskSheet — port of web `CreateTaskModal`:
 * title/description, status, priority, assignee (from org members),
 * epic/sprint/folder, due date + progress. Members fall back to an empty
 * state when the API can't provide them (no fake data).
 */
interface CreateTaskSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-selected status (kanban column quick-create, like web onQuickCreateTask) */
  initialStatus?: string | null;
}

export const CreateTaskSheet: React.FC<CreateTaskSheetProps> = ({ visible, onClose, initialStatus }) => {
  const { colors } = useTheme();
  const { activeProject, triggerViewRefresh } = useAppState();
  const projectId = activeProject?.id ?? null;

  // options lists
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);

  // form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('todo');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [epicId, setEpicId] = useState<string | null>(null);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible || !projectId) return;
    apiService.getStatuses(projectId).then((st: any) => {
      setStatuses(st ?? []);
      if (st?.length) {
        setStatus((cur) => {
          // priority: column quick-create preset > keep current > first status
          // NOTE: like the web, status values are KEYS (s.key || name.toLowerCase()), not ids
          const keyOf = (s: ProjectStatus) => s.key || (s.name ?? '').toLowerCase();
          if (initialStatus) {
            const hit = st.find((s: ProjectStatus) => s.id === initialStatus || s.key === initialStatus);
            if (hit) return keyOf(hit);
          }
          return st.find((s: ProjectStatus) => keyOf(s) === cur) ? cur : keyOf(st[0]);
        });
      }
    }).catch(() => {});
    apiService.getProjectFolders(projectId).then((f: any) => setFolders(f ?? [])).catch(() => {});
    apiService.getEpics(projectId).then((e: any) => setEpics(e ?? [])).catch(() => {});
    apiService.getSprints(projectId).then((s: any) => setSprints(s ?? [])).catch(() => {});

    // Members: org members of the project's organization (same as web)
    const loadMembers = async () => {
      try {
        let oid = (activeProject as any)?.organizationId;
        if (!oid) {
          const orgs = await apiService.getOrganizations();
          if (orgs?.length) oid = orgs[0].id;
        }
        if (oid) {
          const om = await apiService.getOrgMembers(oid);
          const ul = om?.map((m) => m.user).filter((u): u is UserProfile => Boolean(u));
          if (ul?.length) setMembers(ul);
        }
      } catch { /* leave empty — no fake members */ }
    };
    loadMembers();
  }, [visible, projectId]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setAssigneeId(null);
    setEpicId(null);
    setSprintId(null);
    setFolderId(null);
    setDueDate(null);
    setProgress(0);
  };

  const handleSubmit = async () => {
    if (!projectId || !title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    setCreating(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        folderId: folderId || null,
        epicId: epicId || null,
        sprintId: sprintId || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        progress: progress || 0,
      };
      await apiService.createTask(projectId, payload);
      toast.success('Tâche créée !');
      triggerViewRefresh(); // same broadcast as the web — all views reload
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la création de la tâche');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Créer une nouvelle tâche" subtitle={activeProject ? `dans ${activeProject.name}` : undefined} heightFraction={0.9}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 13, paddingTop: 4, paddingBottom: 16 }}>
        <Input
          label="Titre"
          placeholder="Titre de la tâche"
          value={title}
          onChangeText={setTitle}
          icon={<Icon name="ListTodo" size={15} color={colors.textMuted} />}
        />
        <Textarea label="Description" placeholder="Décrivez la tâche…" value={description} onChangeText={setDescription} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <FieldSelect
            label="Statut"
            value={status}
            onChange={setStatus}
            options={(statuses.length ? statuses : [{ id: 'todo', key: 'todo', name: 'À faire', color: '#1A8C8C' } as any]).map((s: ProjectStatus) => ({
              value: s.key || (s.name ?? '').toLowerCase(),
              label: s.name,
              color: s.color,
            }))}
            style={{ flex: 1 }}
          />
          <FieldSelect
            label="Priorité"
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'LOW', label: 'Low', color: '#6B7280' },
              { value: 'MEDIUM', label: 'Medium', color: BRAND.teal },
              { value: 'HIGH', label: 'High', color: BRAND.orange },
              { value: 'URGENT', label: 'Urgent', color: '#F43F5E' },
            ]}
            style={{ flex: 1 }}
          />
        </View>

        <FieldSelect
          label="Assigné à"
          value={assigneeId ?? ''}
          onChange={(v) => setAssigneeId(v || null)}
          placeholder={members.length === 0 ? 'Non assigné' : 'Sélectionner un membre…'}
          options={[{ value: '', label: 'Non assigné' }, ...members.map((m) => ({
            value: m.id,
            label: [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email,
          }))]}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <FieldSelect
            label="Epic"
            value={epicId ?? ''}
            onChange={(v) => setEpicId(v || null)}
            options={[{ value: '', label: 'Aucun' }, ...epics.map((e) => ({ value: e.id, label: e.name, color: (e as any).color }))]}
            style={{ flex: 1 }}
          />
          <FieldSelect
            label="Sprint"
            value={sprintId ?? ''}
            onChange={(v) => setSprintId(v || null)}
            options={[{ value: '', label: 'Aucun' }, ...sprints.map((s) => ({ value: s.id, label: s.name }))]}
            style={{ flex: 1 }}
          />
        </View>

        <FieldSelect
          label="Dossier"
          value={folderId ?? ''}
          onChange={(v) => setFolderId(v || null)}
          options={[{ value: '', label: 'Aucun dossier' }, ...folders.map((f) => ({ value: f.id, label: f.name, icon: 'Folder' }))]}
        />

        <DatePickerField label="Échéance" value={dueDate} onChange={setDueDate} />

        {/* progress (0-100 in 10 steps — same granularity as the web slider) */}
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Progression — {progress}%</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => {
              const active = progress === v;
              return (
                <View key={v}>
                  <Text
                    onPress={() => setProgress(v)}
                    style={[
                      styles.progressChip,
                      {
                        backgroundColor: active ? BRAND.orange : 'transparent',
                        color: active ? '#fff' : colors.textMuted,
                        borderColor: active ? BRAND.orange : colors.border,
                      },
                    ]}
                  >
                    {v}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <Button variant="ghost" onPress={onClose}>Annuler</Button>
          <Button onPress={handleSubmit} isLoading={creating}>Créer la tâche</Button>
        </View>
      </ScrollView>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontFamily: FONT.inter.semibold,
    marginBottom: 7,
  },
  progressChip: {
    fontSize: 11.5,
    fontFamily: FONT.inter.semibold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
