import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import type { OrgRole, ProjectAbility } from '../types';

const FULL_OWNER_ABILITIES = [
  'task:create',
  'task:update',
  'task:delete',
  'task:move',
  'comment:create',
  'sprint:manage',
  'workflow:manage',
  'dashboard:manage',
] as any[];

interface PermissionsContextValue {
  userRole: OrgRole | null;
  abilities: ProjectAbility[];
  hasAbility: (ability: ProjectAbility) => boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export const PermissionsProvider: React.FC<{
  projectId: string | null;
  children: React.ReactNode;
}> = ({ projectId, children }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const [abilities, setAbilities] = useState<ProjectAbility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !user) {
      setUserRole(null);
      setAbilities([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      setLoading(true);

      try {
        // Get project members to find current user's role
        const membersResponse = await apiService.getProjectMembers(projectId);
        const members = Array.isArray(membersResponse) ? membersResponse : (membersResponse as any)?.members || [];

        // Backend doesn't return userId in members, only user.email — match by both
        const currentMember = members.find(
          (m: any) =>
            (m.userId && m.userId === user.id) ||
            (m.user?.email && m.user.email === user.email) ||
            (m.email && m.email === user.email)
        );

        if (!currentMember) {
          // Backend doesn't include the project owner in the members list → default to OWNER
          setUserRole('OWNER');
          try {
            const permissions: any = await apiService.getProjectPermissions(projectId);
            const ownerPermission = (permissions.roles || []).find(
              (r: any) => (r.name || r.id)?.toUpperCase() === 'OWNER'
            );
            setAbilities(ownerPermission?.abilities || []);
          } catch {
            setAbilities(FULL_OWNER_ABILITIES);
          }
          setLoading(false);
          return;
        }

        // ── Custom role: abilities come directly from customRole object ──────
        if (!currentMember.role && currentMember.customRole) {
          const customAbilities = currentMember.customRole.abilities || [];
          setUserRole(currentMember.customRole.name as any);
          setAbilities(customAbilities);
          setLoading(false);
          return;
        }

        setUserRole(currentMember.role);

        // Get project permissions to find abilities for this system role
        try {
          const permissions: any = await apiService.getProjectPermissions(projectId);
          const rolePermission = (permissions.roles || []).find(
            (r: any) => (r.name || r.id)?.toUpperCase() === (currentMember.role || '').toUpperCase()
          );
          setAbilities(rolePermission?.abilities || []);
        } catch {
          const fallbackAbilities =
            currentMember.role === 'OWNER' || currentMember.role === 'ADMIN'
              ? FULL_OWNER_ABILITIES
              : (['task:create', 'task:update', 'task:move', 'comment:create'] as any[]);
          setAbilities(fallbackAbilities);
        }
      } catch {
        setUserRole(null);
        setAbilities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [projectId, user]);

  const hasAbility = (ability: ProjectAbility): boolean => {
    return abilities.includes(ability);
  };

  return (
    <PermissionsContext.Provider value={{ userRole, abilities, hasAbility, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};
