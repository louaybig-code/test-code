import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { apiService } from '../../../services/api';
import { useAppState } from '../../../state/AppStateContext';
import { useTheme } from '../../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../../theme/tokens';
import { SkeletonLines } from '../../../components/ui/Skeleton';
import { toast } from '../../../components/toast';

/**
 * DashboardView — port of web `features/dashboard/DashboardView.tsx`.
 * Same datasets (from /projects/:id/stats), rendered with hand-built SVG
 * charts instead of recharts.
 */
export const DashboardView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { colors } = useTheme();
  const { viewRefreshKey } = useAppState();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiService
      .getProjectStats(projectId)
      .then((s: any) => setStats(s))
      .catch((err: any) => toast.error(err.message || 'Erreur'))
      .finally(() => setLoading(false));
  }, [projectId, viewRefreshKey]);

  if (loading) {
    return (
      <View style={{ padding: 18 }}>
        <SkeletonLines lines={3} />
      </View>
    );
  }

  const byStatus: Record<string, number> = stats?.byStatus ?? {};
  const byPriority: Record<string, number> = stats?.byPriority ?? {};
  const statusColors = [BRAND.teal, BRAND.orange, '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#F43F5E'];

  const statusEntries = Object.entries(byStatus);
  const statusTotal = Math.max(statusEntries.reduce((n, [, v]) => n + v, 0), 1);
  const chartW = 320;
  let x = 0;
  const segments = statusEntries.map(([name, value], i) => {
    const w = (value / statusTotal) * chartW;
    const seg = { name, value, x, w, color: statusColors[i % statusColors.length] };
    x += w;
    return seg;
  });

  const prioEntries = (Object.entries(byPriority) as [string, number][]).filter(([, v]) => v > 0);
  const prioMax = Math.max(...prioEntries.map(([, v]) => v), 1);
  const BAR_H = 28;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={[styles.h1, { color: colors.text }]}>Tableau de bord</Text>

      {/* stacked status bar */}
      <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Répartition des tâches par statut</Text>
        {segments.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontFamily: FONT.inter.regular, fontSize: 12, marginTop: 6 }}>Aucune tâche.</Text>
        ) : (
          <>
            <Svg width="100%" height={BAR_H} viewBox={`0 0 ${chartW} ${BAR_H}`} preserveAspectRatio="none">
              {segments.map((s, i) => (
                <Rect key={s.name} x={s.x} y={0} width={Math.max(s.w - 1, 0)} height={BAR_H} rx={4} fill={s.color} />
              ))}
            </Svg>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
              {segments.map((s) => (
                <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: s.color }} />
                  <Text style={{ fontSize: 11, fontFamily: FONT.inter.medium, color: colors.text }}>
                    {s.name} · {s.value}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* priority bars */}
      <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Tâches par priorité</Text>
        {prioEntries.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontFamily: FONT.inter.regular, fontSize: 12, marginTop: 6 }}>Aucune tâche.</Text>
        ) : (
          prioEntries.map(([name, value]) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Text style={{ width: 64, fontSize: 11.5, fontFamily: FONT.inter.semibold, color: colors.text }}>{name}</Text>
              <View style={{ flex: 1, height: 20, borderRadius: 6, backgroundColor: colors.surface3 }}>
                <View
                  style={{
                    width: `${Math.max(4, (value / prioMax) * 100)}%`,
                    height: 20,
                    borderRadius: 6,
                    backgroundColor: name === 'URGENT' ? '#F43F5E' : name === 'HIGH' ? BRAND.orange : name === 'MEDIUM' ? BRAND.teal : '#6B7280',
                    justifyContent: 'center',
                    paddingLeft: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONT.inter.bold }}>{value}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 18,
    fontFamily: FONT.sora.bold,
    marginBottom: 14,
  },
  block: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
  },
  blockTitle: {
    fontSize: 13.5,
    fontFamily: FONT.inter.bold,
  },
});
