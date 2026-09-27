/**
 * AppStateContext — React Native port of the web `App.tsx` selection state machine.
 *
 * Mirrors the web exactly:
 *  - Organizations → Workspaces → Projects hierarchy loading (`loadEverything`)
 *  - Owned vs invited orgs
 *  - Session persistence via the same storage keys (sp_active*)
 *  - Socket lifecycle tied to auth state
 *  - viewRefreshKey broadcast to reload visible data after mutations
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { reconnectSocketWithToken, disconnectSocket } from '../hooks/useSocket';
import { store, K } from '../lib/storage';
import { Organization, Workspace, Project } from '../types';

export type ScreenKind = 'project' | 'org' | 'workspace';

interface AppStateValue {
  organizations: Organization[];
  activeOrg: Organization | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  projects: Project[];
  activeProject: Project | null;
  ownedOrgIds: Set<string>;
  activeView: string;
  activeScreen: ScreenKind;
  viewRefreshKey: number;
  bootstrapDone: boolean;

  setActiveScreen: (s: ScreenKind) => void;
  setActiveView: (v: string) => void;
  selectOrg: (o: Organization | null) => void;
  selectWorkspace: (w: Workspace | null) => void;
  selectProject: (p: Project | null) => void;
  goHome: () => void;
  triggerViewRefresh: () => void;
  loadEverything: () => Promise<void>;

  // state mutators used by CRUD flows (same as web setState usage)
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setOwnedOrgIds: (updater: (prev: Set<string>) => Set<string>) => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const [ownedOrgIds, setOwnedOrgIdsState] = useState<Set<string>>(new Set());
  const ownedOrgIdsRef = useRef<Set<string>>(new Set());

  const [activeView, setActiveViewState] = useState<string>('kanban');
  const [activeScreen, setActiveScreenState] = useState<ScreenKind>('org');
  const [bootstrapDone, setBootstrapDone] = useState(false);

  const [viewRefreshKey, setViewRefreshKey] = useState(0);
  const triggerViewRefresh = useCallback(() => setViewRefreshKey((k) => k + 1), []);

  // ── Persist helpers ──────────────────────────────────────────────────────
  const saveNav = (screen: string, orgId: string, wsId: string, projId: string, view?: string) => {
    store.set(K.activeScreen, screen);
    store.set(K.activeOrgId, orgId);
    store.set(K.activeWsId, wsId);
    store.set(K.activeProjId, projId);
    if (view !== undefined) store.set(K.activeView, view);
  };

  const setActiveScreen = useCallback((s: ScreenKind) => {
    setActiveScreenState(s);
    store.set(K.activeScreen, s);
  }, []);

  const setActiveView = useCallback((v: string) => {
    setActiveViewState(v);
    store.set(K.activeView, v);
  }, []);

  const setOwnedOrgIds = useCallback((updater: (prev: Set<string>) => Set<string>) => {
    setOwnedOrgIdsState((prev) => {
      const next = updater(new Set(prev));
      ownedOrgIdsRef.current = next;
      return next;
    });
  }, []);

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
            } as any);
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
        } catch { projectList = projectsInWs as any; }
      } else {
        projectList = projectsInWs as any;
      }

      setProjects(projectList);
      if (projectList.length > 0) setActiveProject(projectList[0]);
    } catch (err) { console.error('loadProjectsForWorkspace error:', err); }
  };

  const selectOrg = useCallback((o: Organization | null) => {
    setActiveOrg(o);
    setActiveWorkspace(null);
    setActiveProject(null);
    setWorkspaces([]);
    setProjects([]);
    saveNav('org', o?.id ?? '', '', '');
    setActiveScreenState('org');
    store.set(K.activeScreen, 'org');
    if (o) loadWorkspacesForOrg(o);
  }, []);

  const selectWorkspace = useCallback((w: Workspace | null) => {
    setActiveWorkspace(w);
    setActiveProject(null);
    setProjects([]);
    setActiveScreenState('workspace');
    saveNav('workspace', activeOrg?.id ?? '', w?.id ?? '', '');
    if (w) loadProjectsForWorkspace(w, activeOrg?.id ?? '');
  }, [activeOrg]);

  const selectProject = useCallback((p: Project | null) => {
    setActiveProject(p);
    setActiveScreenState('project');
    saveNav('project', activeOrg?.id ?? '', activeWorkspace?.id ?? '', p?.id ?? '');
  }, [activeOrg, activeWorkspace]);

  const goHome = useCallback(() => {
    setActiveScreenState('org');
    setActiveProject(null);
    setActiveWorkspace(null);
    setActiveOrg(null);
    store.removeMany([K.activeScreen, K.activeOrgId, K.activeWsId, K.activeProjId]);
  }, []);

  // ── Single bootstrap — loads everything in one shot (same flow as web) ────
  const loadEverything = useCallback(async () => {
    try {
      // Read saved state from storage ONCE at the start
      const saved = await store.getMany([K.activeOrgId, K.activeWsId, K.activeProjId, K.activeScreen, K.activeView]);
      const savedOrgId = saved[K.activeOrgId];
      const savedWsId = saved[K.activeWsId];
      const savedProjId = saved[K.activeProjId];
      const savedScreen = saved[K.activeScreen] as ScreenKind | null;
      if (saved[K.activeView]) setActiveViewState(saved[K.activeView]!);
      const isRestoring = !!(savedOrgId || savedWsId || savedProjId);

      // 1. Load orgs + all my projects in parallel
      const [ownedOrgsResult, myProjectsResult] = await Promise.allSettled([
        apiService.getOrganizations(),
        apiService.getMyProjects(),
      ]);

      const orgList: Organization[] = ownedOrgsResult.status === 'fulfilled' ? (ownedOrgsResult.value as any) ?? [] : [];
      const myProjects: any[] = myProjectsResult.status === 'fulfilled' ? (myProjectsResult.value as any) ?? [] : [];

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
      setOwnedOrgIdsState(ownedIds);
      ownedOrgIdsRef.current = ownedIds;

      if (orgList.length === 0) { setBootstrapDone(true); return; }

      // 2. Pick the org to show
      const targetOrg = (isRestoring && savedOrgId)
        ? (orgList.find((o: Organization) => o.id === savedOrgId) ?? orgList[0])
        : (isRestoring ? orgList[0] : null);

      if (!targetOrg) {
        // Fresh login — show org list
        setActiveScreenState('org');
        setBootstrapDone(true);
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
        } catch { /* fall through */ }
      }

      if (workspaceList.length === 0) {
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
            } as any);
          }
        });
        workspaceList = Array.from(wsMap.values());
      }

      setWorkspaces(workspaceList);

      if (workspaceList.length === 0) {
        setActiveScreenState(isRestoring && savedScreen ? savedScreen : 'org');
        setBootstrapDone(true);
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
        } catch { projectList = projectsInWs as any; }
      } else {
        projectList = projectsInWs as any;
      }

      setProjects(projectList);

      if (projectList.length === 0) {
        setActiveScreenState(isRestoring && savedScreen ? savedScreen : 'workspace');
        setBootstrapDone(true);
        return;
      }

      // 6. Pick the project to show
      const targetProj = (isRestoring && savedProjId)
        ? (projectList.find((p: Project) => p.id === savedProjId) ?? projectList[0])
        : projectList[0];

      setActiveProject(targetProj);

      // 7. Restore screen
      if (isRestoring && savedScreen) {
        setActiveScreenState(savedScreen);
      } else {
        setActiveScreenState('org');
      }

      // Persist whatever we resolved
      saveNav(
        isRestoring && savedScreen ? savedScreen : 'org',
        targetOrg.id,
        targetWs.id,
        targetProj?.id ?? ''
      );
      setBootstrapDone(true);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status !== 401 && status !== 403) console.error('loadEverything error:', err);
      setBootstrapDone(true);
    }
  }, []);

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
      setActiveScreenState('org');
      setBootstrapDone(false);
    }
  }, [user]);

  const value: AppStateValue = {
    organizations,
    activeOrg,
    workspaces,
    activeWorkspace,
    projects,
    activeProject,
    ownedOrgIds,
    activeView,
    activeScreen,
    viewRefreshKey,
    bootstrapDone,
    setActiveScreen,
    setActiveView,
    selectOrg,
    selectWorkspace,
    selectProject,
    goHome,
    triggerViewRefresh,
    loadEverything,
    setOrganizations,
    setWorkspaces,
    setProjects,
    setOwnedOrgIds,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
};
