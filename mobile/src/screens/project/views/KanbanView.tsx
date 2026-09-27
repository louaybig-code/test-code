import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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
const COL_GAP = 12;

interface KanbanViewProps {
  projectId: string;
  onOpenTask: (taskId: string) => void;
  /** web parity: column "+" quick-creates a task with that status pre-selected */
  onQuickCreateTask?: (statusKey: string) => void;
}

interface DragState {
  task: Task;
  fromStatus: string;
}

/**
 * KanbanView — port of web `KanbanBoard`.
 * Same data flow (getBoard → moveTask with optimistic update + revert).
 * REAL drag & drop: long-press a card to lift it, drag it onto another
 * column, release to drop (works with touch and mouse). The "···" button /
 * the tap-anywhere alternative still opens the "Déplacer vers…" sheet.
 */
export const KanbanView: React.FC<KanbanViewProps> = ({ projectId, onOpenTask, onQuickCreateTask }) => {
  const { colors } = useTheme();
  const { viewRefreshKey, setActiveView } = useAppState();
  const { hasAbility, loading: permsLoading } = usePermissions();
  const { height: winH } = useWindowDimensions();
  // columns' task list adapts to the screen height (no cut-off content)
  const listMaxH = Math.max(280, winH - 330);

  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // move sheet state
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [moving, setMoving] = useState(false);

  // ── drag & drop state ────────────────────────────────────────────────────
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const ghost = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [hoverCol, setHoverCol] = useState<string | null>(null);
  const boardWrapRef = useRef<View>(null);
  const hScrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const boardWinRef = useRef({ x: 0, y: 0 });
  const colLayouts = useRef<Array<{ key: string; x: number; w: number }>>([]);
  const lastAutoScroll = useRef(0);

  const load = useCallback(async () => {
    try {
      const board: any = await apiService.getBoard(projectId);
      // web parity: columns sorted by workflow status position
      const cols: BoardColumn[] = [...(board?.columns ?? [])].sort(
        (a, b) => (a.status.position ?? 0) - (b.status.position ?? 0)
      );
      setColumns(cols);
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

  /** column at an x position in content coordinates (null if between columns) */
  const columnAtContentX = (contentX: number): { key: string; status: ProjectStatus } | null => {
    for (const l of colLayouts.current) {
      if (contentX >= l.x - COL_GAP / 2 && contentX <= l.x + l.w + COL_GAP / 2) {
        return { key: l.key, status: null as any };
      }
    }
    return null;
  };

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

  // ── drag lifecycle ───────────────────────────────────────────────────────
  const startDrag = (task: Task, statusKey: string) => {
    if (!canMove) return;
    boardWrapRef.current?.measureInWindow((x: number, y: number) => {
      boardWinRef.current = { x, y };
    });
    const d: DragState = { task, fromStatus: statusKey };
    dragRef.current = d;
    setDrag(d);
  };

  const endDrag = (pageX: number, cancelled = false) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    const currentHover = hoverCol;
    setHoverCol(null);
    if (!d || cancelled) return;
    if (!currentHover) return;
    const targetCol = colLayouts.current.find((l) => l.key === currentHover);
    if (!targetCol) return;
    const fromKey = d.task.status;
    const toKey = targetCol.key;
    if (fromKey === toKey) return; // same column — no-op
    void handleMove({ ...d.task, status: fromKey }, toKey);
  };

  // Board-level responder: claims the gesture only once a drag is armed
  // (by a card's long-press), so normal scrolling/taps are untouched.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => !!dragRef.current,
      onPanResponderTerminationRequest: () => !dragRef.current,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        ghost.setValue({
          x: evt.nativeEvent.pageX - boardWinRef.current.x,
          y: evt.nativeEvent.pageY - boardWinRef.current.y,
        });
      },
      onPanResponderMove: (evt) => {
        const bx = evt.nativeEvent.pageX - boardWinRef.current.x;
        const by = evt.nativeEvent.pageY - boardWinRef.current.y;
        ghost.setValue({ x: bx, y: by });

        // edge auto-scroll (horizontal board)
        const now = Date.now();
        if (now - lastAutoScroll.current > 60) {
          const EDGE = 56;
          const boardW = SCREEN_W;
          if (bx < EDGE && scrollXRef.current > 0) {
            hScrollRef.current?.scrollTo({ x: Math.max(0, scrollXRef.current - 28), animated: false });
            lastAutoScroll.current = now;
          } else if (bx > boardW - EDGE) {
            hScrollRef.current?.scrollTo({ x: scrollXRef.current + 28, animated: false });
            lastAutoScroll.current = now;
          }
        }

        // hover column highlight
        const hit = columnAtContentX(bx + scrollXRef.current);
        setHoverCol((prev) => (prev === (hit?.key ?? null) ? prev : hit?.key ?? null));
      },
      onPanResponderRelease: (evt) => endDrag(evt.nativeEvent.pageX),
      onPanResponderTerminate: (evt) => endDrag(evt.nativeEvent.pageX, true),
    })
  ).current;

  // drag ghost style (lifted card following the finger)
  const ghostStyle = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: COL_W - 20,
    zIndex: 999,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    transform: [
      { translateX: Animated.add(ghost.x, new Animated.Value(-(COL_W - 20) / 2)) },
      { translateY: Animated.add(ghost.y, new Animated.Value(-40)) },
      { rotate: '2deg' },
      { scale: 1.03 },
    ] as any,
    opacity: 0.96,
  };

  const totalTasks = columns.reduce((n, c) => n + c.tasks.length, 0);

  return (
    <View style={{ flex: 1 }}>
      <View ref={boardWrapRef} style={{ flex: 1 }} {...panResponder.panHandlers}>
        <ScrollView
          ref={hScrollRef}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!drag}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollXRef.current = e.nativeEvent.contentOffset.x;
          }}
          contentContainerStyle={{ padding: 14, gap: COL_GAP, paddingBottom: 96 }}
          style={{ backgroundColor: colors.bg }}
        >
          {columns.map((col) => {
            const colKey = col.status.key || col.status.id;
            const isHover = drag != null && hoverCol === colKey;
            return (
              <View
                key={col.status.id}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  const entry = { key: colKey, x, w: width };
                  const idx = colLayouts.current.findIndex((l) => l.key === colKey);
                  if (idx >= 0) colLayouts.current[idx] = entry;
                  else colLayouts.current.push(entry);
                }}
                style={[
                  styles.column,
                  { backgroundColor: colors.surface, borderColor: isHover ? BRAND.teal : colors.border },
                  isHover && { borderWidth: 2, borderStyle: 'dashed' },
                ]}
              >
                {/* column header */}
                <View style={styles.colHeader}>
                  <View style={[styles.colDot, { backgroundColor: col.status.color || BRAND.teal }]} />
                  <Text numberOfLines={1} style={[styles.colTitle, { color: colors.text }]}>
                    {col.status.name}
                  </Text>
                  <View style={[styles.countBadge, { backgroundColor: colors.surface2 }]}>
                    <Text style={{ fontSize: 10.5, fontFamily: FONT.inter.bold, color: colors.textMuted }}>{col.tasks.length}</Text>
                  </View>
                  {!!onQuickCreateTask && (
                    <Pressable
                      onPress={() => onQuickCreateTask(col.status.key || col.status.name.toLowerCase())}
                      hitSlop={10}
                      accessibilityLabel={`Créer une tâche dans ${col.status.name}`}
                      style={[styles.colAdd, { backgroundColor: BRAND.orange08, borderColor: BRAND.orange15 }]}
                    >
                      <Icon name="Plus" size={13} color={BRAND.orange} strokeWidth={2.6} />
                    </Pressable>
                  )}
                </View>

                {/* task list */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  scrollEnabled={!drag}
                  style={{ maxHeight: listMaxH }}
                  contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                >
                  {col.tasks.map((task) => {
                    const draggingThis = drag?.task.id === task.id;
                    return (
                      <View key={task.id} style={draggingThis && { opacity: 0.3 }}>
                        <TaskCard
                          task={task}
                          onPress={() => onOpenTask(task.id)}
                          onLongPress={
                            canMove
                              ? () => {
                                  startDrag(task, colKey);
                                }
                              : undefined
                          }
                          onMore={canMove ? () => setMovingTask(task) : undefined}
                        />
                      </View>
                    );
                  })}
                  {col.tasks.length === 0 && (
                    <View style={styles.emptyCol}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: FONT.inter.regular }}>Aucune tâche</Text>
                    </View>
                  )}
                </ScrollView>

                {canMove && !drag && (
                  <Text style={styles.hint}>Glissez une carte pour la déplacer (appui long)</Text>
                )}
              </View>
            );
          })}

          {!columns.length && loading && (
            <View style={{ width: COL_W, gap: 10 }}>
              <Skeleton height={40} />
              <Skeleton height={90} />
              <Skeleton height={90} />
            </View>
          )}
        </ScrollView>

        {/* drag ghost — lifted card following the finger */}
        {drag && (
          <Animated.View pointerEvents="none" style={ghostStyle}>
            <TaskCard task={drag.task} />
          </Animated.View>
        )}

        {/* drag instruction bar */}
        {drag && (
          <View pointerEvents="none" style={[styles.dragBar, { backgroundColor: BRAND.teal }]}>
            <Text style={{ color: '#fff', fontSize: 12.5, fontFamily: FONT.inter.semibold }}>
              Déposez sur la colonne cible
            </Text>
          </View>
        )}
      </View>

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

      {/* move-to-column sheet (drag & drop alternative, kept) */}
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
  colAdd: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
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
  dragBar: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
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
