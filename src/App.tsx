import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { AuthPages } from './features/auth/AuthPages';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Modal } from './components/Modal';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { CommandBar } from './components/CommandBar';
// import { CookieBanner } from './components/CookieBanner'; // Disabled - blocked by ad blockers
import { OrgSettingsModal } from './features/organization/OrgSettingsModal';
import { InviteOrgMemberModal } from './features/organization/InviteOrgMemberModal';
import { WorkspaceSettingsModal } from './features/organization/WorkspaceSettingsModal';
import { CreateProjectModal } from './features/projects/CreateProjectModal';
import { ProjectSettingsModal } from './features/projects/ProjectSettingsModal';
import { CreateTaskModal } from './features/tasks/CreateTaskModal';
import { TaskDetailDrawer } from './features/tasks/TaskDetailDrawer';
import { ProfileSettingsModal } from './features/profile/ProfileSettingsModal';

import { KanbanBoard } from './features/board/KanbanBoard';
import { BacklogView } from './features/backlog/BacklogView';
import { ListView } from './features/list/ListView';
import { CalendarView } from './features/calendar/CalendarView';
import { WorkflowEditor } from './features/workflow/WorkflowEditor';
import { DashboardView } from './features/dashboard/DashboardView';
import { ProjectStatsView } from './features/dashboard/ProjectStatsView';
import { ChannelsView } from './features/channels/ChannelsView';
import { AllOrganizationsView } from './features/dashboard/AllOrganizationsView';

