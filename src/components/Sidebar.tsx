import React, { useState } from 'react';
import {
  Folder,
  Plus,
  MessageSquare,
  LogOut,
  ChevronDown,
  Building,
  LayoutGrid,
  X,
  Home,
} from 'lucide-react';
import { Organization, Workspace, Project } from '../types';
import { Avatar } from './Avatar';
import { useAuth } from '../context/AuthContext';
import logoWhite from '/studiopilot-white.png';
import logoDark from '/studiopilot-dark.png';

interface SidebarProps {
  organizations: Organization[];
  activeOrg: Organization | null;
  onSelectOrg: (org: Organization) => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (proj: Project) => void;
  onOpenCreateProject: () => void;
  onOpenOrgSettings: () => void;
  onOpenWorkspaceSettings: () => void;
  onOpenProfileSettings: () => void;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
  activeView: string;
  onChangeView: (view: string) => void;
  onClickHome?: () => void;
  activeScreen?: 'project' | 'org' | 'workspace';
}

/** Real logo image — white.png for dark mode, dark.png for light mode */
const Logo: React.FC = () => (
  <>
    {/* Light mode */}
    <img
      src={logoDark}
      alt="StudioPilote"
      className="h-10 w-auto object-contain block dark:hidden"
      draggable={false}
    />
    {/* Dark mode */}
    <img
      src={logoWhite}
      alt="StudioPilote"
      className="h-10 w-auto object-contain hidden dark:block"
      draggable={false}
    />
  </>
);

