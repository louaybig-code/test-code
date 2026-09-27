import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { apiService } from '../../../services/api';
import { useAppState } from '../../../state/AppStateContext';
import { useTheme } from '../../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../../theme/tokens';
import { Icon } from '../../../components/Icon';
import { SkeletonLines } from '../../../components/ui/Skeleton';
import { toast } from '../../../components/toast';
import { BoardColumn, Task } from '../../../types';

const PRIO_COLORS: Record<string, string> = { LOW: '#6B7280', MEDIUM: '#1A8C8C', HIGH: '#E8531A', URGENT: '#EF4444' };
const PRIO_LABELS: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };

/** SVG annular sector path (donut slice). */
function arcSlice(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const rad = (a: number) => (Math.PI / 180) * a;
  const p = (r: number, a: number) => `${cx + r * Math.cos(rad(a))},${cy + r * Math.sin(rad(a))}`;
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${p(rOuter, a0)}`,
    `A ${rOuter},${rOuter} 0 ${large} 1 ${p(rOuter, a1)}`,
    `L ${p(rInner, a1)}`,
    `A ${rInner},${rInner} 0 ${large} 0 ${p(rInner, a0)}`,
    'Z',
  ].join(' ');
}

/**
 * DashboardView — port of web `dashboard/DashboardView`:
 * loads getBoard + getProjectTasks (same as web), KPI row, urgent strip,
 * status donut, priority bars, and "Export CSV".
 * (The web's velocity chart is hardcoded fake data over there — omitted here
 *  rather than inventing data.)
 */
export const DashboardView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { colors } = useTheme();
  const { viewRefreshKey } = useAppState();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([apiService.getBoard(projectId), apiService.getProjectTasks(projectId)])
      .then(([bd, tl]: any[]) => {
        setColumns(bd?.columns ?? []);
        setTasks(Array.isArray(tl) ? tl : tl?.tasks ?? []);
      })
      .catch((err: any) => toast.error(err?.message || 'Erreur lors du chargement du tableau de bord'))
      .finally(() => setLoading(false));
  }, [projectId, viewRefreshKey]);

  // ── computed (same math as web) ──────────────────────────────────────────
  const statusData = columns.map((col) => ({
    name: col.status.name,
    value: col.tasks.length,
    color: col.status.color || BRAND.teal,
  }));
  const priorityCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  tasks.forEach((t: any) => {
    if (t.priority in priorityCounts) priorityCounts[t.priority]++;
  });
  const totalDone = tasks.filter((t: any) => t.status === 'done').length;
  const totalProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
  const totalUrgent = priorityCounts.URGENT;
  const totalStatusValue = Math.max(
    statusData.reduce((n: number, s) => n + s.value, 0),
    1
  );

  // ── CSV export (web: <a download>; native: file + share sheet) ───────────
  const exportCSV = async () => {
    if (!tasks.length) {
      toast.error('Aucune tâche à exporter');
      return;
    }
    setExporting(true);
    try {
      const headers = ['ID', 'Title', 'Status', 'Priority', 'Created'];
      const rows = tasks.map((t: any) => [t.id, `"${(t.title ?? '').replace(/"/g, '""')}"`, t.status, t.priority, t.createdAt ?? '']);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');

      if (Platform.OS === 'web') {
        // same approach as the web app — data URI + anchor click
        const a = Object.assign(document.createElement('a'), {
          href: 'data:text/csv;charset=utf-8,' + encodeURI(csv),
          download: `studiopilot_${projectId}.csv`,
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const FileSystem = require('expo-file-system/legacy');
        const Sharing = require('expo-sharing');
        const uri = `${FileSystem.cacheDirectory}studiopilot_${projectId}.csv`;
        await FileSystem.writeAsStringAsync(uri, csv, { encoding: 'utf8' });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Exporter les tâches (CSV)' });
        } else {
          toast.success(`CSV sauvegardé : ${uri}`);
        }
      }
      toast.success('CSV exporté !');
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 18 }}>
        <SkeletonLines lines={4} gap={12} />
      </View>
    );
  }

  // donut geometry
  const DONUT_SIZE = 170;
  const CX = DONUT_SIZE / 2;
  const R_OUT = 78;
  const R_IN = 46;
  let acc = -90; // start at 12 o'clock

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
      {/* ── header + export (web parity) ── */}
      <View style={[styles.card, styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics Dashboard</Text>
          <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.regular, color: colors.textMuted, marginTop: 3 }}>
            Performance tracking, team velocity and workload distribution.
          </Text>
        </View>
        <Pressable
          onPress={exportCSV}
          disabled={exporting}
          style={[styles.exportBtn, { borderColor: BRAND.teal, opacity: exporting ? 0.6 : 1 }]}
        >
          <Icon name="Download" size={13} color={BRAND.teal} />
          <Text style={{ fontSize: 12, fontFamily: FONT.inter.semibold, color: BRAND.teal }}>
            {exporting ? 'Export…' : 'Export CSV'}
          </Text>
        </Pressable>
      </View>

      {/* ── KPI row (web parity) ── */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total Tasks', value: tasks.length, icon: 'BarChart2' as const, color: '#2C3147' },
          { label: 'Completed', value: totalDone, icon: 'CheckCircle' as const, color: BRAND.teal },
          { label: 'In Progress', value: totalProgress, icon: 'Clock' as const, color: BRAND.orange },
        ].map((k) => (
          <View key={k.label} style={[styles.card, styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.kpiIcon, { backgroundColor: k.color + '1F' }]}>
              <Icon name={k.icon} size={15} color={k.color} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{k.value}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* ── urgent strip (web parity) ── */}
      {totalUrgent > 0 && (
        <View style={styles.urgentStrip}>
          <Icon name="AlertTriangle" size={14} color="#EF4444" />
          <Text style={{ fontSize: 12.5, fontFamily: FONT.inter.semibold, color: '#EF4444' }}>
            {totalUrgent} urgent task{totalUrgent > 1 ? 's' : ''} need attention
          </Text>
        </View>
      )}

      {/* ── Status donut (web: status pie) ── */}
      {statusData.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chartTitleRow}>
            <Icon name="PieChart" size={14} color={BRAND.teal} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>Status Distribution</Text>
          </View>
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
              <G>
                {statusData.map((s) => {
                  const angle = (s.value / totalStatusValue) * 360;
                  const a0 = acc;
                  const a1 = acc + (s.value === totalStatusValue ? 359.9 : angle);
                  acc += angle;
                  if (s.value === 0) return null;
                  return <Path key={s.name} d={arcSlice(CX, CX, R_OUT, R_IN, a0, a1)} fill={s.color} stroke={colors.surface} strokeWidth={1.5} />;
                })}
              </G>
            </Svg>
            {/* legend */}
            <View style={{ marginTop: 14, alignSelf: 'stretch', gap: 7 }}>
              {statusData.map((s) => (
                <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
                  <Text style={{ flex: 1, fontSize: 12, fontFamily: FONT.inter.semibold, color: colors.text }}>{s.name}</Text>
                  <Text style={{ fontSize: 12, fontFamily: FONT.inter.bold, color: colors.text }}>{s.value}</Text>
                  <Text style={{ fontSize: 10.5, fontFamily: FONT.inter.medium, color: colors.textMuted, width: 40, textAlign: 'right' }}>
                    {Math.round((s.value / totalStatusValue) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── Priority bars (web: priority bar chart) ── */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.chartTitleRow}>
          <Icon name="BarChart2" size={14} color={BRAND.orange} />
          <Text style={[styles.chartTitle, { color: colors.text }]}>Tasks by Priority</Text>
        </View>
        {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => {
          const count = priorityCounts[p];
          const max = Math.max(...Object.values(priorityCounts), 1);
          return (
            <View key={p} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.semibold, color: PRIO_COLORS[p] }}>{PRIO_LABELS[p]}</Text>
                <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.bold, color: colors.text }}>{count}</Text>
              </View>
              <View style={{ height: 9, borderRadius: 5, backgroundColor: colors.surface3 }}>
                <View
                  style={{
                    width: `${Math.max(count > 0 ? 4 : 0, (count / max) * 100)}%`,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: PRIO_COLORS[p],
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FONT.sora.bold,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: FONT.sora.bold,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontFamily: FONT.inter.medium,
    marginTop: 2,
  },
  urgentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.10)',
    marginBottom: 14,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 13.5,
    fontFamily: FONT.inter.bold,
  },
});
