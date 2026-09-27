import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiService } from '../../../services/api';
import { usePermissions } from '../../../context/PermissionsContext';
import { useAppState } from '../../../state/AppStateContext';
import { useTheme } from '../../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../../theme/tokens';
import { Icon } from '../../../components/Icon';
import { TaskCard } from '../../../components/TaskCard';
import { Sheet } from '../../../components/ui/Sheet';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { DatePickerField } from '../../../components/ui/DatePicker';
import { SkeletonLines } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { toast } from '../../../components/toast';
import { Epic, Sprint, Task } from '../../../types';

interface BacklogViewProps {
  projectId: string;
  onOpenTask: (taskId: string) => void;
}

/**
 * BacklogView — port of web `BacklogView`:
 * sprints (start/close/delete), backlog tasks (reorder, assign to sprint/epic),
 * epic filter + management. Same API calls, optimistic-move adaptation via
 * long-press actions.
 */
export const BacklogView: React.FC<BacklogViewProps> = ({ projectId, onOpenTask }) => {
  const { colors } = useTheme();
  const { viewRefreshKey } = useAppState();
  const { hasAbility } = usePermissions();
  const canManage = hasAbility('sprint:manage');

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlog, setBacklog] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [epicFilter, setEpicFilter] = useState<string | null>(null);

  // sheets
  const [sprintFormOpen, setSprintFormOpen] = useState(false);
  const [epicFormOpen, setEpicFormOpen] = useState(false);
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [confirmCloseSprint, setConfirmCloseSprint] = useState<Sprint | null>(null);

  // sprint form
  const [sName, setSName] = useState('');
  const [sGoal, setSGoal] = useState('');
  const [sStart, setSStart] = useState<string | null>(null);
  const [sEnd, setSEnd] = useState<string | null>(null);
  const [sSaving, setSSaving] = useState(false);

  // epic form
  const [eName, setEName] = useState('');
  const [eColor, setEColor] = useState('#1A8C8C');
  const [eSaving, setESaving] = useState(false);

  const EPIC_COLORS = ['#1A8C8C', '#E8531A', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#F43F5E'];

  const load = useCallback(async () => {
    try {
      const [sp, bl, ep] = await Promise.all([
        apiService.getSprints(projectId).catch(() => [] as Sprint[]),
        apiService.getBacklog(projectId).catch(() => [] as Task[]),
        apiService.getEpics(projectId).catch(() => [] as Epic[]),
      ]);
      setSprints(sp ?? []);
      setBacklog(bl ?? []);
      setEpics(ep ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, viewRefreshKey]);

  const sprintTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    (sprints ?? []).forEach((s) => map.set(s.id, []));
    (backlog ?? []).forEach((t) => {
      if (t.sprintId && map.has(t.sprintId)) map.get(t.sprintId)!.push(t);
    });
    return map;
  }, [sprints, backlog]);

  const filteredBacklog = useMemo(() => {
    if (!epicFilter) return backlog ?? [];
    return (backlog ?? []).filter((t) => t.epicId === epicFilter);
  }, [backlog, epicFilter]);

  const unassigned = filteredBacklog.filter((t) => !t.sprintId);

  // ── sprint actions ──
  const handleCreateSprint = async () => {
    if (!sName.trim()) return;
    setSSaving(true);
    try {
      const payload: any = { name: sName.trim() };
      if (sGoal.trim()) payload.goal = sGoal.trim();
      if (sStart) payload.startDate = new Date(sStart).toISOString();
      if (sEnd) payload.endDate = new Date(sEnd).toISOString();
      const sprint = await apiService.createSprint(projectId, payload);
      setSprints((prev) => [...prev, sprint]);
      toast.success('Sprint créé !');
      setSprintFormOpen(false);
      setSName(''); setSGoal(''); setSStart(null); setSEnd(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du sprint');
    } finally {
      setSSaving(false);
    }
  };

  const handleStartSprint = async (id: string) => {
    try {
      const s = await apiService.startSprint(id);
      setSprints((prev) => prev.map((x) => (x.id === id ? { ...x, ...s, status: 'ACTIVE' } : x)));
      toast.success('Sprint démarré !');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de démarrer');
    }
  };

  const handleCloseSprint = async () => {
    if (!confirmCloseSprint) return;
    try {
      await apiService.closeSprint(confirmCloseSprint.id);
      setSprints((prev) => prev.map((x) => (x.id === confirmCloseSprint.id ? { ...x, status: 'CLOSED' } : x)));
      toast.success('Sprint clôturé');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de clôturer');
    } finally {
      setConfirmCloseSprint(null);
    }
  };

  const handleDeleteSprint = async (id: string) => {
    try {
      await apiService.deleteSprint(id);
      setSprints((prev) => prev.filter((x) => x.id !== id));
      toast.success('Sprint supprimé');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de supprimer');
    }
  };

  // ── epic actions ──
  const handleCreateEpic = async () => {
    if (!eName.trim()) return;
    setESaving(true);
    try {
      const epic = await apiService.createEpic(projectId, { name: eName.trim(), color: eColor });
      setEpics((prev) => [...prev, epic]);
      toast.success('Epic créé !');
      setEpicFormOpen(false);
      setEName('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setESaving(false);
    }
  };

  const handleDeleteEpic = async (id: string) => {
    try {
      await apiService.deleteEpic(id);
      setEpics((prev) => prev.filter((e) => e.id !== id));
      toast.success('Epic supprimé');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  // ── task actions (assign sprint/epic, reorder backlog) ──
  const patchTask = (id: string, patch: Partial<Task>) => {
    setBacklog((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const assignSprint = async (task: Task, sprintId: string | null) => {
    const prev = task.sprintId;
    patchTask(task.id, { sprintId });
    setActionTask(null);
    try {
      await apiService.updateTask(task.id, { sprintId } as any);
    } catch (err: any) {
      patchTask(task.id, { sprintId: prev });
      toast.error(err.message || 'Erreur');
    }
  };

  const assignEpic = async (task: Task, epicId: string | null) => {
    const prev = task.epicId;
    patchTask(task.id, { epicId });
    setActionTask(null);
    try {
      await apiService.updateTask(task.id, { epicId } as any);
    } catch (err: any) {
      patchTask(task.id, { epicId: prev });
      toast.error(err.message || 'Erreur');
    }
  };

  const reorder = async (dir: number) => {
    if (!actionTask) return;
    const tasks = [...backlog];
    const i = tasks.findIndex((t) => t.id === actionTask.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= tasks.length) return;
    [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
    setBacklog(tasks);
    setActionTask(null);
    try {
      await apiService.reorderBacklog(projectId, tasks.map((t) => t.id));
    } catch (err: any) {
      toast.error(err.message || 'Erreur de réordonnancement');
      load();
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 18 }}>
        <SkeletonLines lines={4} gap={12} />
      </View>
    );
  }

  const activeSprint = sprints.find((s) => (s as any).status === 'ACTIVE');

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8531A" colors={['#E8531A']} />}
      >
        {/* ── Epic filter chips + actions ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12, paddingRight: 12 }}>
          <Chip label="Tous" active={epicFilter === null} onPress={() => setEpicFilter(null)} />
          {epics.map((e) => (
            <Chip
              key={e.id}
              label={e.name}
              color={(e as any).color}
              active={epicFilter === e.id}
              onPress={() => setEpicFilter(epicFilter === e.id ? null : e.id)}
              onLongPress={canManage ? () => handleDeleteEpic(e.id) : undefined}
            />
          ))}
          {canManage && (
            <Chip label="+ Epic" ghost onPress={() => setEpicFormOpen(true)} />
          )}
        </ScrollView>

        {/* ── Sprints ── */}
        <View style={styles.sectionHeader}>
          <Icon name="Rocket" size={15} color={BRAND.orange} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sprints</Text>
          <View style={{ flex: 1 }} />
          {canManage && (
            <Pressable onPress={() => setSprintFormOpen(true)} hitSlop={8} style={styles.addBtn}>
              <Icon name="Plus" size={15} color={BRAND.orange} />
            </Pressable>
          )}
        </View>

        {sprints.length === 0 && (
          <Text style={{ fontSize: 12.5, color: colors.textMuted, fontFamily: FONT.inter.regular, marginBottom: 12 }}>
            Aucun sprint. {canManage ? 'Créez votre premier sprint pour planifier l’itération.' : ''}
          </Text>
        )}

        {sprints.map((s) => {
          const tasks = sprintTasks.get(s.id) ?? [];
          const active = (s as any).status === 'ACTIVE';
          const closed = (s as any).status === 'CLOSED' || (s as any).status === 'COMPLETED';
          return (
            <View key={s.id} style={[styles.sprintCard, { backgroundColor: colors.surface, borderColor: active ? 'rgba(26,140,140,0.45)' : colors.border }]}>
              <View style={styles.sprintHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={[styles.sprintName, { color: colors.text }]}>{s.name}</Text>
                    {active && (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>Actif</Text>
                      </View>
                    )}
                    {closed && (
                      <View style={[styles.activePill, { backgroundColor: colors.surface2 }]}>
                        <Text style={[styles.activePillText, { color: colors.textMuted }]}>Clôs</Text>
                      </View>
                    )}
                  </View>
                  {!!(s as any).goal && (
                    <Text numberOfLines={1} style={{ fontSize: 11.5, color: colors.textMuted, fontFamily: FONT.inter.regular, marginTop: 2 }}>
                      {(s as any).goal}
                    </Text>
                  )}
                  {!!(s as any).startDate && (
                    <Text style={{ fontSize: 10.5, color: colors.textMuted, fontFamily: FONT.inter.medium, marginTop: 3 }}>
                      {new Date((s as any).startDate).toLocaleDateString('fr-FR')} → {(s as any).endDate ? new Date((s as any).endDate).toLocaleDateString('fr-FR') : '…'}
                    </Text>
                  )}
                  <Text style={{ fontSize: 10.5, color: colors.textMuted, fontFamily: FONT.inter.medium, marginTop: 2 }}>
                    {tasks.length} tâche{tasks.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {canManage && !closed && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {!active ? (
                      <Pressable onPress={() => handleStartSprint(s.id)} style={[styles.sprintAction, { backgroundColor: BRAND.teal }]}>
                        <Icon name="Play" size={11} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 11, fontFamily: FONT.inter.semibold }}>Démarrer</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => setConfirmCloseSprint(s)} style={[styles.sprintAction, { backgroundColor: BRAND.orange }]}>
                        <Icon name="Check" size={11} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 11, fontFamily: FONT.inter.semibold }}>Clôturer</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => handleDeleteSprint(s.id)} style={[styles.sprintAction, { backgroundColor: 'rgba(239,68,68,0.12)' }]} hitSlop={6}>
                      <Icon name="Trash2" size={12} color="#EF4444" />
                    </Pressable>
                  </View>
                )}
              </View>

              {tasks.slice(0, 6).map((t) => (
                <View key={t.id} style={{ marginTop: 8 }}>
                  <TaskCard task={t} compact onPress={() => onOpenTask(t.id)} onLongPress={canManage ? () => setActionTask(t) : undefined} />
                </View>
              ))}
              {tasks.length > 6 && (
                <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: FONT.inter.medium, marginTop: 8, textAlign: 'center' }}>
                  + {tasks.length - 6} autres tâches
                </Text>
              )}
            </View>
          );
        })}

        {/* ── Backlog ── */}
        <View style={[styles.sectionHeader, { marginTop: 18 }]}>
          <Icon name="ListTodo" size={15} color={BRAND.teal} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Backlog</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: FONT.inter.medium }}>{unassigned.length} tâche{unassigned.length !== 1 ? 's' : ''}</Text>
        </View>

        {unassigned.length === 0 ? (
          <EmptyState
            icon="ListTodo"
            title="Backlog vide"
            description={canManage ? 'Les tâches sans sprint apparaîtront ici. Appui long sur une tâche pour l’assigner.' : 'Les tâches sans sprint apparaîtront ici.'}
          />
        ) : (
          <View style={{ gap: 8 }}>
            {unassigned.map((t) => (
              <TaskCard key={t.id} task={t} onPress={() => onOpenTask(t.id)} onLongPress={canManage ? () => setActionTask(t) : undefined} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── create sprint sheet ── */}
      <Sheet visible={sprintFormOpen} onClose={() => setSprintFormOpen(false)} title="Nouveau sprint" autoHeight>
        <Input label="Nom" placeholder="Sprint 12" value={sName} onChangeText={setSName} containerStyle={{ marginTop: 8, marginBottom: 12 }} />
        <Input label="Objectif (optionnel)" placeholder="Livrer la v1 du checkout" value={sGoal} onChangeText={setSGoal} containerStyle={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <DatePickerField label="Début" value={sStart} onChange={setSStart} style={{ flex: 1 }} />
          <DatePickerField label="Fin" value={sEnd} onChange={setSEnd} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 8 }}>
          <Button variant="ghost" onPress={() => setSprintFormOpen(false)}>Annuler</Button>
          <Button onPress={handleCreateSprint} isLoading={sSaving}>Créer</Button>
        </View>
      </Sheet>

      {/* ── create epic sheet ── */}
      <Sheet visible={epicFormOpen} onClose={() => setEpicFormOpen(false)} title="Nouvel epic" autoHeight>
        <Input label="Nom" placeholder="Refonte UX" value={eName} onChangeText={setEName} containerStyle={{ marginTop: 8, marginBottom: 12 }} />
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT.inter.semibold, marginBottom: 8 }}>Couleur</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {EPIC_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setEColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c, borderWidth: eColor === c ? 3 : 0, borderColor: colors.text },
              ]}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 8 }}>
          <Button variant="ghost" onPress={() => setEpicFormOpen(false)}>Annuler</Button>
          <Button onPress={handleCreateEpic} isLoading={eSaving}>Créer</Button>
        </View>
      </Sheet>

      {/* ── task action sheet ── */}
      <Sheet visible={!!actionTask} onClose={() => setActionTask(null)} title={actionTask?.title} autoHeight>
        {actionTask && (
          <View style={{ paddingBottom: 12 }}>
            <ActionRow icon="ArrowUp" label="Monter dans le backlog" onPress={() => reorder(-1)} />
            <ActionRow icon="ChevronDown" label="Descendre dans le backlog" onPress={() => reorder(1)} />
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
            <Text style={styles.assignLabel}>Assigner au sprint</Text>
            {sprints.map((s) => (
              <ActionRow
                key={s.id}
                icon="Rocket"
                label={s.name}
                active={actionTask.sprintId === s.id}
                onPress={() => assignSprint(actionTask, s.id)}
              />
            ))}
            {actionTask.sprintId && (
              <ActionRow icon="X" label="Retirer du sprint" danger onPress={() => assignSprint(actionTask, null)} />
            )}
            <Text style={[styles.assignLabel, { marginTop: 8 }]}>Assigner à un epic</Text>
            {epics.map((e) => (
              <ActionRow
                key={e.id}
                icon="Tag"
                label={e.name}
                color={(e as any).color}
                active={actionTask.epicId === e.id}
                onPress={() => assignEpic(actionTask, e.id)}
              />
            ))}
            {actionTask.epicId && (
              <ActionRow icon="X" label="Retirer de l'epic" danger onPress={() => assignEpic(actionTask, null)} />
            )}
          </View>
        )}
      </Sheet>

      {/* ── close sprint confirm ── */}
      <Sheet visible={!!confirmCloseSprint} onClose={() => setConfirmCloseSprint(null)} autoHeight>
        <View style={{ paddingBottom: 16 }}>
          <Text style={{ fontSize: 16, fontFamily: FONT.sora.bold, color: colors.text, textAlign: 'center' }}>
            Clôturer ce sprint ?
          </Text>
          <Text style={{ fontSize: 12.5, fontFamily: FONT.inter.regular, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
            « {confirmCloseSprint?.name} » sera marqué comme terminé. Les tâches inachevées retourneront au backlog.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <Button variant="ghost" onPress={() => setConfirmCloseSprint(null)} style={{ flex: 1 }}>Annuler</Button>
            <Button onPress={handleCloseSprint} style={{ flex: 1 }}>Clôturer</Button>
          </View>
        </View>
      </Sheet>
    </View>
  );
};

