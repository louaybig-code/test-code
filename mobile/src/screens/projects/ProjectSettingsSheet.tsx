import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { FieldSelect } from '../../components/ui/Select';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { SkeletonLines } from '../../components/ui/Skeleton';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';

// ── Same permission catalogue as the web (ProjectSettingsModal ALL_PERMISSIONS) ──
interface ProjectPermission {
  key: string;
  label: string;
  description: string;
  group: string;
}

const ALL_PERMISSIONS: ProjectPermission[] = [
  { key: 'task:create', label: 'Créer des tâches', description: 'Ajouter de nouvelles tâches', group: 'Tâches' },
  { key: 'task:update', label: 'Modifier des tâches', description: 'Éditer titre, description, priorité…', group: 'Tâches' },
  { key: 'task:delete', label: 'Supprimer des tâches', description: 'Supprimer définitivement une tâche', group: 'Tâches' },
  { key: 'task:move', label: 'Déplacer des tâches', description: 'Changer le statut / colonne Kanban', group: 'Tâches' },
  { key: 'comment:create', label: 'Écrire des commentaires', description: 'Poster un commentaire', group: 'Commentaires' },
  { key: 'sprint:manage', label: 'Gérer les sprints', description: 'Créer, démarrer, clôturer des sprints', group: 'Sprints' },
  { key: 'workflow:manage', label: 'Gérer le workflow', description: 'Ajouter / modifier / supprimer des statuts', group: 'Workflow' },
];

const PERMISSION_GROUPS = ['Tâches', 'Commentaires', 'Sprints', 'Workflow'] as const;

interface ProjectRole {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

const roleIcon = (name: string): { icon: string; color: string } => {
  switch (name.toLowerCase()) {
    case 'owner': return { icon: 'Crown', color: '#F59E0B' };
    case 'admin': return { icon: 'Shield', color: '#8B5CF6' };
    case 'guest':
    case 'invité': return { icon: 'Eye', color: '#8890A8' };
    default: return { icon: 'User', color: '#06B6D4' };
  }
};

type Tab = 'members' | 'roles' | 'general';

/**
 * ProjectSettingsSheet — port of web `ProjectSettingsModal`:
 * tabs Membres (list/invite/change role/remove), Rôles & Permissions
 * (system + custom roles with permission checklists), Général (rename/delete).
 */
export const ProjectSettingsSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { activeProject, loadEverything, selectWorkspace, activeWorkspace } = useAppState();
  const projectId = activeProject?.id;
  const projectName = activeProject?.name ?? '';

  const [tab, setTab] = useState<Tab>('members');

