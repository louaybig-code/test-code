import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { apiService } from '../../../services/api';
import { useAppState } from '../../../state/AppStateContext';
import { useTheme } from '../../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../../theme/tokens';
import { Icon } from '../../../components/Icon';
import { SkeletonLines } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { toast } from '../../../components/toast';
import { ProjectStats, TaskPriority } from '../../../types';
import { PRIORITY_CONFIG } from '../../../lib/constants';

/**
 * StatsView — port of web `ProjectStatsView` (GET /projects/:id/stats):
 * summary cards, SVG completion ring, priority distribution
 * and task-count by status. Same data; no dummy values.
 */
export const StatsView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { colors } = useTheme();
  const { viewRefreshKey } = useAppState();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiService
      .getProjectStats(projectId)
      // web parity: handle wrapped response (response?.data || response)
      .then((s: any) => setStats(s?.data ?? s))
      .catch((err: any) => toast.error(err.message || 'Erreur de chargement des statistiques'))
      .finally(() => setLoading(false));
  }, [projectId, viewRefreshKey]);

  if (loading) {
    return (
      <View style={{ padding: 18 }}>
        <SkeletonLines lines={4} gap={12} />
      </View>
    );
  }
  if (!stats) {
    return <EmptyState icon="Activity" title="Pas de statistiques" description="Les statistiques apparaîtront dès que le projet contiendra des tâches." />;
  }

  const s: any = stats;
  const total = s.totalTasks ?? s.total ?? 0;
  const completed = s.completedTasks ?? s.completed ?? s.done ?? 0;
  const inProgress = s.inProgressTasks ?? s.inProgress ?? 0;
  const overdue = s.overdueTasks ?? s.overdue ?? 0;
  const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

  const byPriorityRaw: Record<string, number> = s.byPriority ?? {};
  const byStatusRaw: Record<string, number> = s.byStatus ?? {};

  const cards = [
    { label: 'Total', value: total, color: '#3B82F6', icon: 'ListTodo' },
    { label: 'Terminées', value: completed, color: '#10B981', icon: 'CheckCircle2' },
    { label: 'En cours', value: inProgress, color: BRAND.orange, icon: 'Clock' },
    { label: 'En retard', value: overdue, color: '#EF4444', icon: 'AlertTriangle' },
  ];

  // SVG completion ring
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const progress = total > 0 ? completed / total : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {/* summary cards */}
      <View style={styles.cardsRow}>
        {cards.map((c) => (
          <View key={c.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: c.color + '1A' }]}>
              <Icon name={c.icon as any} size={14} color={c.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{c.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* completion ring */}
      <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Progression globale</Text>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Circle cx={70} cy={70} r={R} stroke={colors.surface3} strokeWidth={12} fill="none" />
            <Circle
              cx={70}
              cy={70}
              r={R}
              stroke={BRAND.teal}
              strokeWidth={12}
              fill="none"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
            />
            <SvgText x={70} y={70} textAnchor="middle" dy={-2} fontSize={22} fontFamily={FONT.sora.bold} fill={colors.text}>
              {completion}%
            </SvgText>
            <SvgText x={70} y={70} textAnchor="middle" dy={18} fontSize={9} fontFamily={FONT.inter.medium} fill={colors.textMuted}>
              terminé
            </SvgText>
          </Svg>
        </View>
      </View>

      {/* priority distribution */}
      {Object.keys(byPriorityRaw).length > 0 && (
        <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Par priorité</Text>
          {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((p) => {
            const count = byPriorityRaw[p] ?? 0;
            const max = Math.max(...Object.values(byPriorityRaw), 1);
            const cfg = PRIORITY_CONFIG[p];
            return (
              <View key={p} style={{ marginTop: 11 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.semibold, color: cfg.iconColor }}>{cfg.label}</Text>
                  <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.bold, color: colors.text }}>{count}</Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface3 }}>
                  <View
                    style={{
                      width: `${Math.max(3, (count / max) * 100)}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: cfg.iconColor,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* by status */}
      {Object.keys(byStatusRaw).length > 0 && (
        <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Par statut</Text>
          {Object.entries(byStatusRaw).map(([status, count]) => {
            const max = Math.max(...Object.values(byStatusRaw), 1);
            return (
              <View key={status} style={{ marginTop: 11 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.semibold, color: colors.text }}>{status}</Text>
                  <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.bold, color: colors.text }}>{count}</Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface3 }}>
                  <View style={{ width: `${Math.max(3, (count / max) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: BRAND.orange }} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontFamily: FONT.sora.bold,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONT.inter.medium,
    marginTop: 2,
  },
  block: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
  },
  blockTitle: {
    fontSize: 14,
    fontFamily: FONT.inter.bold,
  },
});
