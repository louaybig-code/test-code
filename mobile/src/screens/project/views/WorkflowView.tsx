import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiService } from '../../../services/api';
import { usePermissions } from '../../../context/PermissionsContext';
import { useAppState } from '../../../state/AppStateContext';
import { useTheme } from '../../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../../theme/tokens';
import { Icon } from '../../../components/Icon';
import { Sheet } from '../../../components/ui/Sheet';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FieldSelect } from '../../../components/ui/Select';
import { SkeletonLines } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { toast } from '../../../components/toast';
import { ProjectStatus, ProjectWorkflow } from '../../../types';

const CATEGORY_OPTIONS = [
  { value: 'TODO', label: 'À faire' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'DONE', label: 'Terminé' },
];

/**
 * WorkflowView — port of web `WorkflowEditor`:
 * manage project statuses (create/rename/delete, category, color) and toggle
 * the allowed transitions grid (GET/PUT /projects/:id/workflow).
 */
export const WorkflowView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { colors } = useTheme();
  const { viewRefreshKey } = useAppState();
  const { hasAbility } = usePermissions();
  const canManage = hasAbility('workflow:manage');

  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [transitions, setTransitions] = useState<string[]>([]); // "from->to" keys
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // status form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectStatus | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');
  const [color, setColor] = useState('#1A8C8C');
  const [formSaving, setFormSaving] = useState(false);

  const STATUS_COLORS = ['#1A8C8C', '#E8531A', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E', '#8890A8'];

  const load = useCallback(async () => {
    try {
      const [st, wf] = await Promise.all([
        apiService.getStatuses(projectId),
        apiService.getWorkflow(projectId).catch(() => null as any),
      ]);
      setStatuses((st ?? []).slice().sort((a, b) => a.position - b.position));
      const wfTransitions: any[] = (wf as any)?.transitions ?? [];
      setTransitions(wfTransitions.map((t: any) => `${t.from}->${t.to}`));
    } catch (err: any) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, viewRefreshKey]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCategory('TODO');
    setColor('#1A8C8C');
    setFormOpen(true);
  };

  const openEdit = (s: ProjectStatus) => {
    setEditing(s);
    setName(s.name);
    setCategory(s.category);
    setColor(s.color);
    setFormOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!name.trim()) return;
    setFormSaving(true);
    try {
      if (editing) {
        const updated = await apiService.updateStatus(editing.id, { name: name.trim(), category, color });
        setStatuses((prev) => prev.map((s) => (s.id === editing.id ? { ...s, ...updated } : s)));
        toast.success('Statut mis à jour');
      } else {
        const created = await apiService.createStatus(projectId, { name: name.trim(), category, color });
        setStatuses((prev) => [...prev, created].sort((a, b) => a.position - b.position));
        toast.success('Statut créé');
      }
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteStatus = async (s: ProjectStatus) => {
    try {
      await apiService.deleteStatus(s.id);
      setStatuses((prev) => prev.filter((x) => x.id !== s.id));
      toast.success('Statut supprimé');
      load(); // transitions may reference the deleted status
    } catch (err: any) {
      toast.error(err.message || 'Impossible de supprimer');
    }
  };

  const keyOf = (from: string, to: string) => `${from}->${to}`;

  const toggleTransition = (from: string, to: string) => {
    if (from === to) return;
    const k = keyOf(from, to);
    setTransitions((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const handleSaveWorkflow = async () => {
    setSaving(true);
    try {
      const payload = {
        transitions: transitions.map((k) => {
          const [from, to] = k.split('->');
          return { from, to };
        }),
      };
      await apiService.updateWorkflow(projectId, payload);
      toast.success('Workflow enregistré !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 18 }}>
        <SkeletonLines lines={3} gap={12} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8531A" colors={['#E8531A']} />}
    >
      {/* status list */}
      <View style={styles.sectionHead}>
        <Icon name="GitFork" size={15} color={BRAND.orange} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Statuts</Text>
        {canManage && (
          <Pressable onPress={openCreate} hitSlop={8} style={styles.addBtn}>
            <Icon name="Plus" size={15} color={BRAND.orange} />
          </Pressable>
        )}
      </View>

      {statuses.length === 0 ? (
        <EmptyState icon="GitFork" title="Aucun statut" description="Créez les statuts du workflow (ex: À faire, En cours, Terminé)." actionLabel="Créer un statut" onAction={canManage ? openCreate : undefined} />
      ) : (
        <View style={{ gap: 8, marginBottom: 20 }}>
          {statuses.map((s) => (
            <View key={s.id} style={[styles.statusRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statusDot, { backgroundColor: s.color || BRAND.teal }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: FONT.inter.semibold, color: colors.text }}>
                  {s.name}
                </Text>
                <Text style={{ fontSize: 10.5, fontFamily: FONT.inter.medium, color: colors.textMuted }}>
                  {CATEGORY_OPTIONS.find((c) => c.value === s.category)?.label ?? s.category}
                </Text>
              </View>
              {canManage && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => openEdit(s)} hitSlop={8}>
                    <Icon name="Pencil" size={14} color={colors.textMuted} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteStatus(s)} hitSlop={8}>
                    <Icon name="Trash2" size={14} color="#EF4444" />
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* transitions matrix */}
      {statuses.length > 0 && (
        <>
          <View style={styles.sectionHead}>
            <Icon name="ArrowRight" size={14} color={BRAND.teal} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transitions autorisées</Text>
          </View>
          <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.regular, color: colors.textMuted, marginBottom: 12 }}>
            Cochez les transitions (ligne → colonne) autorisées pour déplacer les tâches.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.matrix, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* header row */}
              <View style={{ flexDirection: 'row' }}>
                <View style={styles.cornerCell}>
                  <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: FONT.inter.semibold }}>de \ vers</Text>
                </View>
                {statuses.map((s) => (
                  <View key={s.id} style={styles.headCell}>
                    <View style={[styles.miniDot, { backgroundColor: s.color || BRAND.teal }]} />
                    <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: FONT.inter.semibold, color: colors.text }}>
                      {s.name}
                    </Text>
                  </View>
                ))}
              </View>
              {statuses.map((from) => (
                <View key={from.id} style={{ flexDirection: 'row' }}>
                  <View style={styles.rowHead}>
                    <View style={[styles.miniDot, { backgroundColor: from.color || BRAND.teal }]} />
                    <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: FONT.inter.semibold, color: colors.text }}>
                      {from.name}
                    </Text>
                  </View>
                  {statuses.map((to) => {
                    const allowed = transitions.includes(keyOf(from.key, to.key)) || transitions.includes(keyOf(from.id, to.id));
                    const self = from.id === to.id;
                    return (
                      <Pressable
                        key={to.id}
                        disabled={self || !canManage}
                        onPress={() => toggleTransition(from.key, to.key)}
                        style={[
                          styles.checkCell,
                          {
                            backgroundColor: allowed ? BRAND.teal08 : 'transparent',
                            borderColor: colors.border,
                            opacity: self ? 0.3 : 1,
                          },
                        ]}
                      >
                        {allowed && <Icon name="Check" size={12} color={BRAND.teal} />}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          {canManage && (
            <Button onPress={handleSaveWorkflow} isLoading={saving} style={{ marginTop: 16 }} icon={<Icon name="Check" size={15} color="#fff" />}>
              Enregistrer le workflow
            </Button>
          )}
        </>
      )}

      {/* status form sheet */}
      <Sheet visible={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Modifier le statut' : 'Nouveau statut'} autoHeight>
        <Input label="Nom" placeholder="Ex: En revue" value={name} onChangeText={setName} containerStyle={{ marginTop: 8, marginBottom: 12 }} />
        <FieldSelect label="Catégorie" value={category} onChange={(v) => setCategory(v as any)} options={CATEGORY_OPTIONS} style={{ marginBottom: 14 }} />
        <Text style={{ fontSize: 13, fontFamily: FONT.inter.semibold, color: colors.textSecondary, marginBottom: 8 }}>Couleur</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {STATUS_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text }]}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 8 }}>
          <Button variant="ghost" onPress={() => setFormOpen(false)}>Annuler</Button>
          <Button onPress={handleSaveStatus} isLoading={formSaving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </View>
      </Sheet>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sectionHead: {
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  matrix: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  cornerCell: {
    width: 96,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headCell: {
    width: 88,
    height: 40,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowHead: {
    width: 96,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  checkCell: {
    width: 88,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderTopWidth: 1,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
