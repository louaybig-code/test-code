import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppState } from '../state/AppStateContext';
import { useTheme } from '../theme/ThemeContext';
import { AppHeader } from './AppHeader';
import { AppDrawer } from './AppDrawer';
import { OrgsHomeScreen } from '../screens/home/OrgsHomeScreen';
import { OrgDetailScreen } from '../screens/home/OrgDetailScreen';
import { WorkspaceScreen } from '../screens/workspaces/WorkspaceScreen';
import { ProjectScreen } from '../screens/project/ProjectScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { CreateTaskSheet } from '../screens/tasks/CreateTaskSheet';
import { TaskDetailSheet } from '../screens/tasks/TaskDetailSheet';
import { CreateProjectSheet } from '../screens/projects/CreateProjectSheet';
import { CreateWorkspaceSheet } from '../screens/workspaces/CreateWorkspaceSheet';
import { OrgSettingsSheet } from '../screens/orgs/OrgSettingsSheet';
import { InviteOrgMemberSheet } from '../screens/orgs/InviteOrgMemberSheet';
import { useUnreadSync } from '../screens/notifications/useUnreadSync';

/**
 * AppShell — the mobile equivalent of web `App.tsx`'s logged-in layout:
 * header + drawer + content area switching on AppState + global sheets.
 */
export const AppShell: React.FC = () => {
  const { colors } = useTheme();
  const { activeScreen, activeOrg, activeWorkspace, activeProject, bootstrapDone } = useAppState();

  // Keep the unread-notifications badge live (REST + socket)
  useUnreadSync();

  // drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  // sheets
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);
  const [createTaskPreset, setCreateTaskPreset] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [orgSettingsOpen, setOrgSettingsOpen] = useState(false);
  const [orgSettingsTab, setOrgSettingsTab] = useState<'create' | 'members'>('create');
  const [inviteOrgOpen, setInviteOrgOpen] = useState(false);

  let content: React.ReactNode = null;
  if (!bootstrapDone) {
    content = <View style={{ flex: 1 }} />;
  } else if (activeScreen === 'project' && activeProject) {
    content = (
      <ProjectScreen
        onOpenTask={(id) => setTaskDetailId(id)}
        onOpenCreateTask={(statusKey) => {
          setCreateTaskPreset(statusKey ?? null);
          setCreateTaskOpen(true);
        }}
      />
    );
  } else if (activeScreen === 'workspace' && activeOrg && activeWorkspace) {
    content = (
      <WorkspaceScreen
        onOpenCreateProject={() => setCreateProjectOpen(true)}
        onOpenTask={(id) => setTaskDetailId(id)}
      />
    );
  } else if (activeScreen === 'org' && activeOrg) {
    content = (
      <OrgDetailScreen
        onOpenInvite={() => setInviteOrgOpen(true)}
        onOpenOrgSettings={(tab) => {
          setOrgSettingsTab(tab);
          setOrgSettingsOpen(true);
        }}
        onOpenCreateWs={() => setCreateWsOpen(true)}
      />
    );
  } else {
    content = <OrgsHomeScreen onOpenCreateOrg={() => { setOrgSettingsTab('create'); setOrgSettingsOpen(true); }} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <AppHeader
        onMenuPress={() => setDrawerOpen(true)}
        onNotificationsPress={() => setNotifOpen(true)}
        onSearchPress={() => setSearchOpen(true)}
        onProfilePress={() => setProfileOpen(true)}
      />

      <View style={styles.content}>{content}</View>

      <AppDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenCreateProject={() => setCreateProjectOpen(true)}
        onOpenOrgSettings={(tab) => {
          setOrgSettingsTab(tab);
          setOrgSettingsOpen(true);
        }}
        onOpenInviteOrg={() => setInviteOrgOpen(true)}
        onOpenWorkspaceSettings={() => setCreateWsOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
      />

      {/* global sheets */}
      <NotificationsScreen visible={notifOpen} onClose={() => setNotifOpen(false)} onOpenTask={(id) => { setNotifOpen(false); setTaskDetailId(id); }} />
      <SearchScreen visible={searchOpen} onClose={() => setSearchOpen(false)} onOpenTask={(id) => { setSearchOpen(false); setTaskDetailId(id); }} />
      <ProfileScreen visible={profileOpen} onClose={() => setProfileOpen(false)} />
      <CreateTaskSheet visible={createTaskOpen} initialStatus={createTaskPreset} onClose={() => setCreateTaskOpen(false)} />
      <TaskDetailSheet taskId={taskDetailId} onClose={() => setTaskDetailId(null)} />
      <CreateProjectSheet visible={createProjectOpen} onClose={() => setCreateProjectOpen(false)} />
      <CreateWorkspaceSheet visible={createWsOpen} onClose={() => setCreateWsOpen(false)} />
      <OrgSettingsSheet visible={orgSettingsOpen} defaultTab={orgSettingsTab} onClose={() => setOrgSettingsOpen(false)} />
      <InviteOrgMemberSheet visible={inviteOrgOpen} onClose={() => setInviteOrgOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
