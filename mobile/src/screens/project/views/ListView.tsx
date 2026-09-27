import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiService } from '../../../services/api';
import { useAppState } from '../../../state/AppStateContext';
import { useTheme } from '../../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../../theme/tokens';
import { Icon } from '../../../components/Icon';
import { TaskCard } from '../../../components/TaskCard';
import { Sheet } from '../../../components/ui/Sheet';
import { SkeletonLines } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { toast } from '../../../components/toast';
import { Task } from '../../../types';

/**
 * ListView — port of web `ListView`:
 * server search + priority filter chips + archived section.
 */
export const ListView: React.FC<{ projectId: string; onOpenTask: (taskId: string) => void }> = ({ projectId, onOpenTask }) => {
  const { colors } = useTheme();
  const { viewRefreshKey } = useAppState();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [archived, setArchived] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: any = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (priority) params.priority = priority;
      const res: any = await apiService.getProjectTasks(projectId, params);
      const list: Task[] = Array.isArray(res) ? res : res?.tasks ?? [];
      setTasks(list.filter((t) => !t.archivedAt));
      setArchived(list.filter((t) => t.archivedAt));
    } catch (err: any) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, search, priority]);

  useEffect(() => {
    const timer = setTimeout(() => load(), search ? 350 : 0); // debounce search typing
    return () => clearTimeout(timer);
  }, [load, search, priority, viewRefreshKey]);

  const PRIORITIES = [
    { key: null, label: 'Toutes' },
    { key: 'URGENT', label: 'Urgent' },
    { key: 'HIGH', label: 'High' },
    { key: 'MEDIUM', label: 'Medium' },
    { key: 'LOW', label: 'Low' },
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* search + filters */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="Search" size={15} color={colors.textMuted} />
          <TextInput
            placeholder="Rechercher une tâche…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Icon name="X" size={14} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 10, paddingRight: 12 }}>
          {PRIORITIES.map((p) => {
            const active = priority === p.key;
            return (
              <Pressable
                key={String(p.key)}
                onPress={() => setPriority(p.key as any)}
                style={[
                  styles.prioChip,
                  {
                    backgroundColor: active ? BRAND.teal : 'transparent',
                    borderColor: active ? BRAND.teal : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.semibold, color: active ? '#fff' : colors.textSecondary }}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* tasks */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8531A" colors={['#E8531A']} />}
      >
        {loading ? (
          <SkeletonLines lines={4} gap={12} />
        ) : tasks.length === 0 ? (
          <EmptyState icon="ListTodo" title="Aucune tâche" description={search || priority ? 'Aucun résultat pour ces filtres.' : 'Ce projet n’a pas encore de tâches.'} />
        ) : (
          tasks.map((t) => <TaskCard key={t.id} task={t} onPress={() => onOpenTask(t.id)} />)
        )}

        {archived.length > 0 && (
          <>
            <Pressable onPress={() => setArchivedOpen((o) => !o)} style={styles.archivedToggle}>
              <Icon name={archivedOpen ? 'ChevronUp' : 'ChevronDown'} size={13} color={colors.textMuted} />
              <Text style={{ fontSize: 12, fontFamily: FONT.inter.semibold, color: colors.textMuted }}>
                {archived.length} archivée{archived.length !== 1 ? 's' : ''}
              </Text>
            </Pressable>
            {archivedOpen && archived.map((t) => <TaskCard key={t.id} task={t} archived onPress={() => onOpenTask(t.id)} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: FONT.inter.medium,
    paddingVertical: 0,
  },
  prioChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
});
