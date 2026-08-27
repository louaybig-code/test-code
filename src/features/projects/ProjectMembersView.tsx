import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Loader2 } from 'lucide-react';
import { ProjectMember, ProjectRole, UserProfile } from '../../types';
import { Avatar } from '../../components/Avatar';
import { apiService } from '../../services/api';

// ─── Static demo data (replace with API calls when endpoints are ready) ───────
const DEMO_ROLES: ProjectRole[] = [
  { id: 'role-owner', projectId: '', name: 'Owner', isSystem: true, permissions: ['task.view','task.create','task.edit','task.delete','task.move','task.assign','task.archive','comment.view','comment.create','comment.edit','comment.delete','epic.manage','sprint.manage','workflow.view','workflow.manage','member.view','member.invite','member.remove','member.manage_roles','project.settings','project.delete'] },
  { id: 'role-admin', projectId: '', name: 'Admin', isSystem: true, permissions: ['task.view','task.create','task.edit','task.delete','task.move','task.assign','task.archive','comment.view','comment.create','comment.edit','comment.delete','epic.manage','sprint.manage','workflow.view','workflow.manage','member.view','member.invite','member.remove','project.settings'] },
  { id: 'role-member', projectId: '', name: 'Membre', isSystem: true, permissions: ['task.view','task.create','task.edit','task.move','task.assign','comment.view','comment.create','comment.edit','epic.manage','sprint.manage','workflow.view','member.view'] },
  { id: 'role-guest', projectId: '', name: 'Invité', isSystem: true, permissions: ['task.view','comment.view','workflow.view','member.view'] },
];

