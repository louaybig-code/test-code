import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiService } from '../../../services/api';
import { usePermissions } from '../../../context/PermissionsContext';
import { useTheme } from '../../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../../theme/tokens';
import { Icon } from '../../../components/Icon';
import { TaskCard } from '../../../components/TaskCard';
import { Sheet } from '../../../components/ui/Sheet';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { toast } from '../../../components/toast';
import { BoardColumn, ProjectStatus, Task } from '../../../types';
import { useAppState } from '../../../state/AppStateContext';

const { width: SCREEN_W } = Dimensions.get('window');
const COL_W = Math.min(SCREEN_W * 0.78, 320);

interface KanbanViewProps {
  projectId: string;
  onOpenTask: (taskId: string) => void;
}

/**
 * KanbanView — port of web `KanbanBoard`.
 * Same data flow (getBoard → moveTask with optimistic update + revert) —
 * horizontal column scrolling on mobile, and long-press → "move to column"
 * as the touch adaptation of the web's drag & drop.
 */
export const KanbanView: React.FC<KanbanViewProps> = ({ projectId, onOpenTask }) => {
  const { colors } = useTheme();
  const { viewRefreshKey, setActiveView } = useAppState();
  const { hasAbility, loading: permsLoading } = usePermissions();

  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // move sheet state
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => {
    try {
      const board: any = await apiService.getBoard(projectId);
      setColumns(board?.columns ?? []);
    } catch (err: any) {
      toast.error(err.message || 'Erreur de chargement du tableau');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, viewRefreshKey]);

  const canMove = hasAbility('task:move');

  const handleMove = async (task: Task, targetStatusKey: string) => {
    if (task.status === targetStatusKey) {
      setMovingTask(null);
      return;
    }
    // optimistic update — same shape as web dnd handling
    const before = columns;
    const next = columns.map((col) => {
      const isSource = col.status.key === task.status || col.status.id === task.status;
      const isTarget = col.status.key === targetStatusKey || col.status.id === targetStatusKey;
      if (isSource) {
        return { ...col, tasks: col.tasks.filter((t) => t.id !== task.id) };
      }
      if (isTarget) {
        const pos = col.tasks.length;
        return { ...col, tasks: [...col.tasks, { ...task, status: targetStatusKey, position: pos }] };
      }
      return col;
    });
    setColumns(next);
    setMovingTask(null);
    setMoving(true);
    try {
      const targetCol = columns.find((c) => c.status.key === targetStatusKey || c.status.id === targetStatusKey);
      await apiService.moveTask(task.id, {
        status: targetStatusKey,
        position: (targetCol?.tasks.length ?? 0),
      });
    } catch (err: any) {
      setColumns(before); // revert (same as web)
      toast.error(err.message || 'Le statut ne permet pas cette transition');
    } finally {
      setMoving(false);
    }
  };

  const totalTasks = columns.reduce((n, c) => n + c.tasks.length, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 14, gap: 12 }}
        style={{ backgroundColor: colors.bg }}
      >
        {columns.map((col) => (
          <View key={col.status.id} style={[styles.column, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* column header */}
            <View style={styles.colHeader}>
              <View style={[styles.colDot, { backgroundColor: col.status.color || BRAND.teal }]} />
              <Text numberOfLines={1} style={[styles.colTitle, { color: colors.text }]}>
                {col.status.name}
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colors.surface2 }]}>
                <Text style={{ fontSize: 10.5, fontFamily: FONT.inter.bold, color: colors.textMuted }}>{col.tasks.length}</Text>
              </View>
            </View>

            {/* task list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {col.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => onOpenTask(task.id)}
                  onLongPress={canMove ? () => setMovingTask(task) : undefined}
                />
              ))}
              {col.tasks.length === 0 && (
                <View style={styles.emptyCol}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: FONT.inter.regular }}>Aucune tâche</Text>
                </View>
              )}
            </ScrollView>

            {canMove && (
              <Text style={styles.hint}>Appui long sur une carte pour la déplacer</Text>
            )}
          </View>
        ))}

        {!columns.length && loading && (
          <View style={{ width: COL_W, gap: 10 }}>
            <Skeleton height={40} />
            <Skeleton height={90} />
            <Skeleton height={90} />
          </View>
        )}
      </ScrollView>

      {!loading && columns.length === 0 && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' }}>
          <EmptyState
            icon="Kanban"
            title="Aucune colonne"
            description="Configurez les statuts du workflow pour initialiser le tableau Kanban."
            actionLabel="Ouvrir le workflow"
            onAction={() => setActiveView('workflow')}
          />
        </View>
      )}

      {/* move-to-column sheet (drag & drop adaptation) */}
      <Sheet
        visible={!!movingTask}
        onClose={() => setMovingTask(null)}
        title="Déplacer vers…"
        subtitle={movingTask?.title}
        heightFraction={0.55}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
          {columns.map((col) => {
            const current = !!movingTask && (col.status.key === movingTask.status || col.status.id === movingTask.status);
            return (
              <Pressable
                key={col.status.id}
                disabled={current || moving}
                onPress={() => movingTask && handleMove(movingTask, col.status.key)}
                style={[
                  styles.moveOption,
                  {
                    backgroundColor: current ? BRAND.teal08 : colors.surface2,
                    borderColor: current ? 'rgba(26,140,140,0.3)' : colors.border,
                    opacity: current ? 0.6 : 1,
                  },
                ]}
              >
                <View style={[styles.colDot, { backgroundColor: col.status.color || BRAND.teal }]} />
                <Text style={{ flex: 1, fontSize: 14, fontFamily: FONT.inter.semibold, color: current ? BRAND.teal : colors.text }}>
                  {col.status.name}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: FONT.inter.medium }}>
                  {col.tasks.length} tâche{col.tasks.length !== 1 ? 's' : ''}
                </Text>
                {current && <Icon name="Check" size={15} color={BRAND.teal} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    width: COL_W,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 10,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  colDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  colTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.inter.bold,
  },
  countBadge: {
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  emptyCol: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  hint: {
    fontSize: 9.5,
    fontFamily: FONT.inter.regular,
    color: '#6B7494',
    textAlign: 'center',
    paddingTop: 4,
  },
  moveOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 13,
    marginBottom: 8,
  },
});