import { apiService } from './services/api';
import { reconnectSocketWithToken, disconnectSocket } from './hooks/useSocket';
import { Organization, Workspace, Project, Task } from './types';
import { Toaster } from 'react-hot-toast';
import { Loader2, Pencil, Trash2, Check, X, AlertTriangle, UserPlus, Users, Settings, ArrowRight, Tag, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function App() {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Active Selections
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Track which orgs the user owns
  const [ownedOrgIds, setOwnedOrgIds] = useState<Set<string>>(new Set());
  const ownedOrgIdsRef = React.useRef<Set<string>>(new Set());

  // Active View
  const [activeView, setActiveView] = useState<string>(() => localStorage.getItem('sp_activeView') || 'kanban');
  const [activeScreen, setActiveScreen] = useState<'project' | 'org' | 'workspace'>('org');

  // ── Persist helpers ────────────────────────────────────────────────────────
  const saveNav = (screen: string, orgId: string, wsId: string, projId: string, view?: string) => {
    localStorage.setItem('sp_activeScreen', screen);
    localStorage.setItem('sp_activeOrgId', orgId);
    localStorage.setItem('sp_activeWsId', wsId);
    localStorage.setItem('sp_activeProjId', projId);
    if (view !== undefined) localStorage.setItem('sp_activeView', view);
  };

  const setActiveScreenP = (s: 'project' | 'org' | 'workspace') => {
    setActiveScreen(s);
    localStorage.setItem('sp_activeScreen', s);
  };
  const setActiveViewP = (v: string) => {
    setActiveView(v);
    localStorage.setItem('sp_activeView', v);
  };
  const setActiveOrgP = (o: Organization | null) => {
    setActiveOrg(o);
    setActiveWorkspace(null);
    setActiveProject(null);
    setWorkspaces([]);
    setProjects([]);
    saveNav('org', o?.id ?? '', '', '');
    // Load workspaces for the newly selected org
    if (o) loadWorkspacesForOrg(o);
  };
  const setActiveWorkspaceP = (w: Workspace | null) => {
    setActiveWorkspace(w);
    setActiveProject(null);
    setProjects([]);
    saveNav('workspace', activeOrg?.id ?? '', w?.id ?? '', '');
    if (w) loadProjectsForWorkspace(w, activeOrg?.id ?? '');
  };
  const setActiveProjectP = (p: Project | null) => {
    setActiveProject(p);
    saveNav('project', activeOrg?.id ?? '', activeWorkspace?.id ?? '', p?.id ?? '');
  };

  // Load workspaces when user manually selects an org
  const loadWorkspacesForOrg = async (org: Organization) => {
    try {
      const myProjects = await apiService.getMyProjects();
      const projectsInOrg = (myProjects ?? []).filter((p: any) => p.organizationId === org.id);
      let workspaceList: Workspace[] = [];

      if (ownedOrgIdsRef.current.has(org.id)) {
        try {
          const orgWorkspaces = await apiService.getOrgWorkspaces(org.id);
          workspaceList = orgWorkspaces ?? [];
        } catch { /* fall through */ }
      }

      if (workspaceList.length === 0) {
        const wsMap = new Map<string, Workspace>();
        projectsInOrg.forEach((proj: any) => {
          if (proj.workspaceId && !wsMap.has(proj.workspaceId)) {
            wsMap.set(proj.workspaceId, {
              id: proj.workspaceId,
              organizationId: org.id,
              name: proj.workspaceName || 'Workspace',
              slug: proj.workspaceId,
              createdAt: proj.createdAt,
              updatedAt: proj.updatedAt,
            });
          }
        });
        workspaceList = Array.from(wsMap.values());
      }

      setWorkspaces(workspaceList);
      if (workspaceList.length > 0) {
        setActiveWorkspace(workspaceList[0]);
        loadProjectsForWorkspace(workspaceList[0], org.id);
      }
    } catch (err) { console.error('loadWorkspacesForOrg error:', err); }
  };

  // Load projects when user manually selects a workspace
  const loadProjectsForWorkspace = async (ws: Workspace, orgId: string) => {
    try {
      const myProjects = await apiService.getMyProjects();
      const projectsInWs = (myProjects ?? []).filter((p: any) => p.workspaceId === ws.id);
      let projectList: Project[] = [];

      if (ownedOrgIdsRef.current.has(orgId)) {
        try {
          const wsProjects = await apiService.getWorkspaceProjects(ws.id);
          const wsIds = new Set((wsProjects ?? []).map((p: any) => p.id));
          const invitedHere = projectsInWs.filter((p: any) => !wsIds.has(p.id));
          projectList = [...(wsProjects ?? []), ...invitedHere];
        } catch { projectList = projectsInWs; }
      } else {
        projectList = projectsInWs;
      }

      setProjects(projectList);
      if (projectList.length > 0) setActiveProject(projectList[0]);
    } catch (err) { console.error('loadProjectsForWorkspace error:', err); }
  };

  // Increment to signal all views to reload data
  const [viewRefreshKey, setViewRefreshKey] = useState(0);
  const triggerViewRefresh = () => setViewRefreshKey((k) => k + 1);

  // Modals & Drawers
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgModalDefaultTab, setOrgModalDefaultTab] = useState<'create' | 'members'>('members');
  const [isInviteOrgModalOpen, setIsInviteOrgModalOpen] = useState(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);

  // Inline edit/delete states for overview screens
  const [editingOrgName, setEditingOrgName] = useState('');
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [orgDeleteConfirm, setOrgDeleteConfirm] = useState('');

  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editingWsName, setEditingWsName] = useState('');
  const [deletingWsId, setDeletingWsId] = useState<string | null>(null);
  const [wsDeleteConfirm, setWsDeleteConfirm] = useState('');

  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editingProjName, setEditingProjName] = useState('');
  const [deletingProjId, setDeletingProjId] = useState<string | null>(null);
  const [projDeleteConfirm, setProjDeleteConfirm] = useState('');

  // Project invite modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('MEMBER');
  const [projectRoles, setProjectRoles] = useState<Array<{name: string; isSystem: boolean}>>([]);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Load project roles when invite modal opens
  useEffect(() => {
    if (!isInviteModalOpen || !activeProject) return;
    
    const loadProjectRoles = async () => {
      try {
        const perms = await apiService.getProjectPermissions(activeProject.id);
        const systemRoleNames = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST', 'CLIENT'];
        
        const roles = (perms.roles || []).map((r: any) => ({
          name: r.name || r.id,
          isSystem: systemRoleNames.includes(r.name || r.id),
        }));
        
        setProjectRoles(roles.length > 0 ? roles : [
          { name: 'OWNER', isSystem: true },
          { name: 'ADMIN', isSystem: true },
          { name: 'MEMBER', isSystem: true },
          { name: 'GUEST', isSystem: true },
          { name: 'CLIENT', isSystem: true },
        ]);
      } catch (error) {
        console.error('Failed to load project roles:', error);
        // Fallback to default roles
        setProjectRoles([
          { name: 'OWNER', isSystem: true },
          { name: 'ADMIN', isSystem: true },
          { name: 'MEMBER', isSystem: true },
          { name: 'GUEST', isSystem: true },
          { name: 'CLIENT', isSystem: true },
        ]);
      }
    };
    
    loadProjectRoles();
  }, [isInviteModalOpen, activeProject]);

  // Project settings modal
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusCategory, setNewStatusCategory] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');
  const [newStatusColor, setNewStatusColor] = useState('#1A8C8C');
  const [initialTaskStatus, setInitialTaskStatus] = useState<string>('todo');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ── Single bootstrap function — loads everything in one shot ────────────────
  const loadEverything = async () => {
    try {
      // Read saved state from localStorage ONCE at the start
      const savedOrgId   = localStorage.getItem('sp_activeOrgId');
      const savedWsId    = localStorage.getItem('sp_activeWsId');
      const savedProjId  = localStorage.getItem('sp_activeProjId');
      const savedScreen  = localStorage.getItem('sp_activeScreen') as 'project' | 'org' | 'workspace' | null;
      const isRestoring  = !!(savedOrgId || savedWsId || savedProjId);

      // 1. Load orgs + all my projects in parallel
      const [ownedOrgsResult, myProjectsResult] = await Promise.allSettled([
        apiService.getOrganizations(),
        apiService.getMyProjects(),
      ]);

      const orgList: Organization[] = ownedOrgsResult.status === 'fulfilled' ? ownedOrgsResult.value ?? [] : [];
      const myProjects: any[] = myProjectsResult.status === 'fulfilled' ? myProjectsResult.value ?? [] : [];

      const ownedIds = new Set(orgList.map((o: Organization) => o.id));
      const knownOrgIds = new Set(orgList.map((o: Organization) => o.id));

      // Add invited orgs derived from project metadata
      myProjects.forEach((proj: any) => {
        if (proj.organizationId && !knownOrgIds.has(proj.organizationId)) {
          orgList.push({
            id: proj.organizationId,
            name: proj.organizationName || 'Organization',
            slug: proj.organizationId,
            createdAt: proj.createdAt,
            updatedAt: proj.updatedAt,
          });
          knownOrgIds.add(proj.organizationId);
        }
      });

      setOrganizations(orgList);
      setOwnedOrgIds(ownedIds);
      ownedOrgIdsRef.current = ownedIds;

      if (orgList.length === 0) return;

      // 2. Pick the org to show
      const targetOrg = (isRestoring && savedOrgId)
        ? (orgList.find((o: Organization) => o.id === savedOrgId) ?? orgList[0])
        : (isRestoring ? orgList[0] : null);

      if (!targetOrg) {
        // Fresh login — show org list
        setActiveScreen('org');
        return;
      }

      setActiveOrg(targetOrg);

      // 3. Load workspaces for that org
      let workspaceList: Workspace[] = [];
      const projectsInOrg = myProjects.filter((p: any) => p.organizationId === targetOrg.id);

      if (ownedIds.has(targetOrg.id)) {
        try {
          const orgWorkspaces = await apiService.getOrgWorkspaces(targetOrg.id);
          workspaceList = orgWorkspaces ?? [];
        } catch { /* fall through to derive */ }
      }

      if (workspaceList.length === 0) {
        // Derive from project metadata
        const wsMap = new Map<string, Workspace>();
        projectsInOrg.forEach((proj: any) => {
          if (proj.workspaceId && !wsMap.has(proj.workspaceId)) {
            wsMap.set(proj.workspaceId, {
              id: proj.workspaceId,
              organizationId: targetOrg.id,
              name: proj.workspaceName || 'Workspace',
              slug: proj.workspaceId,
              createdAt: proj.createdAt,
              updatedAt: proj.updatedAt,
            });
          }
        });
        workspaceList = Array.from(wsMap.values());
      }

      setWorkspaces(workspaceList);

      if (workspaceList.length === 0) {
        setActiveScreen(isRestoring && savedScreen ? savedScreen : 'org');
        return;
      }

      // 4. Pick the workspace to show
      const targetWs = (isRestoring && savedWsId)
        ? (workspaceList.find((w: Workspace) => w.id === savedWsId) ?? workspaceList[0])
        : workspaceList[0];

      setActiveWorkspace(targetWs);

      // 5. Load projects for that workspace
      let projectList: Project[] = [];
      const projectsInWs = myProjects.filter((p: any) => p.workspaceId === targetWs.id);

      if (ownedIds.has(targetOrg.id)) {
        try {
          const wsProjects = await apiService.getWorkspaceProjects(targetWs.id);
          const wsIds = new Set((wsProjects ?? []).map((p: any) => p.id));
          const invitedHere = projectsInWs.filter((p: any) => !wsIds.has(p.id));
          projectList = [...(wsProjects ?? []), ...invitedHere];
        } catch { projectList = projectsInWs; }
      } else {
        projectList = projectsInWs;
      }

      setProjects(projectList);

      if (projectList.length === 0) {
        setActiveScreen(isRestoring && savedScreen ? savedScreen : 'workspace');
        return;
      }

      // 6. Pick the project to show
      const targetProj = (isRestoring && savedProjId)
        ? (projectList.find((p: Project) => p.id === savedProjId) ?? projectList[0])
        : projectList[0];

      setActiveProject(targetProj);

      // 7. Restore screen — use saved screen if restoring, otherwise 'org' for fresh load
      if (isRestoring && savedScreen) {
        setActiveScreen(savedScreen);
      } else {
        setActiveScreen('org');
      }

      // Persist whatever we resolved
      saveNav(
        isRestoring && savedScreen ? savedScreen : 'org',
        targetOrg.id,
        targetWs.id,
        targetProj?.id ?? ''
      );

    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status !== 401 && status !== 403) console.error('loadEverything error:', err);
    }
  };

  useEffect(() => {
    if (user) {
      reconnectSocketWithToken(); // Connect with token AFTER auth is confirmed
      loadEverything();
    } else {
      disconnectSocket();
      setOrganizations([]);
      setActiveOrg(null);
      setWorkspaces([]);
      setActiveWorkspace(null);
      setProjects([]);
      setActiveProject(null);
      setActiveScreen('org');
    }
  }, [user]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--sp-bg)", color: "var(--sp-text)" }}>
        <Loader2 className="w-10 h-10 animate-spin text-[#E8531A] mb-4" />
        <div className="flex items-baseline gap-0">
          <span className="text-xl font-bold text-[#E8EAF0]">Chargement&nbsp;</span>
          <span className="text-xl font-bold text-[#E8531A]">Studio</span>
          <span className="text-xl font-bold text-[#1A8C8C]">Pilot</span>
        </div>
              <span className="text-[11px]">Votre espace de travail</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <AuthPages />
      </>
    );
  }

  return (
    <div className="min-h-screen flex font-sans antialiased" style={{ backgroundColor: "var(--sp-bg)", color: "var(--sp-text)" }}>
      <Toaster position="top-right" />

      {/* Sidebar */}
      <Sidebar
        organizations={organizations}
        activeOrg={activeOrg}
        onSelectOrg={(org) => { setActiveOrgP(org); setActiveScreenP('org'); }}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={(ws) => { setActiveWorkspaceP(ws); setActiveScreenP('workspace'); }}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => { setActiveProjectP(p); setActiveScreenP('project'); }}
        onOpenCreateProject={() => setIsProjectModalOpen(true)}
        onOpenOrgSettings={() => setIsOrgModalOpen(true)}
        onOpenWorkspaceSettings={() => setIsWsModalOpen(true)}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onToggleMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        activeView={activeView}
        onChangeView={(v) => setActiveViewP(v)}
        activeScreen={activeScreen}
        onClickHome={() => {
          setActiveScreen('org');
          setActiveProject(null);
          setActiveWorkspace(null);
          setActiveOrg(null);
          localStorage.removeItem('sp_activeScreen');
          localStorage.removeItem('sp_activeOrgId');
          localStorage.removeItem('sp_activeWsId');
          localStorage.removeItem('sp_activeProjId');
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        <Navbar
          orgName={activeOrg?.name}
          workspaceName={activeWorkspace?.name}
          projectName={activeScreen === 'project' ? activeProject?.name : undefined}
          activeView={activeView}
          onChangeView={(v) => { setActiveViewP(v); setActiveScreenP('project'); }}
          onOpenCreateTask={() => {
            setInitialTaskStatus('todo');
            setIsTaskModalOpen(true);
          }}
          onOpenWorkflowModal={() => setIsWorkflowModalOpen(true)}
          onOpenCommandBar={() => setIsCommandBarOpen(true)}
          onToggleMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onClickOrg={() => setActiveScreenP('org')}
          onClickWorkspace={() => setActiveScreenP('workspace')}
          onClickHome={() => {
            setActiveScreen('org');
            setActiveProject(null);
            setActiveWorkspace(null);
            setActiveOrg(null);
            localStorage.removeItem('sp_activeScreen');
            localStorage.removeItem('sp_activeOrgId');
            localStorage.removeItem('sp_activeWsId');
            localStorage.removeItem('sp_activeProjId');
          }}
        />

        <main className={`flex-1 min-w-0 ${
          activeScreen === 'project' && activeView === 'kanban'
            ? 'flex flex-col overflow-hidden'
            : 'p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full'
        }`}>

          {/* ── Org overview screen ── */}
          {activeScreen === 'org' && !activeOrg && (
            <AllOrganizationsView
              onSelectOrganization={(org) => {
                setActiveOrgP(org);
                setActiveScreenP('org');
              }}
              onCreateOrganization={() => {
                setOrgModalDefaultTab('create');
                setIsOrgModalOpen(true);
              }}
              ownedOrgIds={ownedOrgIds}
              onDeleteOrganization={async (orgId) => {
                await apiService.deleteOrganization(orgId);
                // Remove from state
                setOrganizations(orgs => orgs.filter(o => o.id !== orgId));
                const updatedOwned = new Set(ownedOrgIds);
                updatedOwned.delete(orgId);
                setOwnedOrgIds(updatedOwned);
                ownedOrgIdsRef.current = updatedOwned;
                // If deleted org was active, clear it
                if (activeOrg?.id === orgId) {
                  setActiveOrgP(null);
                }
              }}
            />
          )}

          {/* ── Single Org View (with workspaces) ── */}
          {activeScreen === 'org' && activeOrg && (
            <div className="space-y-6">
              {/* Org Header with Management Buttons */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#1C2033] border border-[#DDE1E9] dark:border-[#2E3450] shadow-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-3xl font-black text-[#2C3147] dark:text-[#E8EAF0]">{activeOrg.name}</h2>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Organisation · {workspaces.length} espace{workspaces.length !== 1 ? 's' : ''} de travail
                      {!ownedOrgIds.has(activeOrg.id) && <span className="ml-2 text-xs bg-[#1A8C8C]/20 text-[#1A8C8C] px-2 py-0.5 rounded-full">Invité</span>}
                    </p>
                  </div>
                  
                  {/* Management Buttons - Only show if user owns this org */}
                  {ownedOrgIds.has(activeOrg.id) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setIsInviteOrgModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A8C8C]/10 hover:bg-[#1A8C8C]/20 text-[#1A8C8C] text-xs font-semibold transition cursor-pointer border border-[#1A8C8C]/20"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Inviter
                      </button>
                      <button
                        onClick={() => { setOrgModalDefaultTab('members'); setIsOrgModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-semibold transition cursor-pointer border border-violet-500/20"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Membres
                      </button>
                      <button
                        onClick={() => { setOrgModalDefaultTab('create'); setIsOrgModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EEF0F4] dark:bg-[#252A3D] hover:bg-[#DDE1E9] dark:hover:bg-[#2E3450] text-[#6B7280] dark:text-[#8890A8] hover:text-[#1C2033] dark:hover:text-[#E8EAF0] text-xs font-semibold transition cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Paramètres
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Workspaces Cards Grid */}
              <div>
                <h3 className="text-lg font-bold text-[#2C3147] dark:text-[#E8EAF0] mb-4">Espaces de travail</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => { setActiveWorkspaceP(ws); setActiveScreenP('workspace'); }}
                      className="group relative p-6 rounded-2xl bg-white dark:bg-[#1C2033] border-2 border-[#DDE1E9] dark:border-[#2E3450] hover:border-[#1A8C8C] dark:hover:border-[#1A8C8C] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer text-left overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1A8C8C]/5 to-[#E8531A]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative z-10 space-y-4">
                        <div className="w-14 h-14 rounded-xl bg-[#1A8C8C]/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <span className="text-[#1A8C8C] font-black text-xl">{ws.name[0]}</span>
                        </div>
                        
                        <div>
                          <p className="font-bold text-base text-[#1C2033] dark:text-[#E8EAF0] group-hover:text-[#1A8C8C] transition truncate">{ws.name}</p>
                          <p className="text-xs text-[#6B7280] mt-1">Espace de travail</p>
                        </div>

                        <div className="flex items-center justify-end pt-2">
                          <ArrowRight className="w-5 h-5 text-[#1A8C8C] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {/* Add New Workspace Card - Only show if user owns this org */}
                  {ownedOrgIds.has(activeOrg.id) && (
                    <button
                      onClick={() => setIsWsModalOpen(true)}
                      className="p-6 rounded-2xl border-2 border-dashed border-[#DDE1E9] dark:border-[#2E3450] hover:border-[#E8531A]/50 transition cursor-pointer group flex flex-col items-center justify-center gap-3 min-h-[180px]"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#EEF0F4] dark:bg-[#252A3D] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-[#E8531A] font-black text-2xl">+</span>
                      </div>
                      <p className="font-bold text-sm text-[#6B7280] group-hover:text-[#E8531A]">Nouvel espace</p>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Workspace overview screen ── */}
          {activeScreen === 'workspace' && activeWorkspace && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#1C2033] border border-[#DDE1E9] dark:border-[#2E3450] shadow-sm space-y-4">
                {editingWsId === activeWorkspace.id ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!editingWsName.trim()) return;
                    try {
                      const updated = await apiService.updateWorkspace(activeWorkspace.id, { name: editingWsName.trim() });
                      setWorkspaces((prev) => prev.map((w) => w.id === updated.id ? updated : w));
                      setActiveWorkspace(updated); toast.success('Espace renommé');
                    } catch { toast.error('Erreur'); }
                    setEditingWsId(null);
                  }} className="flex items-center gap-2">
                    <input autoFocus value={editingWsName} onChange={(e) => setEditingWsName(e.target.value)}
                      className="flex-1 rounded-xl bg-[#EEF0F4] dark:bg-[#252A3D] border border-[#1A8C8C]/50 text-[#1C2033] dark:text-[#E8EAF0] text-lg font-black px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/50" />
                    <button type="submit" className="p-2 rounded-lg bg-[#E8531A] text-white cursor-pointer hover:bg-[#F06535]"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setEditingWsId(null)} className="p-2 rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] text-[#6B7280] dark:text-[#8890A8] cursor-pointer hover:bg-[#DDE1E9] dark:hover:bg-[#2E3450]"><X className="w-4 h-4" /></button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-[#2C3147] dark:text-[#E8EAF0]">{activeWorkspace.name}</h2>
                      <p className="text-xs text-[#6B7280] mt-0.5">Espace de travail · {projects.length} projet{projects.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingWsId(activeWorkspace.id); setEditingWsName(activeWorkspace.name); setDeletingWsId(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF0F4] dark:bg-[#252A3D] hover:bg-[#DDE1E9] dark:hover:bg-[#2E3450] text-[#6B7280] dark:text-[#8890A8] hover:text-[#1C2033] dark:hover:text-[#E8EAF0] text-xs font-semibold transition cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" /> Renommer</button>
                      <button onClick={() => { setDeletingWsId(activeWorkspace.id); setWsDeleteConfirm(''); setEditingWsId(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition cursor-pointer border border-rose-500/20">
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
                    </div>
                  </div>
                )}
                {deletingWsId === activeWorkspace.id && editingWsId !== activeWorkspace.id && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-rose-300">Tapez <strong>{activeWorkspace.name}</strong> pour confirmer :</p>
                      <input value={wsDeleteConfirm} onChange={(e) => setWsDeleteConfirm(e.target.value)} placeholder={activeWorkspace.name}
                        className="w-full rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] border border-rose-500/40 text-[#1C2033] dark:text-[#E8EAF0] text-xs px-3 py-1.5 focus:outline-none" />
                      <div className="flex gap-2">
                        <button onClick={() => setDeletingWsId(null)} className="px-3 py-1.5 rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] text-[#6B7280] dark:text-[#8890A8] text-xs cursor-pointer">Annuler</button>
                        <button disabled={wsDeleteConfirm !== activeWorkspace.name} onClick={async () => {
                          try {
                            await apiService.deleteWorkspace(activeWorkspace.id);
                            const rem = workspaces.filter((w) => w.id !== activeWorkspace.id);
                            setWorkspaces(rem); setActiveWorkspace(rem[0] ?? null);
                            setProjects([]); setActiveProject(null);
                            setActiveScreenP('org'); toast.success('Espace supprimé');
                          } catch { toast.error('Erreur'); }
                          setDeletingWsId(null); setWsDeleteConfirm('');
                        }} className="px-3 py-1.5 rounded-lg bg-rose-600 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer">Supprimer</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#6B7280] mb-3">Projets</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p) => (
                    <div key={p.id} className="group relative p-5 rounded-2xl bg-white dark:bg-[#1C2033] border border-[#DDE1E9] dark:border-[#2E3450] hover:border-[#1A8C8C]/40 shadow-sm transition">
                      {editingProjId === p.id ? (
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          if (!editingProjName.trim()) return;
                          try {
                            const updated = await apiService.updateProject(p.id, { name: editingProjName.trim() });
                            setProjects((prev) => prev.map((pr) => pr.id === updated.id ? updated : pr));
                            if (activeProject?.id === updated.id) setActiveProject(updated);
                            toast.success('Projet renommé');
                          } catch { toast.error('Erreur'); }
                          setEditingProjId(null);
                        }} className="flex gap-2">
                          <input autoFocus value={editingProjName} onChange={(e) => setEditingProjName(e.target.value)}
                            className="flex-1 rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] border border-[#1A8C8C]/50 text-[#1C2033] dark:text-[#E8EAF0] text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1A8C8C]/50" />
                          <button type="submit" className="p-1.5 rounded-lg bg-[#E8531A] text-white cursor-pointer hover:bg-[#F06535]"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => setEditingProjId(null)} className="p-1.5 rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] text-[#6B7280] dark:text-[#8890A8] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </form>
                      ) : deletingProjId === p.id ? (
                        <div className="space-y-2">
                          <p className="text-xs text-rose-300">Tapez <strong>{p.name}</strong> :</p>
                          <input value={projDeleteConfirm} onChange={(e) => setProjDeleteConfirm(e.target.value)} placeholder={p.name}
                            className="w-full rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] border border-rose-500/40 text-[#1C2033] dark:text-[#E8EAF0] text-xs px-2 py-1.5 focus:outline-none" />
                          <div className="flex gap-2">
                            <button onClick={() => setDeletingProjId(null)} className="px-2 py-1 rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] text-[#6B7280] dark:text-[#8890A8] text-xs cursor-pointer">Annuler</button>
                            <button disabled={projDeleteConfirm !== p.name} onClick={async () => {
                              try {
                                await apiService.deleteProject(p.id);
                                const rem = projects.filter((pr) => pr.id !== p.id);
                                setProjects(rem);
                                if (activeProject?.id === p.id) setActiveProject(rem[0] ?? null);
                                toast.success('Projet supprimé');
                              } catch { toast.error('Erreur'); }
                              setDeletingProjId(null); setProjDeleteConfirm('');
                            }} className="px-2 py-1 rounded-lg bg-rose-600 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer">Supprimer</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setActiveProjectP(p); setActiveScreenP('project'); }} className="w-full text-left">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E8531A] to-[#1A8C8C] flex items-center justify-center mb-3">
                              <span className="text-white font-black text-base">{p.name[0]}</span>
                            </div>
                            <p className="font-bold text-sm text-[#1C2033] dark:text-[#E8EAF0] group-hover:text-[#E8531A] truncate">{p.name}</p>
                            {p.description && <p className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-2">{p.description}</p>}
                          </button>
                          <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
                            <button onClick={() => { setEditingProjId(p.id); setEditingProjName(p.name); setDeletingProjId(null); }}
                              className="p-1.5 rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] hover:bg-[#DDE1E9] dark:hover:bg-[#2E3450] text-[#6B7280] hover:text-[#1C2033] dark:hover:text-[#E8EAF0] cursor-pointer"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => { setDeletingProjId(p.id); setProjDeleteConfirm(''); setEditingProjId(null); }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setIsProjectModalOpen(true)}
                    className="p-5 rounded-2xl border-2 border-dashed border-[#DDE1E9] dark:border-[#2E3450] hover:border-[#E8531A]/50 transition cursor-pointer group flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EEF0F4] dark:bg-[#252A3D] flex items-center justify-center"><span className="text-[#E8531A] font-black text-xl">+</span></div>
                    <p className="font-bold text-sm text-[#6B7280] group-hover:text-[#E8531A]">Nouveau projet</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Project views ── */}
          {activeScreen === 'project' && (activeProject ? (
            <PermissionsProvider projectId={activeProject.id}>
              {/* Invite collaborator modal */}
              {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-[#1C2033] border border-[#DDE1E9] dark:border-[#2E3450] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[#2C3147] dark:text-[#E8EAF0] flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-[#E8531A]" />
                        Inviter dans "{activeProject.name}"
                      </h3>
                      <button onClick={() => setIsInviteModalOpen(false)} className="text-[#6B7280] hover:text-[#1C2033] dark:hover:text-[#E8EAF0] cursor-pointer"><X className="w-4 h-4" /></button>
                    </div>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!inviteEmail.trim()) return;
                      setIsSendingInvite(true);
                      try {
                        await apiService.inviteProjectMember(activeProject.id, { email: inviteEmail.trim(), role: inviteRole });
                        toast.success(`Invitation envoyée à ${inviteEmail}`);
                        setInviteEmail('');
                        setIsInviteModalOpen(false);
                      } catch (err: any) { toast.error(err.message || "Erreur lors de l'invitation"); }
                      setIsSendingInvite(false);
                    }} className="space-y-3">
                      <input type="email" placeholder="collaborateur@domaine.com" value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)} required autoFocus
                        className="w-full rounded-xl bg-[#EEF0F4] dark:bg-[#252A3D] border border-[#DDE1E9] dark:border-[#2E3450] text-[#1C2033] dark:text-[#E8EAF0] placeholder-[#6B7280] text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/50" />
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}
                        className="w-full rounded-xl bg-[#EEF0F4] dark:bg-[#252A3D] border border-[#DDE1E9] dark:border-[#2E3450] text-[#1C2033] dark:text-[#E8EAF0] text-sm font-medium py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/50 shadow-sm hover:shadow-md hover:border-[#1A8C8C]/30 transition-all duration-150 cursor-pointer">
                        {projectRoles.map(role => (
                          <option key={role.name} value={role.name}>
                            {role.name} {!role.isSystem && '(Custom)'}
                          </option>
                        ))}
                        {projectRoles.length === 0 && (
                          <>
                            <option value="MEMBER">Membre</option>
                            <option value="ADMIN">Admin</option>
                            <option value="GUEST">Invité</option>
                          </>
                        )}
                      </select>
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setIsInviteModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-[#EEF0F4] dark:bg-[#252A3D] text-[#6B7280] dark:text-[#8890A8] text-sm cursor-pointer hover:bg-[#DDE1E9] dark:hover:bg-[#2E3450]">Annuler</button>
                        <button type="submit" disabled={isSendingInvite}
                          className="px-4 py-2 rounded-xl bg-[#E8531A] hover:bg-[#F06535] text-white text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-2">
                          {isSendingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          Envoyer l'invitation
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Project action bar — Settings + Invite */}
              <div className={`flex items-center justify-end gap-2 shrink-0 ${activeView === 'kanban' ? 'px-4 pt-3 pb-1' : 'mb-4'}`}>
                <button
                  onClick={() => setIsProjectSettingsOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EEF0F4]/80 dark:bg-[#252A3D]/80 hover:bg-[#DDE1E9] dark:hover:bg-[#2E3450] border border-[#DDE1E9] dark:border-[#2E3450] hover:border-[#1A8C8C]/50 text-[#6B7280] dark:text-[#8890A8] hover:text-[#1C2033] dark:hover:text-[#E8EAF0] text-xs font-semibold transition cursor-pointer group"
                >
                  <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
                  Paramètres
                </button>
                <button
                  onClick={() => { setInviteEmail(''); setIsInviteModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8531A]/10 hover:bg-[#E8531A]/20 border border-[#E8531A]/30 hover:border-[#E8531A]/60 text-[#E8531A] text-xs font-semibold transition cursor-pointer group"
                >
                  <UserPlus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  Inviter
                </button>
              </div>
              {activeView === 'kanban' && (
                <KanbanBoard
                  key={viewRefreshKey}
                  projectId={activeProject.id}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                  onQuickCreateTask={(statusKey) => {
                    setInitialTaskStatus(statusKey);
                    setIsTaskModalOpen(true);
                  }}
                />
              )}
              {activeView === 'backlog' && (
                <BacklogView
                  key={viewRefreshKey}
                  projectId={activeProject.id}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                />
              )}
              {activeView === 'list' && (
                <ListView
                  key={viewRefreshKey}
                  projectId={activeProject.id}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                />
              )}
              {activeView === 'calendar' && (
                <CalendarView
                  key={viewRefreshKey}
                  projectId={activeProject.id}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                />
              )}
              {activeView === 'workflow' && (
                <WorkflowEditor projectId={activeProject.id} />
              )}
              {activeView === 'dashboard' && (
                <DashboardView projectId={activeProject.id} />
              )}
              {activeView === 'stats' && (
                <ProjectStatsView 
                  projectId={activeProject.id} 
                  projectName={activeProject.name}
                />
              )}
              {activeView === 'channels' && activeWorkspace && (
                <ChannelsView workspaceId={activeWorkspace.id} />
              )}
            </PermissionsProvider>
          ) : (
            // Show loading spinner while restoring navigation state from session
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ))}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <OrgSettingsModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        activeOrg={activeOrg}
        defaultTab={orgModalDefaultTab}
        onOrgCreated={(newOrg) => {
          setOrganizations([...organizations, newOrg]);
          // Add to owned orgs since the current user just created it
          const updatedOwned = new Set(ownedOrgIds);
          updatedOwned.add(newOrg.id);
          setOwnedOrgIds(updatedOwned);
          ownedOrgIdsRef.current = updatedOwned;
          setActiveOrgP(newOrg);
          setActiveScreenP('org');
        }}
      />

      {/* Invite Organization Member Modal */}
      {activeOrg && (
        <InviteOrgMemberModal
          isOpen={isInviteOrgModalOpen}
          onClose={() => setIsInviteOrgModalOpen(false)}
          organizationId={activeOrg.id}
          organizationName={activeOrg.name}
        />
      )}

      <WorkspaceSettingsModal
        isOpen={isWsModalOpen}
        onClose={() => setIsWsModalOpen(false)}
        currentOrg={activeOrg}
        currentWorkspace={activeWorkspace}
        onWorkspaceCreated={(newWs) => {
          setWorkspaces([...workspaces, newWs]);
          setActiveWorkspaceP(newWs);
          setActiveScreenP('workspace');
        }}
      />

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentWorkspace={activeWorkspace}
        onProjectCreated={(newProj) => {
          setProjects([...projects, newProj]);
          setActiveProjectP(newProj);
          setActiveScreenP('project');
        }}
      />

      {activeProject && (
        <CreateTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          projectId={activeProject.id}
          orgId={activeOrg?.id}
          initialStatus={initialTaskStatus}
          onTaskCreated={() => {
            triggerViewRefresh();
          }}
        />
      )}

      {/* Workflow (Add Status) Modal */}
      {activeProject && (
        <Modal
          isOpen={isWorkflowModalOpen}
          onClose={() => {
            setIsWorkflowModalOpen(false);
            setNewStatusName('');
            setNewStatusCategory('TODO');
            setNewStatusColor('#1A8C8C');
          }}
          title="Ajouter un statut au workflow"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newStatusName.trim()) return;
              try {
                await apiService.createStatus(activeProject.id, {
                  name: newStatusName.trim(),
                  category: newStatusCategory,
                  color: newStatusColor,
                });
                toast.success('Statut créé');
                setNewStatusName('');
                setNewStatusCategory('TODO');
                setNewStatusColor('#1A8C8C');
                setIsWorkflowModalOpen(false);
                // Refresh kanban board
                triggerViewRefresh();
              } catch (err: any) {
                toast.error(err?.message || 'Erreur lors de la création');
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nom du statut"
                  placeholder="Ex: En Cours, Terminé"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  icon={<Tag className="w-4 h-4 text-[#1A8C8C]" />}
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#2C3147] dark:text-[#E8EAF0] mb-2">
                  Catégorie
                </label>
                <select
                  value={newStatusCategory}
                  onChange={(e) => setNewStatusCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE1E9] dark:border-[#2E3450] bg-white dark:bg-[#1C2033] text-[#2C3147] dark:text-[#E8EAF0] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/40 shadow-sm hover:shadow-md hover:border-[#1A8C8C]/30 transition-all duration-150 cursor-pointer"
                >
                  <option value="TODO">À faire</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="DONE">Terminé</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#2C3147] dark:text-[#E8EAF0] mb-2">
                  Couleur
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newStatusColor}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                    className="w-12 h-10 rounded-xl border border-[#DDE1E9] dark:border-[#2E3450] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newStatusColor}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#DDE1E9] dark:border-[#2E3450] bg-white dark:bg-[#1C2033] text-[#2C3147] dark:text-[#E8EAF0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/40"
                    placeholder="#1A8C8C"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsWorkflowModalOpen(false);
                  setNewStatusName('');
                  setNewStatusCategory('TODO');
                  setNewStatusColor('#1A8C8C');
                }}
                type="button"
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon={<Plus className="w-4 h-4" />}
              >
                Ajouter
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <PermissionsProvider projectId={activeProject?.id || null}>
        <TaskDetailDrawer
          taskId={selectedTaskId}
          orgId={activeOrg?.id}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => {
            triggerViewRefresh();
          }}
        />
      </PermissionsProvider>

      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        activeProjectId={activeProject?.id}
        onSelectTask={(task) => setSelectedTaskId(task.id)}
      />

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {activeProject && (
        <ProjectSettingsModal
          isOpen={isProjectSettingsOpen}
          onClose={() => setIsProjectSettingsOpen(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
          projectDescription={activeProject.description}
          onProjectUpdated={(name, description) => {
            const updated = { ...activeProject, name, description };
            setProjects((prev) => prev.map((p) => p.id === activeProject.id ? updated : p));
            setActiveProject(updated);
          }}
          onProjectDeleted={() => {
            const remaining = projects.filter((p) => p.id !== activeProject.id);
            setProjects(remaining);
            setActiveProject(remaining[0] ?? null);
            setActiveScreenP('workspace');
          }}
        />
      )}

      {/* <CookieBanner /> */}
      {/* Cookie banner disabled - was blocked by ad blockers causing white screen */}
    </div>
  );
}




