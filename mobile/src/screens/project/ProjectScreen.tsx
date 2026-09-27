import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PermissionsProvider } from '../../context/PermissionsContext';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { KanbanView } from './views/KanbanView';
import { BacklogView } from './views/BacklogView';
import { ListView } from './views/ListView';
import { CalendarView } from './views/CalendarView';
import { WorkflowView } from './views/WorkflowView';
import { StatsView } from './views/StatsView';
import { DashboardView } from './views/DashboardView';
import { ChannelsView } from '../channels/ChannelsView';
import { ProjectSettingsSheet } from '../projects/ProjectSettingsSheet';

/** Exact same tab set as web `Navbar.tsx` VIEWS. */
const VIEWS = [
  { id: 'kanban', label: 'Kanban', icon: 'Kanban' },
  { id: 'backlog', label: 'Backlog', icon: 'Rocket' },
  { id: 'list', label: 'Liste', icon: 'ListTodo' },
  { id: 'calendar', label: 'Calendrier', icon: 'Calendar' },
  { id: 'workflow', label: 'Workflow', icon: 'GitFork' },
  { id: 'stats', label: 'Statistiques', icon: 'Activity' },
  { id: 'channels', label: 'Discussion', icon: 'MessageSquare' },
] as const;

interface ProjectScreenProps {
  onOpenTask: (taskId: string) => void;
  onOpenCreateTask: () => void;
}

/**
 * ProjectScreen — wraps every project view in PermissionsProvider (exactly
 * like the web), plus the horizontally-scrollable view tab chips.
 */
export const ProjectScreen: React.FC<ProjectScreenProps> = ({ onOpenTask, onOpenCreateTask }) => {
  const { colors } = useTheme();
  const { activeProject, activeWorkspace, activeView, setActiveView, viewRefreshKey } = useAppState();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  if (!activeProject) return null;
  const view = activeView || 'kanban';

  let body: React.ReactNode = null;
  if (view === 'kanban') body = <KanbanView projectId={activeProject.id} onOpenTask={onOpenTask} />;
  else if (view === 'backlog') body = <BacklogView projectId={activeProject.id} onOpenTask={onOpenTask} />;
  else if (view === 'list') body = <ListView projectId={activeProject.id} onOpenTask={onOpenTask} />;
  else if (view === 'calendar') body = <CalendarView projectId={activeProject.id} onOpenTask={onOpenTask} />;
  else if (view === 'workflow') body = <WorkflowView projectId={activeProject.id} />;
  else if (view === 'stats') body = <StatsView projectId={activeProject.id} />;
  else if (view === 'dashboard') body = <DashboardView projectId={activeProject.id} />;
  else if (view === 'channels' && activeWorkspace) body = <ChannelsView workspaceId={activeWorkspace.id} />;
  else body = <KanbanView projectId={activeProject.id} onOpenTask={onOpenTask} />;

  return (
    <PermissionsProvider projectId={activeProject.id}>
      <View style={{ flex: 1 }}>
        {/* ── View tab chips (web: VIEWS tabs in Navbar) ── */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}
          >
            {VIEWS.map((v) => {
              const active = view === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setActiveView(v.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? BRAND.orange : 'transparent',
                      borderColor: active ? BRAND.orange : colors.border,
                    },
                  ]}
                >
                  <Icon name={v.icon as any} size={12.5} color={active ? '#fff' : colors.textMuted} strokeWidth={2.4} />
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.textMuted }]}>{v.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {/* project settings (web: ProjectSettingsModal trigger) */}
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={8} style={[styles.settingsBtn, { borderLeftColor: colors.border }]}>
            <Icon name="Settings" size={15} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* ── View body ── */}
        <View key={`${view}-${viewRefreshKey}`} style={{ flex: 1 }}>{body}</View>

        <ProjectSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </View>
    </PermissionsProvider>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  settingsBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderLeftWidth: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: FONT.inter.semibold,
  },
});
