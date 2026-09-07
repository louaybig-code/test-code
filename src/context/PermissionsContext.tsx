import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import type { OrgRole, ProjectAbility } from '../types';

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

        
        // Handle both array and wrapped response formats
        const members = Array.isArray(membersResponse) ? membersResponse : (membersResponse as any)?.members || [];

        
        // Backend doesn't return userId in members, only user.email — match by both
        const currentMember = members.find(
          (m: any) =>
            (m.userId && m.userId === user.id) ||
            (m.user?.email && m.user.email === user.email) ||
            (m.email && m.email === user.email)
        );

        
        if (!currentMember) {

          
          // If members array is empty OR user is not in list (they are the owner/creator),
          // assume OWNER — backend doesn't include project owner in members list
          if (members.length === 0) {

            setUserRole('OWNER');
            
            // Get project permissions and use OWNER abilities
            try {
              const permissions = await apiService.getProjectPermissions(projectId);

              
              const ownerPermission = (permissions.roles || []).find((r: any) => (r.name || r.id) === 'OWNER');

              
              setAbilities(ownerPermission?.abilities || []);
              
              console.log('🔐 Current User Permissions (defaulted to OWNER):', {
                userId: user.id,
                email: user.email,
                projectId,
                role: 'OWNER',
                abilities: ownerPermission?.abilities || [],
                note: 'No members in project - defaulted to OWNER',
              });
            } catch (permError: any) {
              console.error('❌ Failed to fetch permissions for OWNER:', permError);

              // Set full permissions as fallback
              const fallbackAbilities = [
                'task:create', 
                'task:update', 
                'task:delete', 
                'task:move', 
                'comment:create', 
                'sprint:manage', 
                'workflow:manage',
                'dashboard:manage'
              ];
              setAbilities(fallbackAbilities as any[]);
              
              console.log('🔐 Current User Permissions (fallback):', {
                userId: user.id,
                email: user.email,
                projectId,
                role: 'OWNER',
                abilities: fallbackAbilities,
                note: 'Permissions API returned 500 - using fallback for OWNER',
              });
            }
          } else {

            setUserRole('OWNER');

            try {
              const permissions = await apiService.getProjectPermissions(projectId);
              const ownerPermission = (permissions.roles || []).find(
                (r: any) => (r.name || r.id)?.toUpperCase() === 'OWNER'
              );
              setAbilities(ownerPermission?.abilities || []);
              console.log('🔐 Current User Permissions (owner not in members list):', {
                userId: user.id,
                email: user.email,
                projectId,
                role: 'OWNER',
                abilities: ownerPermission?.abilities || [],
              });
            } catch {
              const fallbackAbilities = [
                'task:create', 'task:update', 'task:delete', 'task:move',
                'comment:create', 'sprint:manage', 'workflow:manage', 'dashboard:manage',
              ];
              setAbilities(fallbackAbilities as any[]);

            }
          }
          setLoading(false);
          return;
        }

        // ── Custom role: abilities come directly from customRole object ──────
        if (!currentMember.role && currentMember.customRole) {
          const customAbilities = currentMember.customRole.abilities || [];
          setUserRole(currentMember.customRole.name as any);
          setAbilities(customAbilities);
          console.log('🔐 Current User Permissions (custom role):', {
            userId: user.id,
            email: user.email,
            projectId,
            role: currentMember.customRole.name,
            abilities: customAbilities,
          });
          setLoading(false);
          return;
        }

        setUserRole(currentMember.role);

        // Get project permissions to find abilities for this system role
        try {
          const permissions = await apiService.getProjectPermissions(projectId);

          
          const rolePermission = (permissions.roles || []).find(
            (r: any) => (r.name || r.id)?.toUpperCase() === (currentMember.role || '').toUpperCase()
          );

          
          setAbilities(rolePermission?.abilities || []);
          
          // Log current user's role and abilities for debugging
          console.log('🔐 Current User Permissions:', {
            userId: user.id,
            email: user.email,
            projectId,
            role: currentMember.role,
            abilities: rolePermission?.abilities || [],
          });
        } catch (permError: any) {
          console.error('❌ Failed to fetch project permissions:', permError);

          
          // Fallback permissions based on role
          const fallbackAbilities = currentMember.role === 'OWNER' || currentMember.role === 'ADMIN' 
            ? ['task:create', 'task:update', 'task:delete', 'task:move', 'comment:create', 'sprint:manage', 'workflow:manage', 'dashboard:manage']
            : ['task:create', 'task:update', 'task:move', 'comment:create'];
          
          setAbilities(fallbackAbilities as any[]);
          
          console.log('🔐 Current User Permissions (fallback):', {
            userId: user.id,
            email: user.email,
            projectId,
            role: currentMember.role,
            abilities: fallbackAbilities,
            note: 'Permissions API returned 500 - using fallback',
          });
        }
      } catch (error) {
        console.error('❌ Failed to fetch permissions:', error);
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
