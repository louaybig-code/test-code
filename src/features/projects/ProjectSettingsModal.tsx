import React, { useState, useEffect } from 'react';
import { X, Users, Shield, Settings, Plus, Trash2, Check, Crown, Eye, User, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { ProjectMember, ProjectRole, PermissionKey, ProjectPermission } from '../../types';
import { ProjectMembersView, DEMO_MEMBERS } from './ProjectMembersView';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ─── All permissions catalogue (using colon notation from API) ────────────────
export const ALL_PERMISSIONS: ProjectPermission[] = [
  // Tâches
  { key: 'task:create',  label: 'Créer des tâches',      description: 'Ajouter de nouvelles tâches',               group: 'Tâches' },
  { key: 'task:update',  label: 'Modifier des tâches',   description: 'Éditer titre, description, priorité…',      group: 'Tâches' },
  { key: 'task:delete',  label: 'Supprimer des tâches',  description: 'Supprimer définitivement une tâche',        group: 'Tâches' },
  { key: 'task:move',    label: 'Déplacer des tâches',   description: 'Changer le statut / colonne Kanban',        group: 'Tâches' },
  // Commentaires
  { key: 'comment:create', label: 'Écrire des commentaires',    description: 'Poster un commentaire',              group: 'Commentaires' },
  // Sprints
  { key: 'sprint:manage', label: 'Gérer les sprints', description: 'Créer, démarrer, clôturer des sprints',       group: 'Sprints' },
  // Workflow
  { key: 'workflow:manage', label: 'Gérer le workflow',  description: 'Ajouter / modifier / supprimer des statuts', group: 'Workflow' },
];

const PERMISSION_GROUPS = ['Tâches', 'Commentaires', 'Sprints', 'Workflow'] as const;

// ─── Default roles ────────────────────────────────────────────────────────────
const DEFAULT_ROLES: ProjectRole[] = [
  { id: 'role-owner',  projectId: '', name: 'Owner',  isSystem: true,  permissions: ALL_PERMISSIONS.map(p => p.key) },
  { id: 'role-admin',  projectId: '', name: 'Admin',  isSystem: true,  permissions: ALL_PERMISSIONS.map(p => p.key).filter(k => k !== 'project.delete') },
  { id: 'role-member', projectId: '', name: 'Membre', isSystem: true,  permissions: ['task.view','task.create','task.edit','task.move','task.assign','comment.view','comment.create','comment.edit','epic.manage','sprint.manage','workflow.view','member.view'] },
  { id: 'role-guest',  projectId: '', name: 'Invité', isSystem: true,  permissions: ['task.view','comment.view','workflow.view','member.view'] },
];

const roleIconEl = (name: string) => {
  switch (name.toLowerCase()) {
    case 'owner':  return <Crown className="w-3.5 h-3.5 text-amber-400" />;
    case 'admin':  return <Shield className="w-3.5 h-3.5 text-violet-400" />;
    case 'guest':  return <Eye className="w-3.5 h-3.5 text-slate-400" />;
    default:       return <User className="w-3.5 h-3.5 text-cyan-400" />;
  }
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  orgId?: string;
  projectName: string;
  projectDescription?: string | null;
  onProjectUpdated?: (name: string, description: string) => void;
  onProjectDeleted?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  orgId,
  projectName,
  projectDescription,
  onProjectUpdated,
  onProjectDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'general'>('members');

  // Members state
  const [members, setMembers] = useState<ProjectMember[]>(DEMO_MEMBERS);
  const [roles, setRoles]     = useState<ProjectRole[]>(DEFAULT_ROLES);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const hasLoadedPermissions = React.useRef(false);
  
  // State for roles from API
  const [availableAbilities, setAvailableAbilities] = useState<string[]>([]);
  const [apiRoles, setApiRoles] = useState<Array<{role: string; description: string}>>([]);

  // Invite inline state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('MEMBER');
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Role editor state
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName]     = useState('');
  const [newRolePerms, setNewRolePerms]   = useState<Set<PermissionKey>>(new Set());
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Tâches');
  
  // Delete confirmation state
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<{id: string; name: string} | null>(null);

  // General tab state
  const [editName, setEditName]        = useState(projectName);
  const [editDesc, setEditDesc]        = useState(projectDescription || '');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Reset loaded flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasLoadedPermissions.current = false;
    }
  }, [isOpen]);

  // Load members from API when members tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'members') return;
    
    const loadMembers = async () => {
      try {
        const apiMembers = await apiService.getProjectMembers(projectId);
        if (apiMembers) setMembers(apiMembers as any[]);
      } catch (error) {
        console.error('Failed to load members:', error);
      }
    };
    
    loadMembers();
  }, [isOpen, activeTab, projectId]);

  // Load permissions from API when roles tab is opened (only once per modal open)
  useEffect(() => {
    if (!isOpen || activeTab !== 'roles' || hasLoadedPermissions.current || isLoadingPermissions) return;
    
    const loadPermissions = async () => {
      hasLoadedPermissions.current = true;
      setIsLoadingPermissions(true);
      try {
        // Load available roles and abilities from /api/v1/roles
        const rolesCatalog = await apiService.getRoles();

        setApiRoles(rolesCatalog.roles);
        setAvailableAbilities(rolesCatalog.projectAbilities);
        
        // Load current project permissions - includes both system and custom roles
        let perms;
        try {
          perms = await apiService.getProjectPermissions(projectId);

        } catch (permError: any) {
          console.error('❌ Failed to load project permissions:', permError);

          
          // Use roles catalog as fallback
          perms = {
            projectAbilities: rolesCatalog.projectAbilities,
            roles: rolesCatalog.roles.map((role: any) => ({
              id: role.role,
              name: role.role,
              abilities: role.role === 'OWNER' || role.role === 'ADMIN' 
                ? rolesCatalog.projectAbilities 
                : role.role === 'MEMBER'
                ? ['task:create', 'task:update', 'task:move', 'comment:create', 'sprint:manage']
                : role.role === 'GUEST'
                ? ['comment:create']
                : []
            }))
          };
        }
        
        // Map all roles from permissions endpoint
        // System roles: OWNER, ADMIN, MEMBER, GUEST, CLIENT
        // Custom roles: any other role name
        const systemRoleNames = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST', 'CLIENT'];
        
        const allRoles: ProjectRole[] = (perms.roles || []).map((role: any) => {
          const isSystemRole = systemRoleNames.includes(role.name || role.id);
          
          return {
            id: role.id || role.name,
            projectId,
            name: role.name || role.id,
            isSystem: isSystemRole,
            permissions: role.abilities as PermissionKey[] || [],
          };
        });
        

        setRoles(allRoles.length > 0 ? allRoles : DEFAULT_ROLES);
      } catch (error: any) {
        console.error('Failed to load permissions:', error);
        if (!error?.message?.includes('Too Many Requests') && !error?.message?.includes('THROTTLER')) {
          toast.error('Impossible de charger les permissions');
        }
        // Keep default roles as fallback
        setRoles(DEFAULT_ROLES);
      } finally {
        setIsLoadingPermissions(false);
      }
    };
    
    loadPermissions();
  }, [isOpen, activeTab, projectId, isLoadingPermissions]);

  const { user } = useAuth();
  const currentMember = members.find((m) => m.userId === user?.id || m.user?.email === user?.email);
  const currentRole = currentMember?.role?.toLowerCase() ?? '';
  // If not found in members list → backend omits project owner, assume owner/admin
  const canManage = currentRole === 'owner' || currentRole === 'admin' || !currentMember;

  if (!isOpen) return null;

  // ── Handlers (connected to API) ──
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await apiService.addProjectMember(projectId, { 
        email: inviteEmail.trim(),
        role: inviteRoleId as any
      });
      toast.success('Membre invité avec succès');
      setInviteEmail(''); 
      setShowInviteForm(false);
      // Reload members list
      const updatedMembers = await apiService.getProjectMembers(projectId);
      if (updatedMembers) setMembers(updatedMembers as any[]);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to invite member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await apiService.removeProjectMember(projectId, userId);
      // Reload from API to get accurate list
      const updatedMembers = await apiService.getProjectMembers(projectId);
      if (updatedMembers) setMembers(updatedMembers as any[]);
      toast.success('Membre retiré du projet');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la suppression');
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await apiService.updateProjectMemberRole(projectId, userId, role as any);
      // Reload members to get updated data
      const updatedMembers = await apiService.getProjectMembers(projectId);
      if (updatedMembers) setMembers(updatedMembers as any[]);
      toast.success('Rôle mis à jour');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update role');
    }
  };

  const handleSaveRole = async () => {
    if (!newRoleName.trim()) return;
    
    const roleName = newRoleName.trim();
    
    try {
      console.log('✨ Creating custom role via POST endpoint:', { 
        name: roleName, 
        abilities: Array.from(newRolePerms) 
      });
      
      // Use the POST endpoint to create the role
      const createdRole = await apiService.createProjectRole(projectId, {
        name: roleName,
        abilities: Array.from(newRolePerms),
      });
      

      
      // Add to local roles state
      setRoles(prev => [...prev, {
        id: createdRole?.id || roleName,
        projectId,
        name: roleName,
        isSystem: false,
        permissions: Array.from(newRolePerms),
      }]);
      
      toast.success(`Role "${roleName}" created successfully`);
      setNewRoleName(''); 
      setNewRolePerms(new Set()); 
      setShowNewRoleForm(false);
    } catch (error: any) {
      console.error('❌ Failed to create role:', error);
      toast.error(error?.message || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error('Impossible de supprimer les rôles système');
      return;
    }
    
    // Show confirmation modal
    setDeleteConfirmRole({ id: roleId, name: roleName });
  };
  
  const confirmDeleteRole = async () => {
    if (!deleteConfirmRole) return;
    
    try {
      console.log('🗑️ Deleting custom role via DELETE endpoint:', { 
        projectId, 
        roleId: deleteConfirmRole.id, 
        roleName: deleteConfirmRole.name 
      });
      
      // Use the DELETE endpoint with the role ID (UUID for custom roles)
      await apiService.deleteProjectRole(projectId, deleteConfirmRole.id);
      
      setRoles(prev => prev.filter(r => r.id !== deleteConfirmRole.id));
      toast.success(`Role "${deleteConfirmRole.name}" deleted successfully`);
      setDeleteConfirmRole(null);
    } catch (error: any) {
      console.error('❌ Failed to delete role:', error);
      toast.error(error?.message || 'Failed to delete role');
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.updateProject(projectId, { name: editName, description: editDesc });
      onProjectUpdated?.(editName, editDesc);
      toast.success('Projet mis à jour');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update project');
    }
  };

  const tabs = [
    { key: 'members' as const, label: 'Membres', icon: <Users className="w-4 h-4" /> },
    { key: 'roles'   as const, label: 'Rôles & Permissions', icon: <Shield className="w-4 h-4" /> },
    { key: 'general' as const, label: 'Général', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="font-black text-slate-900 dark:text-white text-base">Paramètres du projet</h2>
            <p className="text-xs text-slate-500 mt-0.5">{projectName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── MEMBERS TAB ── */}
          {activeTab === 'members' && (
            <div className="space-y-5">
              {showInviteForm && canManage && (
                <form onSubmit={handleInvite} className="flex flex-wrap gap-2 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
                  <input type="email" placeholder="email@domaine.com" value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)} required autoFocus
                    className="flex-1 min-w-[200px] rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <select value={inviteRoleId} onChange={e => setInviteRoleId(e.target.value)}
                    className="rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium py-2 px-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-sm hover:shadow-md hover:border-violet-500/30 transition-all duration-150 cursor-pointer">
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>
                        {r.name} {!r.isSystem && '(Custom)'}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer">Envoyer</button>
                  <button type="button" onClick={() => setShowInviteForm(false)} className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer">Annuler</button>
                </form>
              )}

              <ProjectMembersView
                projectId={projectId} projectName={projectName}
                currentUserId={user?.id}
                currentUserEmail={user?.email}
                members={members} roles={roles}
                onInvite={() => setShowInviteForm(v => !v)}
                onRemove={handleRemoveMember}
                onChangeRole={handleChangeRole}
              />
            </div>
          )}

          {/* ── ROLES & PERMISSIONS TAB ── */}
          {activeTab === 'roles' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Configure system role permissions or create custom roles for your project</p>
                <button onClick={() => { setShowNewRoleForm(v => !v); setNewRoleName(''); setNewRolePerms(new Set()); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer transition">
                  <Plus className="w-3.5 h-3.5" /> Create Custom Role
                </button>
              </div>

              {/* New role form */}
              {showNewRoleForm && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-violet-500/20 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Role Name (e.g., QA Lead, Designer, Contractor)
                    </label>
                    <input placeholder="e.g., QA Lead, Designer..." value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)} autoFocus
                      className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Choose any name for your custom role. This role will be specific to this project.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {PERMISSION_GROUPS.map(group => {
                      const perms = ALL_PERMISSIONS.filter(p => p.group === group);
                      const isExpanded = expandedGroup === group;
                      const allChecked = perms.every(p => newRolePerms.has(p.key));
                      return (
                        <div key={group} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                          <button onClick={() => setExpandedGroup(isExpanded ? null : group)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-200/50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-300/50 dark:hover:bg-slate-700/60 transition">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={allChecked}
                                onChange={e => {
                                  const next = new Set(newRolePerms);
                                  perms.forEach(p => e.target.checked ? next.add(p.key) : next.delete(p.key));
                                  setNewRolePerms(next);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="accent-violet-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{group}</span>
                              <span className="text-[10px] text-slate-500">{perms.filter(p => newRolePerms.has(p.key)).length}/{perms.length}</span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                          {isExpanded && (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {perms.map(p => (
                                <label key={p.key} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                  <input type="checkbox" checked={newRolePerms.has(p.key)}
                                    onChange={e => {
                                      const next = new Set(newRolePerms);
                                      e.target.checked ? next.add(p.key) : next.delete(p.key);
                                      setNewRolePerms(next);
                                    }}
                                    className="accent-violet-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                                  />
                                  <div>
                                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{p.label}</p>
                                    <p className="text-[10px] text-slate-500">{p.description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowNewRoleForm(false)} className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer">Annuler</button>
                    <button onClick={handleSaveRole} disabled={!newRoleName.trim()}
                      className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50">
                      Create Role
                    </button>
                  </div>
                </div>
              )}

              {/* Existing roles */}
              <div className="space-y-3">
                {roles.map(role => {
                  const isEditing = editingRoleId === role.id;
                  return (
                    <div key={role.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-100/60 dark:bg-slate-900/60">
                        <div className="flex items-center gap-2">
                          {roleIconEl(role.name)}
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{role.name}</span>
                          {role.isSystem && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">Système</span>}
                          <span className="text-[10px] text-slate-500">{role.permissions.length} permissions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingRoleId(isEditing ? null : role.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition cursor-pointer">
                            {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                          </button>
                          {!role.isSystem && (
                            <button onClick={() => handleDeleteRole(role.id, role.name, role.isSystem)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-64 overflow-y-auto">
                            {ALL_PERMISSIONS.map(p => (
                              <label key={p.key} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                <input type="checkbox" checked={role.permissions.includes(p.key)}
                                  onChange={e => {
                                    setRoles(prev => prev.map(r => r.id === role.id ? {
                                      ...r,
                                      permissions: e.target.checked
                                        ? [...r.permissions, p.key]
                                        : r.permissions.filter(k => k !== p.key)
                                    } : r));
                                  }}
                                  className="accent-violet-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{p.label}</p>
                                  <p className="text-[10px] text-slate-500">{p.description}</p>
                                </div>
                                <span className="ml-auto text-[10px] text-slate-500 shrink-0">{p.group}</span>
                              </label>
                            ))}
                          </div>
                          <div className="px-4 py-3 bg-slate-100/60 dark:bg-slate-900/60 flex justify-end gap-2">
                            <button
                              onClick={() => setEditingRoleId(null)}
                              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  // Send only the single role being updated
                                  const payload = [{
                                    role: role.id, // Use role.id (should be the role identifier)
                                    abilities: role.permissions,
                                  }];
                                  
                                  console.log('💾 Updating role permissions:', {
                                    roleId: role.id,
                                    roleName: role.name,
                                    isSystem: role.isSystem,
                                    payload
                                  });
                                  
                                  await apiService.setProjectPermissions(projectId, payload as any);
                                  
                                  toast.success(`Permissions updated for ${role.name}`);
                                  setEditingRoleId(null);
                                } catch (error: any) {
                                  console.error('❌ Failed to save permissions:', error);
                                  
                                  // If system role not found, try creating it first as a custom role
                                  if (role.isSystem && error?.message?.includes('not found')) {

                                    try {
                                      await apiService.createProjectRole(projectId, {
                                        name: role.name,
                                        abilities: role.permissions,
                                      });
                                      toast.success(`Role "${role.name}" configured for this project`);
                                      setEditingRoleId(null);
                                    } catch (createError: any) {
                                      console.error('❌ Failed to initialize system role:', createError);
                                      toast.error(createError?.message || 'Failed to configure role');
                                    }
                                  } else {
                                    toast.error(error?.message || 'Failed to save permissions');
                                  }
                                }
                              }}
                              className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── GENERAL TAB ── */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveGeneral} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom du projet</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} required
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                  <textarea rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer transition"
                  >
                    <Check className="w-3.5 h-3.5" /> Enregistrer
                  </button>
                </div>
              </form>

              {/* Danger zone */}
              <div className="rounded-2xl border border-rose-500/30 overflow-hidden">
                <div className="px-4 py-3 bg-rose-500/5">
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Zone dangereuse</p>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-400">Supprimer ce projet effacera toutes les tâches, epics, sprints et membres associés. Cette action est <strong className="text-rose-400">irréversible</strong>.</p>
                  <p className="text-xs text-slate-400">Tapez <strong className="text-rose-400">{projectName}</strong> pour confirmer :</p>
                  <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder={projectName}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-rose-500/40 text-slate-900 dark:text-slate-100 text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    disabled={deleteConfirm !== projectName}
                    onClick={() => { onProjectDeleted?.(); onClose(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer le projet
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Delete Role Confirmation Modal */}
      {deleteConfirmRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Delete Role</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete the role <strong className="text-slate-900 dark:text-slate-100">"{deleteConfirmRole.name}"</strong>? All users assigned to this role will need to be reassigned.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmRole(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRole}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold cursor-pointer transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
