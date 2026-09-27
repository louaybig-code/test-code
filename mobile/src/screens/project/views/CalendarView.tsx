import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiService } from '../../../services/api';
import { useAppState } from '../../../state/AppStateContext';
import { useTheme } from '../../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../../theme/tokens';
import { Icon } from '../../../components/Icon';
import { TaskCard } from '../../../components/TaskCard';
import { SkeletonLines } from '../../../components/ui/Skeleton';
import { toast } from '../../../components/toast';
import { PRIORITY_CONFIG } from '../../../lib/constants';
import { Task } from '../../../types';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

/**
 * CalendarView — port of web `CalendarView` (fr-FR month grid).
 * Tasks fetched for the visible month via getCalendarTasks(from, to);
 * tapping a day lists its tasks below the grid.
 */
export const CalendarView: React.FC<{ projectId: string; onOpenTask: (taskId: string) => void }> = ({ projectId, onOpenTask }) => {
  const { colors } = useTheme();
  const { viewRefreshKey } = useAppState();
  const today = new Date();

  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(() =>
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  useEffect(() => {
    const { y, m } = cursor;
    const from = new Date(y, m, 1).toISOString();
    const to = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
    setLoading(true);
    apiService
      .getCalendarTasks(projectId, from, to)
      .then((list: any) => setTasks(Array.isArray(list) ? list : []))
      .catch((err: any) => toast.error(err.message || 'Erreur de chargement du calendrier'))
      .finally(() => setLoading(false));
  }, [projectId, cursor, viewRefreshKey]);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    (tasks ?? []).forEach((t) => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const { y, m } = cursor;
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday-first (same as web)
    const arr: (number | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [cursor]);

  const isoDate = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const selectedTasks = byDay.get(selectedDay) ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
      {/* header nav */}
      <View style={styles.nav}>
        <Pressable
          onPress={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
          style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Icon name="ChevronLeft" size={17} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>
          {MONTHS[cursor.m]} {cursor.y}
        </Text>
        <Pressable
          onPress={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
          style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Icon name="ChevronRight" size={17} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* grid card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={[styles.weekday, { color: colors.textMuted }]}>
              {d}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((d, i) => {
            if (d == null) return <View key={`x${i}`} style={styles.dayCell} />;
            const key = isoDate(d);
            const dayTasks = byDay.get(key) ?? [];
            const isSel = selectedDay === key;
            const isToday =
              d === today.getDate() && cursor.m === today.getMonth() && cursor.y === today.getFullYear();
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedDay(key)}
                style={[
                  styles.dayCell,
                  isSel && { backgroundColor: BRAND.orange08, borderWidth: 1, borderColor: 'rgba(232,83,26,0.35)', borderRadius: RADIUS.md },
                  isToday && !isSel && { borderWidth: 1, borderColor: BRAND.teal, borderRadius: RADIUS.md },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: isToday || isSel ? FONT.inter.bold : FONT.inter.medium,
                    color: isSel ? BRAND.orange : isToday ? BRAND.teal : colors.text,
                  }}
                >
                  {d}
                </Text>
                <View style={{ flexDirection: 'row', gap: 2, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {dayTasks.slice(0, 3).map((t) => (
                    <View
                      key={t.id}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: PRIORITY_CONFIG[t.priority]?.iconColor ?? BRAND.teal,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* selected day tasks */}
      <Text style={[styles.dayTitle, { color: colors.text }]}>
        {selectedTasks.length > 0 ? `${selectedTasks.length} tâche${selectedTasks.length !== 1 ? 's' : ''} • le ${selectedDay.split('-')[2]}` : 'Tâches du jour'}
      </Text>
      {loading ? (
        <SkeletonLines lines={2} gap={10} />
      ) : selectedTasks.length === 0 ? (
        <Text style={{ fontSize: 12.5, fontFamily: FONT.inter.regular, color: colors.textMuted }}>
          Aucune tâche avec une échéance ce jour-là.
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {selectedTasks.map((t) => (
            <TaskCard key={t.id} task={t} onPress={() => onOpenTask(t.id)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontFamily: FONT.sora.bold,
  },
  card: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 18,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10.5,
    fontFamily: FONT.inter.bold,
  },
  dayCell: {
    width: '14.285%',
    minHeight: 52,
    alignItems: 'center',
    paddingTop: 6,
  },
  dayTitle: {
    fontSize: 14,
    fontFamily: FONT.inter.bold,
    marginBottom: 10,
  },
});