  // ── members ──
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // ── roles ──
  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<Set<string>>(new Set());
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  // ── general ──
  const [editName, setEditName] = useState(projectName);
  const [editDesc, setEditDesc] = useState((activeProject as any)?.description ?? '');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!projectId) return;
    setLoadingMembers(true);
    try {
      const list: any = await apiService.getProjectMembers(projectId);
      setMembers(Array.isArray(list) ? list : list?.members ?? []);
    } catch (err: any) {
      toast.error(err.message || 'Erreur de chargement des membres');
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId]);

  const loadRoles = useCallback(async () => {
    if (!projectId) return;
    setLoadingRoles(true);
    try {
      const [, permsResult, customRolesResult] = await Promise.allSettled([
        apiService.getRoles(),
        apiService.getProjectPermissions(projectId),
        apiService.getProjectRoles(projectId),
      ]);
      const perms: any = permsResult.status === 'fulfilled' ? permsResult.value : null;
      const custom: any[] = customRolesResult.status === 'fulfilled' ? (customRolesResult as any).value ?? [] : [];

      const merged: ProjectRole[] = [];
      // System roles from permissions payload (same semantics as web)
      (perms?.roles ?? []).forEach((r: any) => {
        merged.push({
          id: String(r.id ?? r.name),
          name: r.name ?? String(r.id),
          isSystem: true,
          permissions: r.abilities ?? r.permissions ?? [],
        });
      });
      // API-provided custom roles
      (custom ?? []).forEach((r: any) => {
        merged.push({
          id: String(r.id ?? r.name),
          name: r.name ?? String(r.id),
          isSystem: false,
          permissions: r.abilities ?? r.permissions ?? [],
        });
      });
      setRoles(merged);
    } catch (err: any) {
      toast.error(err.message || 'Erreur de chargement des rôles');
    } finally {
      setLoadingRoles(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!visible || !projectId) return;
    setEditName(projectName);
    setEditDesc((activeProject as any)?.description ?? '');
    setDeleteConfirm('');
    if (tab === 'members') loadMembers();
    if (tab === 'roles') loadRoles();
  }, [visible, tab, projectId]);

  // ── member actions ──
  const handleInvite = async () => {
    if (!projectId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await apiService.addProjectMember(projectId, { email: inviteEmail.trim(), role: inviteRole as any });
      toast.success('Invitation envoyée !');
      setInviteEmail('');
      setShowInvite(false);
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (member: any, newRole: string) => {
    if (!projectId) return;
    const userId = member.userId ?? member.user?.id ?? member.id;
    try {
      await apiService.updateProjectMemberRole(projectId, userId, newRole as any);
      setMembers((prev) => prev.map((m) => (m === member ? { ...m, role: newRole } : m)));
      toast.success('Rôle mis à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleRemove = async (member: any) => {
    if (!projectId) return;
    const userId = member.userId ?? member.user?.id ?? member.id;
    try {
      await apiService.removeProjectMember(projectId, userId);
      setMembers((prev) => prev.filter((m) => m !== member));
      toast.success('Membre retiré');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setConfirmRemoveId(null);
    }
  };

  // ── role actions ──
  const handleCreateRole = async () => {
    if (!projectId || !newRoleName.trim()) return;
    setSavingRole(true);
    try {
      await apiService.createProjectRole(projectId, {
        name: newRoleName.trim(),
        abilities: Array.from(newRolePerms),
      });
      toast.success('Rôle créé !');
      setShowNewRole(false);
      setNewRoleName('');
      setNewRolePerms(new Set());
      loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: ProjectRole) => {
    if (!projectId) return;
    try {
      await apiService.deleteProjectRole(projectId, role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      toast.success('Rôle supprimé');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de supprimer');
    }
  };

  const handleSaveRolePermissions = async (role: ProjectRole) => {
    if (!projectId) return;
    setSavingRole(true);
    try {
      // Same as web: only the role being updated
      await apiService.setProjectPermissions(projectId, [
        { role: role.id as any, abilities: role.permissions } as any,
      ]);
      toast.success(`Permissions mises à jour pour ${role.name}`);
      setEditingRoleId(null);
    } catch (err: any) {
      // web fallback: create as custom role when system role doesn't exist yet
      if (role.isSystem && err?.message?.includes('not found')) {
        try {
          await apiService.createProjectRole(projectId, { name: role.name, abilities: role.permissions });
          toast.success(`Rôle « ${role.name} » configuré pour ce projet`);
          setEditingRoleId(null);
        } catch (e2: any) {
          toast.error(e2?.message || 'Échec de la configuration du rôle');
        }
      } else {
        toast.error(err.message || 'Échec de la sauvegarde');
      }
    } finally {
      setSavingRole(false);
    }
  };

  // ── general actions ──
  const handleSaveGeneral = async () => {
    if (!projectId) return;
    setSavingGeneral(true);
    try {
      await apiService.updateProject(projectId, { name: editName.trim(), description: editDesc.trim() });
      toast.success('Projet mis à jour');
      await loadEverything();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    setDeleting(true);
    try {
      await apiService.deleteProject(projectId);
      toast.success('Projet supprimé');
      onClose();
      await loadEverything();
      selectWorkspace(activeWorkspace);
    } catch (err: any) {
      toast.error(err.message || 'Impossible de supprimer');
    } finally {
      setDeleting(false);
    }
  };

  const SYSTEM_ROLE_OPTIONS = [
    { value: 'OWNER', label: 'Owner' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MEMBER', label: 'Membre' },
    { value: 'GUEST', label: 'Invité' },
    { value: 'CLIENT', label: 'Client' },
  ];

  const canManage = true; // web shows the buttons and lets the API enforce

  if (!projectId) return null;

  return (
    <Sheet visible={visible} onClose={onClose} title="Paramètres du projet" subtitle={projectName} heightFraction={0.9}>
      {/* tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        {(
          [
            { key: 'members', label: 'Membres', icon: 'Users' },
            { key: 'roles', label: 'Rôles & Permissions', icon: 'Shield' },
            { key: 'general', label: 'Général', icon: 'Settings' },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tabBtn, active && { borderBottomColor: '#8B5CF6' }]}>
              <Icon name={t.icon as any} size={12} color={active ? '#8B5CF6' : colors.textMuted} />
              <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: FONT.inter.bold, color: active ? '#8B5CF6' : colors.textMuted }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
        {/* ── MEMBERS ── */}
        {tab === 'members' && (
          <View>
            {canManage && (
              <Pressable onPress={() => setShowInvite((v) => !v)} style={[styles.inviteToggle, { borderColor: 'rgba(139,92,246,0.25)' }]}>
                <Icon name="UserPlus" size={13} color="#8B5CF6" />
                <Text style={{ color: '#8B5CF6', fontSize: 12.5, fontFamily: FONT.inter.bold }}>
                  {showInvite ? 'Annuler' : 'Inviter un membre'}
                </Text>
              </Pressable>
            )}

            {showInvite && (
              <View style={[styles.inviteForm, { backgroundColor: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.22)' }]}>
                <Input
                  placeholder="email@domaine.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  inputStyle={{ fontSize: 12.5 }}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <FieldSelect value={inviteRole} onChange={setInviteRole} options={SYSTEM_ROLE_OPTIONS} compact />
                  </View>
                  <Button size="sm" style={{ backgroundColor: '#7C3AED', shadowOpacity: 0 }} textStyle={{ fontSize: 12 }} onPress={handleInvite} isLoading={inviting}>
                    Envoyer
                  </Button>
                </View>
              </View>
            )}

            {loadingMembers ? (
              <SkeletonLines lines={3} gap={10} />
            ) : (
              <View style={{ gap: 8 }}>
                {members.map((m, i) => {
                  const u = m.user ?? {};
                  const userId = m.userId ?? u.id ?? m.id;
                  const isSelf = !!user && (userId === user.id || u.email === user.email);
                  const displayRole = m.customRole?.name ?? m.role ?? 'MEMBER';
                  const isConfirming = confirmRemoveId === (userId ?? `i${i}`);
                  return (
                    <View key={userId ?? `m${i}`} style={[styles.memberCard, { backgroundColor: colors.surface2, borderColor: isConfirming ? 'rgba(244,63,94,0.4)' : colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Avatar src={u.avatarUrl} firstName={u.firstName ?? undefined} lastName={u.lastName ?? undefined} email={u.email} size="sm" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: FONT.inter.semibold, color: colors.text }}>
                            {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Inconnu'}
                            {isSelf && <Text style={{ color: BRAND.teal, fontSize: 10 }}> (vous)</Text>}
                          </Text>
                          {!!u.email && <Text numberOfLines={1} style={{ fontSize: 10.5, color: colors.textMuted }}>{u.email}</Text>}
                          {m.source === 'organization' && (
                            <Text style={{ fontSize: 9.5, color: BRAND.teal, fontFamily: FONT.inter.medium, marginTop: 1 }}>via l'organisation</Text>
                          )}
                        </View>
                        {!isSelf && m.source !== 'organization' && (
                          <Pressable onPress={() => setConfirmRemoveId(isConfirming ? null : userId)} hitSlop={8} style={{ padding: 4 }}>
                            <Icon name="Trash2" size={13} color="#FB7185" />
                          </Pressable>
                        )}
                      </View>
                      {!isSelf && m.source !== 'organization' && !isConfirming && (
                        <FieldSelect
                          value={displayRole.toString().toUpperCase()}
                          onChange={(v) => handleChangeRole(m, v)}
                          options={SYSTEM_ROLE_OPTIONS}
                          compact
                          style={{ marginTop: 8 }}
                        />
                      )}
                      {isConfirming && (
                        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(244,63,94,0.22)' }}>
                          <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.semibold, color: '#FB7185' }}>
                            Retirer {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email} du projet ?
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <Pressable onPress={() => handleRemove(m)} style={[styles.smallBtn, { backgroundColor: '#DC2626' }]}>
                              <Text style={styles.smallBtnText}>Oui, retirer</Text>
                            </Pressable>
                            <Pressable onPress={() => setConfirmRemoveId(null)} style={[styles.smallBtn, { backgroundColor: colors.surface3 }]}>
                              <Text style={[styles.smallBtnText, { color: colors.textMuted }]}>Annuler</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
                {members.length === 0 && (
                  <View style={[styles.memberCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 12.5, color: colors.textMuted, fontFamily: FONT.inter.regular }}>
                      Vous êtes le seul membre de ce projet.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── ROLES ── */}
        {tab === 'roles' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ flex: 1, fontSize: 11.5, fontFamily: FONT.inter.regular, color: colors.textMuted }}>
                Configurez les permissions des rôles ou créez des rôles personnalisés.
              </Text>
              <Pressable
                onPress={() => {
                  setShowNewRole((v) => !v);
                  setNewRoleName('');
                  setNewRolePerms(new Set());
                }}
                style={[styles.roleCreateBtn, { backgroundColor: '#7C3AED' }]}
              >
                <Icon name="Plus" size={12} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 11, fontFamily: FONT.inter.bold }}>Créer un rôle</Text>
              </Pressable>
            </View>

            {showNewRole && (
              <View style={[styles.inviteForm, { backgroundColor: colors.surface2, borderColor: 'rgba(139,92,246,0.25)', gap: 10 }]}>
                <Input
                  label="Nom du rôle (ex: QA Lead, Designer)"
                  placeholder="QA Lead…"
                  value={newRoleName}
                  onChangeText={setNewRoleName}
                  inputStyle={{ fontSize: 12.5 }}
                />
                {PERMISSION_GROUPS.map((group) => {
                  const perms = ALL_PERMISSIONS.filter((p) => p.group === group);
                  const allChecked = perms.every((p) => newRolePerms.has(p.key));
                  const expanded = expandedGroup === group;
                  return (
                    <View key={group} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.lg, overflow: 'hidden' }}>
                      <Pressable
                        onPress={() => setExpandedGroup(expanded ? null : group)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface3, paddingHorizontal: 12, paddingVertical: 10 }}
                      >
                        <Text style={{ flex: 1, fontSize: 12, fontFamily: FONT.inter.bold, color: colors.text }}>{group}</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>
                          {perms.filter((p) => newRolePerms.has(p.key)).length}/{perms.length}
                        </Text>
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            const next = new Set(newRolePerms);
                            perms.forEach((p) => (allChecked ? next.delete(p.key) : next.add(p.key)));
                            setNewRolePerms(next);
                          }}
                          style={[styles.miniCheck, { borderColor: allChecked ? '#8B5CF6' : colors.borderStrong, backgroundColor: allChecked ? '#8B5CF6' : 'transparent' }]}
                        >
                          {allChecked && <Icon name="Check" size={10} color="#fff" />}
                        </Pressable>
                        <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={13} color={colors.textMuted} />
                      </Pressable>
                      {expanded &&
                        perms.map((p) => {
                          const checked = newRolePerms.has(p.key);
                          return (
                            <Pressable
                              key={p.key}
                              onPress={() => {
                                const next = new Set(newRolePerms);
                                checked ? next.delete(p.key) : next.add(p.key);
                                setNewRolePerms(next);
                              }}
                              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 9 }}
                            >
                              <View style={[styles.miniCheck, { marginTop: 2, borderColor: checked ? '#8B5CF6' : colors.borderStrong, backgroundColor: checked ? '#8B5CF6' : 'transparent' }]}>
                                {checked && <Icon name="Check" size={10} color="#fff" />}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontFamily: FONT.inter.semibold, color: colors.text }}>{p.label}</Text>
                                <Text style={{ fontSize: 10, fontFamily: FONT.inter.regular, color: colors.textMuted }}>{p.description}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                    </View>
                  );
                })}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="ghost" size="sm" onPress={() => setShowNewRole(false)}>Annuler</Button>
                  <Button size="sm" style={{ backgroundColor: '#7C3AED', shadowOpacity: 0 }} onPress={handleCreateRole} isLoading={savingRole} disabled={!newRoleName.trim()}>
                    Créer le rôle
                  </Button>
                </View>
              </View>
            )}

            {loadingRoles ? (
              <SkeletonLines lines={3} gap={10} />
            ) : (
              <View style={{ gap: 8 }}>
                {roles.map((role) => {
                  const isEditing = editingRoleId === role.id;
                  const meta = roleIcon(role.name);
                  return (
                    <View key={role.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: colors.surface2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface3, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Icon name={meta.icon as any} size={13} color={meta.color} />
                        <Text style={{ flex: 1, fontSize: 12.5, fontFamily: FONT.inter.bold, color: colors.text }} numberOfLines={1}>
                          {role.name}
                        </Text>
                        {role.isSystem && (
                          <View style={[styles.sysPill, { backgroundColor: colors.surface2 }]}>
                            <Text style={{ fontSize: 9, fontFamily: FONT.inter.medium, color: colors.textMuted }}>Système</Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 9.5, color: colors.textMuted, fontFamily: FONT.inter.medium }}>
                          {role.permissions.length} permissions
                        </Text>
                        <Pressable onPress={() => setEditingRoleId(isEditing ? null : role.id)} hitSlop={8} style={{ padding: 3 }}>
                          <Icon name={isEditing ? 'ChevronUp' : 'Pencil'} size={12} color={isEditing ? '#8B5CF6' : colors.textMuted} />
                        </Pressable>
                        {!role.isSystem && (
                          <Pressable onPress={() => handleDeleteRole(role)} hitSlop={8} style={{ padding: 3 }}>
                            <Icon name="Trash2" size={12} color="#FB7185" />
                          </Pressable>
                        )}
                      </View>
                      {isEditing && (
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                          {ALL_PERMISSIONS.map((p) => {
                            const checked = role.permissions.includes(p.key);
                            return (
                              <Pressable
                                key={p.key}
                                onPress={() =>
                                  setRoles((prev) =>
                                    prev.map((r) =>
                                      r.id === role.id
                                        ? {
                                            ...r,
                                            permissions: checked ? r.permissions.filter((k) => k !== p.key) : [...r.permissions, p.key],
                                          }
                                        : r
                                    )
                                  )
                                }
                                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 9 }}
                              >
                                <View style={[styles.miniCheck, { marginTop: 2, borderColor: checked ? '#8B5CF6' : colors.borderStrong, backgroundColor: checked ? '#8B5CF6' : 'transparent' }]}>
                                  {checked && <Icon name="Check" size={10} color="#fff" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 12, fontFamily: FONT.inter.semibold, color: colors.text }}>{p.label}</Text>
                                  <Text style={{ fontSize: 10, fontFamily: FONT.inter.regular, color: colors.textMuted }}>{p.description}</Text>
                                </View>
                                <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: FONT.inter.medium }}>{p.group}</Text>
                              </Pressable>
                            );
                          })}
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, backgroundColor: colors.surface3, padding: 10 }}>
                            <Button variant="ghost" size="sm" onPress={() => setEditingRoleId(null)}>Annuler</Button>
                            <Button size="sm" style={{ backgroundColor: '#7C3AED', shadowOpacity: 0 }} onPress={() => handleSaveRolePermissions(role)} isLoading={savingRole}>
                              Enregistrer
                            </Button>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── GENERAL ── */}
        {tab === 'general' && (
          <View style={{ gap: 14 }}>
            <Input label="Nom du projet" value={editName} onChangeText={setEditName} />
            <Textarea label="Description" value={editDesc} onChangeText={setEditDesc} />
            <View style={{ alignItems: 'flex-end' }}>
              <Button size="sm" style={{ backgroundColor: '#7C3AED', shadowOpacity: 0 }} icon={<Icon name="Check" size={13} color="#fff" />} onPress={handleSaveGeneral} isLoading={savingGeneral}>
                Enregistrer
              </Button>
            </View>

            <View style={[styles.dangerZone, { borderColor: 'rgba(244,63,94,0.3)' }]}>
              <View style={{ backgroundColor: 'rgba(244,63,94,0.06)', paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ fontSize: 10.5, fontFamily: FONT.inter.bold, color: '#FB7185', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Zone dangereuse
                </Text>
              </View>
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={{ fontSize: 12, fontFamily: FONT.inter.regular, color: colors.textMuted, lineHeight: 17 }}>
                  Supprimer ce projet effacera toutes les tâches, epics, sprints et membres associés. Cette action est <Text style={{ color: '#FB7185', fontFamily: FONT.inter.bold }}>irréversible</Text>.
                </Text>
                <Text style={{ fontSize: 12, fontFamily: FONT.inter.regular, color: colors.textMuted }}>
                  Tapez <Text style={{ color: '#FB7185', fontFamily: FONT.inter.bold }}>{projectName}</Text> pour confirmer :
                </Text>
                <Input placeholder={projectName} value={deleteConfirm} onChangeText={setDeleteConfirm} />
                <View style={{ alignItems: 'flex-start' }}>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deleteConfirm !== projectName}
                    isLoading={deleting}
                    onPress={handleDeleteProject}
                    icon={<Icon name="Trash2" size={13} color="#EF4444" />}
                  >
                    Supprimer le projet
                  </Button>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    gap: 14,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingBottom: 9,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  inviteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  inviteForm: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 12,
  },
  memberCard: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 11.5,
    fontFamily: FONT.inter.semibold,
  },
  roleCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  miniCheck: {
    width: 15,
    height: 15,
    borderRadius: 4.5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sysPill: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  dangerZone: {
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: 6,
  },
});