export const DEMO_MEMBERS: ProjectMember[] = [
  { id: 'pm-1', projectId: '', userId: 'u1', role: 'OWNER', isOnline: true, joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(), user: { id: 'u1', email: 'louay@studiolab.fr', firstName: 'Jane', lastName: 'Doe' } },
  { id: 'pm-2', projectId: '', userId: 'u2', role: 'ADMIN', isOnline: true, lastSeenAt: new Date().toISOString(), joinedAt: new Date(Date.now() - 20 * 86400000).toISOString(), user: { id: 'u2', email: 'alex@smash.app', firstName: 'Alexandre', lastName: 'Dev' } },
  { id: 'pm-3', projectId: '', userId: 'u3', role: 'MEMBER', isOnline: false, lastSeenAt: new Date(Date.now() - 2 * 3600000).toISOString(), joinedAt: new Date(Date.now() - 10 * 86400000).toISOString(), user: { id: 'u3', email: 'sara@design.io', firstName: 'Sara', lastName: 'UI' } },
  { id: 'pm-4', projectId: '', userId: 'u4', role: 'GUEST', isOnline: false, lastSeenAt: new Date(Date.now() - 3 * 86400000).toISOString(), joinedAt: new Date(Date.now() - 5 * 86400000).toISOString(), user: { id: 'u4', email: 'client@corp.com', firstName: 'Client', lastName: 'Externe' } },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const roleColor = (roleName: string | null | undefined) => {
  switch ((roleName || '').toLowerCase()) {
    case 'owner':  return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'admin':  return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    case 'guest':  return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    case 'client': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    default:       return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  }
};

// ─── Component ────────────────────────────────────────────────────────────────
interface ProjectMembersViewProps {
  projectId: string;
  projectName: string;
  currentUserId?: string;
  currentUserEmail?: string; // Add email as alternative identifier
  members?: ProjectMember[];
  roles?: ProjectRole[];
  onInvite?: () => void;
  onRemove?: (memberId: string) => void;
  onChangeRole?: (memberId: string, roleId: string) => void;
}

export const ProjectMembersView: React.FC<ProjectMembersViewProps> = ({
  projectId,
  projectName,
  currentUserId,
  currentUserEmail,
  members: propMembers,
  roles = DEMO_ROLES,
  onInvite,
  onRemove,
  onChangeRole,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<ProjectMember[]>(propMembers || []);
  const [loading, setLoading] = useState(!propMembers); // start loading if no prop members
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>(roles);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Load members from API on mount
  useEffect(() => {
    if (propMembers) {
      setMembers(propMembers);
      return;
    }

    const loadMembers = async () => {
      setLoading(true);
      try {
        const apiMembers = await apiService.getProjectMembers(projectId);
        setMembers(apiMembers as ProjectMember[]);
      } catch (error) {
        console.error('Failed to load members:', error);
        setMembers([]); // empty on error, no fake data
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [projectId, propMembers]);

  // Load project roles from API
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const perms = await apiService.getProjectPermissions(projectId);
        
        if (perms && perms.roles && perms.roles.length > 0) {
          const systemRoleNames = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST', 'CLIENT'];
          
          const apiRoles: ProjectRole[] = perms.roles.map((role: any) => ({
            id: role.id || role.name,
            projectId,
            name: role.name || role.id,
            isSystem: systemRoleNames.includes(role.name || role.id),
            permissions: role.abilities || [],
          }));
          
          setProjectRoles(apiRoles);
        }
      } catch (error) {
        console.error('Failed to load project roles:', error);
        // Keep default roles as fallback
      }
    };
    
    loadRoles();
  }, [projectId]);

  // Derive current user's role in this project
  // Backend returns member.user.email but not member.userId, so we check email
  const currentMember = members.find((m) => 
    m.userId === currentUserId || 
    m.user?.id === currentUserId || 
    m.user?.email === currentUserEmail
  );
  const currentRole = currentMember?.role?.toLowerCase() ?? '';
  
  // WORKAROUND: If user can open project settings but isn't in members list,
  // assume they're owner/admin (backend doesn't return project owner in members)
  const canManageRoles = currentRole === 'owner' || currentRole === 'admin' || !currentMember;
  const canInvite = canManageRoles;
  const canRemove = canManageRoles;

  const filtered = (list: ProjectMember[]) =>
    list.filter((m) => {
      const q = search.toLowerCase();
      const displayRole = m.customRole?.name || m.role || '';
      return (
        !q ||
        m.user?.firstName?.toLowerCase().includes(q) ||
        m.user?.lastName?.toLowerCase().includes(q) ||
        m.user?.email?.toLowerCase().includes(q) ||
        displayRole.toLowerCase().includes(q)
      );
    });

  // Helper to get the display role name (custom role takes precedence over system role)
  const getDisplayRole = (member: ProjectMember): string => {
    return member.customRole?.name || member.role || 'MEMBER';
  };

  const MemberRow: React.FC<{ member: ProjectMember }> = ({ member }) => {
    const isConfirming = confirmRemoveId === member.id;
    const userId = member.user?.id || member.userId;
    const displayRole = getDisplayRole(member);

    return (
    <div className={`flex flex-col gap-2 p-3.5 rounded-2xl border transition ${
      isConfirming
        ? 'border-rose-500/40 bg-rose-500/5'
        : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar
            src={member.user?.avatarUrl}
            firstName={member.user?.firstName}
            lastName={member.user?.lastName}
            email={member.user?.email}
            size="md"
          />
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {member.user?.firstName} {member.user?.lastName}
          </p>
          <p className="text-xs text-slate-500 truncate">{member.user?.email}</p>
        </div>

        {/* Role badge */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          {canManageRoles && displayRole.toUpperCase() !== 'OWNER' ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `role-${member.id}` ? null : `role-${member.id}`); }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${roleColor(displayRole)}`}
              >
                {displayRole}
              </button>

              {openMenuId === `role-${member.id}` && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 max-h-96 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl">
                    {projectRoles.filter(r => (r.name || '').toLowerCase() !== 'owner').map((role) => (
                      <button
                        key={role.id}
                        onClick={() => { 
                          // Use userId with fallback to user.id
                          const userId = member.userId || member.user?.id;
                          if (userId) {
                            onChangeRole?.(userId, role.name.toUpperCase()); 
                          }
                          setOpenMenuId(null); 
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                          role.name.toUpperCase() === displayRole.toUpperCase()
                            ? 'text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-500/10'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="flex-1 text-left">{role.name}</span>
                        {role.name.toUpperCase() === displayRole.toUpperCase() && <span className="text-violet-600 dark:text-violet-400 text-lg">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleColor(displayRole)}`}>
              {displayRole}
            </span>
          )}
        </div>

        {/* Remove button — always visible for owner/admin */}
        {canRemove && displayRole !== 'OWNER' && !isConfirming && (
          <button
            onClick={() => setConfirmRemoveId(member.id)}
            className="p-1.5 rounded-lg text-[var(--sp-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
            title="Retirer du projet"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Inline confirm */}
      {isConfirming && (
        <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 gap-3">
          <p className="text-xs text-rose-400 font-semibold">
            Retirer <span className="font-bold">{member.user?.firstName} {member.user?.lastName}</span> du projet ?
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setConfirmRemoveId(null); onRemove?.(userId); }}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              Oui
            </button>
            <button
              onClick={() => setConfirmRemoveId(null)}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Non
            </button>
          </div>
        </div>
      )}
    </div>
  );
  };

  return (
    <div className="space-y-6" onClick={() => setOpenMenuId(null)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Membres du projet</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {members.length} membre{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-44"
          />
          {canInvite && (
            <button
              onClick={(e) => { e.stopPropagation(); onInvite?.(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Inviter
            </button>
          )}
        </div>
      </div>

      {/* All members */}
      {/* Member list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : (
          <>
            {filtered(members).map((m) => <MemberRow key={m.id} member={m} />)}
            {filtered(members).length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">Aucun membre trouvé.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