const Chip: React.FC<{ label: string; active?: boolean; color?: string; ghost?: boolean; onPress?: () => void; onLongPress?: () => void }> = ({
  label,
  active,
  color,
  ghost,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        chipStyles.chip,
        {
          backgroundColor: active ? (color ?? BRAND.teal) : 'transparent',
          borderColor: active ? (color ?? BRAND.teal) : ghost ? colors.borderStrong : colors.border,
          borderStyle: ghost ? 'dashed' : 'solid',
        },
      ]}
    >
      {!!color && !active && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />}
      <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.semibold, color: active ? '#fff' : colors.textSecondary }}>{label}</Text>
    </Pressable>
  );
};

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
});

const ActionRow: React.FC<{ icon: string; label: string; onPress: () => void; active?: boolean; danger?: boolean; color?: string }> = ({
  icon,
  label,
  onPress,
  active,
  danger,
  color,
}) => {
  const { colors } = useTheme();
  const tint = danger ? '#EF4444' : active ? BRAND.teal : color ?? colors.textSecondary;
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
      <Icon name={icon as any} size={15} color={tint} />
      <Text style={{ flex: 1, fontSize: 13.5, fontFamily: active ? FONT.inter.bold : FONT.inter.medium, color: tint }}>{label}</Text>
      {active && <Icon name="Check" size={14} color={BRAND.teal} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.inter.bold,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: BRAND.orange08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprintCard: {
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 10,
  },
  sprintHead: {
    flexDirection: 'row',
    gap: 10,
  },
  sprintName: {
    fontSize: 14,
    fontFamily: FONT.inter.bold,
    flexShrink: 1,
  },
  activePill: {
    backgroundColor: BRAND.teal,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activePillText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONT.inter.bold,
  },
  sprintAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  assignLabel: {
    fontSize: 10.5,
    fontFamily: FONT.inter.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#7B85A0',
    marginTop: 4,
    marginBottom: 2,
  },
});