export const Sidebar: React.FC<SidebarProps> = ({
  organizations,
  activeOrg,
  onSelectOrg,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  projects,
  activeProject,
  onSelectProject,
  onOpenCreateProject,
  onOpenOrgSettings,
  onOpenWorkspaceSettings,
  onOpenProfileSettings,
  isOpenMobile,
  onToggleMobile,
  activeView,
  onChangeView,
  onClickHome,
  activeScreen,
}) => {
  const { user, logout } = useAuth();
  const [showOrganizations, setShowOrganizations] = useState(true);
  const [showWorkspaces, setShowWorkspaces] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  // When on org screen, hide the navigation lists since AllOrganizationsView handles it
  const shouldShowNavLists = activeScreen === 'project' || activeScreen === 'workspace';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#131620]/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={onToggleMobile}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60
          bg-white dark:bg-[#1A1D2E] border-r border-[#D8DDED] dark:border-[#323751]
          shadow-xl backdrop-blur-2xl flex flex-col justify-between
          transition-transform duration-300 lg:translate-x-0
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 space-y-5 overflow-y-auto flex-1">

          {/* ── Logo & Close ── */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE1E9] dark:border-[#2E3450]">
            {/* Show correct logo for light/dark mode */}
            <Logo />

            <button
              onClick={onToggleMobile}
              className="lg:hidden p-1.5 text-[#6B7280] hover:text-[#2C3147] dark:hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Home Button ── */}
          {onClickHome && (
            <button
              onClick={onClickHome}
              className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-[#E8531A]/10 to-[#1A8C8C]/10 hover:from-[#E8531A]/20 hover:to-[#1A8C8C]/20 border border-[#E8531A]/20 text-[#2C3147] dark:text-[#E8EAF0] font-bold text-sm transition cursor-pointer group"
            >
              <Home className="w-5 h-5 text-[#E8531A] group-hover:scale-110 transition-transform" />
              <span>Accueil</span>
            </button>
          )}

          {/* Only show navigation lists when in a project or workspace view */}
          {shouldShowNavLists && (
            <>
              {/* ── Organisations List ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowOrganizations(!showOrganizations)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#1A8C8C] transition cursor-pointer"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOrganizations ? '' : '-rotate-90'}`} />
                <Building className="w-3.5 h-3.5" />
                Organisations ({organizations.length})
              </button>
              <button
                onClick={onOpenOrgSettings}
                className="p-1 rounded-lg text-[#E8531A] hover:bg-[#E8531A]/10 transition cursor-pointer"
                title="Create organization"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showOrganizations && (
              <div className="space-y-1 pl-1">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => onSelectOrg(org)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                      activeOrg?.id === org.id
                        ? 'bg-[#1A8C8C]/15 text-[#1A8C8C] border border-[#1A8C8C]/30'
                        : 'text-[#1C2033] dark:text-[#8890A8] hover:bg-[#EEF0F4] dark:hover:bg-[#252A3D]'
                    }`}
                  >
                    <Building className="w-4 h-4 shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Workspaces List (only show if org selected) ── */}
          {activeOrg && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowWorkspaces(!showWorkspaces)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#E8531A] transition cursor-pointer"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWorkspaces ? '' : '-rotate-90'}`} />
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Workspaces ({workspaces.length})
                </button>
                <button
                  onClick={onOpenWorkspaceSettings}
                  className="p-1 rounded-lg text-[#E8531A] hover:bg-[#E8531A]/10 transition cursor-pointer"
                  title="Create workspace"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showWorkspaces && (
                <div className="space-y-1 pl-1">
                  {workspaces.length === 0 ? (
                    <p className="text-xs text-[#6B7280] italic py-2 pl-2">
                      No workspaces yet.
                    </p>
                  ) : (
                    workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => onSelectWorkspace(ws)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                          activeWorkspace?.id === ws.id
                            ? 'bg-[#E8531A]/15 text-[#E8531A] border border-[#E8531A]/30'
                            : 'text-[#1C2033] dark:text-[#8890A8] hover:bg-[#EEF0F4] dark:hover:bg-[#252A3D]'
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4 shrink-0" />
                        <span className="truncate">{ws.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Projects List (only show if workspace selected) ── */}
          {activeWorkspace && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowProjects(!showProjects)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#2C3147] dark:hover:text-[#E8EAF0] transition cursor-pointer"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showProjects ? '' : '-rotate-90'}`} />
                  <Folder className="w-3.5 h-3.5" />
                  Projects ({projects.length})
                </button>
                <button
                  onClick={onOpenCreateProject}
                  className="p-1 rounded-lg text-[#E8531A] hover:bg-[#E8531A]/10 transition cursor-pointer"
                  title="Create project"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showProjects && (
                <div className="space-y-1 pl-1">
                  {projects.length === 0 ? (
                    <p className="text-xs text-[#6B7280] italic py-2 pl-2">
                      No projects in this workspace yet.
                    </p>
                  ) : (
                    projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSelectProject(p)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                          activeProject?.id === p.id
                            ? 'bg-[#2C3147] dark:bg-[#E8531A]/20 text-white dark:text-[#E8531A] border border-[#E8531A]/40 shadow-sm'
                            : 'text-[#1C2033] dark:text-[#8890A8] hover:text-[#2C3147] dark:hover:text-[#E8EAF0] hover:bg-[#EEF0F4] dark:hover:bg-[#252A3D]'
                        }`}
                      >
                        <Folder className={`w-4 h-4 shrink-0 ${activeProject?.id === p.id ? 'text-[#E8531A]' : 'text-[#1A8C8C]'}`} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Team Channels ── */}
          {shouldShowNavLists && (
            <div className="pt-4 border-t border-[#DDE1E9] dark:border-[#2E3450] space-y-1">
              <button
                onClick={() => onChangeView('channels')}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                  activeView === 'channels'
                    ? 'bg-[#1A8C8C] text-white shadow-md'
                    : 'text-[#1C2033] dark:text-[#8890A8] hover:text-[#2C3147] dark:hover:text-[#E8EAF0] hover:bg-[#EEF0F4] dark:hover:bg-[#252A3D]'
                }`}
              >
                <MessageSquare className={`w-4 h-4 ${activeView === 'channels' ? 'text-white' : 'text-[#1A8C8C]'}`} />
                <span>Team Channels</span>
              </button>
            </div>
          )}
            </>
          )}
        </div>

        {/* ── User Profile Footer ── */}
        <div className="p-4 border-t border-[#DDE1E9] dark:border-[#2E3450]
          bg-[#EEF0F4]/60 dark:bg-[#252A3D]/60
          backdrop-blur-md flex items-center justify-between">
          <button
            onClick={onOpenProfileSettings}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <Avatar
              src={user?.avatarUrl}
              firstName={user?.firstName}
              lastName={user?.lastName}
              email={user?.email}
              size="sm"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-[#1C2033] dark:text-[#E8EAF0] group-hover:text-[#E8531A] truncate">
                {user?.firstName || user?.lastName
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                  : user?.email || 'Profile'}
              </p>
              <span className="text-[10px] text-[#6B7280] block truncate">
                {user?.email}
              </span>
            </div>
          </button>

          <button
            onClick={logout}
            className="p-2 text-[#6B7280] hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

