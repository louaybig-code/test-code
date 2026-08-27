import React, { useState, useEffect } from 'react';
import { Building2, FolderKanban, Briefcase, Loader2, ArrowRight, Plus } from 'lucide-react';
import { apiService } from '../../services/api';
import { Organization, Workspace, Project } from '../../types';
import toast from 'react-hot-toast';

interface AllOrganizationsViewProps {
  onSelectOrganization: (org: Organization) => void;
  onCreateOrganization?: () => void;
}

interface OrgWithData extends Organization {
  workspaceCount: number;
  projectCount: number;
}

export function AllOrganizationsView({ onSelectOrganization, onCreateOrganization }: AllOrganizationsViewProps) {
  const [organizations, setOrganizations] = useState<OrgWithData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // Load user's projects to derive accessible orgs
      const myProjects = await apiService.getMyProjects();
      
      // Try to load owned orgs
      let ownedOrgs: Organization[] = [];
      try {
        ownedOrgs = await apiService.getOrganizations() || [];
      } catch (err) {
        console.warn('Could not load owned orgs:', err);
      }

      // Build org list with counts
      const orgMap = new Map<string, OrgWithData>();

      // Add owned orgs first
      ownedOrgs.forEach((org) => {
        orgMap.set(org.id, {
          ...org,
          workspaceCount: 0,
          projectCount: 0,
        });
      });

      // Process all accessible projects to count workspaces and projects per org
      if (myProjects && myProjects.length > 0) {
        myProjects.forEach((project: any) => {
          const orgId = project.organizationId;
          const wsId = project.workspaceId;

          if (!orgId) return;

          // Ensure org exists
          if (!orgMap.has(orgId)) {
            orgMap.set(orgId, {
              id: orgId,
              name: project.organizationName || 'Organization',
              slug: orgId,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              workspaceCount: 0,
              projectCount: 0,
            });
          }

          const org = orgMap.get(orgId)!;
          
          // Count projects
          org.projectCount++;
        });
      }

      // For owned orgs, get accurate workspace counts
      for (const [orgId, org] of orgMap) {
        if (ownedOrgs.some((o) => o.id === orgId)) {
          try {
            const orgWorkspaces = await apiService.getOrgWorkspaces(orgId);
            org.workspaceCount = orgWorkspaces?.length || 0;
          } catch (err) {
            // Fallback: count unique workspaces from projects
            const uniqueWorkspaces = new Set(
              myProjects
                .filter((p: any) => p.organizationId === orgId && p.workspaceId)
                .map((p: any) => p.workspaceId)
            );
            org.workspaceCount = uniqueWorkspaces.size;
          }
        } else {
          // For invited orgs, count unique workspaces from projects
          const uniqueWorkspaces = new Set(
            myProjects
              .filter((p: any) => p.organizationId === orgId && p.workspaceId)
              .map((p: any) => p.workspaceId)
          );
          org.workspaceCount = uniqueWorkspaces.size;
        }
      }

      setOrganizations(Array.from(orgMap.values()));
    } catch (error: any) {
      console.error('Failed to load organizations:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8531A]" />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Building2 className="w-16 h-16 text-[#6B7280] mb-4" />
        <p className="text-lg font-semibold text-[#2C3147] dark:text-[#E8EAF0] mb-2">
          Aucune organisation
        </p>
        <p className="text-sm text-[#6B7280]">
          Vous n'avez accès à aucune organisation pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-[#2C3147] dark:text-[#E8EAF0] mb-2">
            Mes Organisations
          </h2>
          <p className="text-sm text-[#6B7280]">
            Sélectionnez une organisation pour accéder à ses espaces de travail et projets
          </p>
        </div>
        
        {onCreateOrganization && (
          <button
            onClick={onCreateOrganization}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8531A] hover:bg-[#F06535] text-white text-sm font-semibold transition cursor-pointer shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Organisation
          </button>
        )}
      </div>

      {/* Organization Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => onSelectOrganization(org)}
            className="group relative p-6 rounded-2xl bg-white dark:bg-[#1C2033] border-2 border-[#DDE1E9] dark:border-[#2E3450] hover:border-[#E8531A] dark:hover:border-[#E8531A] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer text-left overflow-hidden"
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#E8531A]/5 to-[#1A8C8C]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 space-y-4">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8531A] to-[#1A8C8C] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-8 h-8 text-white" />
              </div>

              {/* Org Name */}
              <div>
                <h3 className="text-lg font-bold text-[#2C3147] dark:text-[#E8EAF0] group-hover:text-[#E8531A] transition-colors line-clamp-2 mb-2">
                  {org.name}
                </h3>
              </div>

              {/* Stats */}
              <div className="space-y-2 pt-2 border-t border-[#DDE1E9] dark:border-[#2E3450]">
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <FolderKanban className="w-4 h-4 text-[#1A8C8C]" />
                  <span className="font-semibold">{org.workspaceCount}</span>
                  <span>espace{org.workspaceCount !== 1 ? 's' : ''} de travail</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <Briefcase className="w-4 h-4 text-[#E8531A]" />
                  <span className="font-semibold">{org.projectCount}</span>
                  <span>projet{org.projectCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="flex items-center justify-end pt-2">
                <ArrowRight className="w-5 h-5 text-[#E8531A] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
