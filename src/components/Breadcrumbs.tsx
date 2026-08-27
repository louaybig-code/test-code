import React from 'react';
import { ChevronRight, Folder, LayoutGrid, Layers } from 'lucide-react';

interface BreadcrumbsProps {
  orgName?: string;
  workspaceName?: string;
  projectName?: string;
  onClickOrg?: () => void;
  onClickWorkspace?: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  orgName,
  workspaceName,
  projectName,
  onClickOrg,
  onClickWorkspace,
}) => (
  <nav
    className="flex items-center gap-1 text-xs font-medium overflow-x-auto whitespace-nowrap no-scrollbar py-1"
    style={{ color: 'var(--sp-text-muted)' }}
  >
    {orgName && (
      <>
        <button
          onClick={onClickOrg}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition ${
            onClickOrg
              ? 'hover:bg-[#E8531A]/10 hover:text-[#E8531A] cursor-pointer'
              : 'cursor-default'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#E8531A] shrink-0" />
          <span>{orgName}</span>
        </button>
        <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
      </>
    )}

    {workspaceName && (
      <>
        <button
          onClick={onClickWorkspace}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition ${
            onClickWorkspace
              ? 'hover:bg-[#1A8C8C]/10 hover:text-[#1A8C8C] cursor-pointer'
              : 'cursor-default'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-[#1A8C8C] shrink-0" />
          <span>{workspaceName}</span>
        </button>
        {projectName && <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />}
      </>
    )}

    {projectName && (
      <span
        className="flex items-center gap-1 px-1.5 py-0.5 font-semibold"
        style={{ color: 'var(--sp-text)' }}
      >
        <Folder className="w-3.5 h-3.5 text-[#2C3147] dark:text-[#E8EBF4] shrink-0" />
        {projectName}
      </span>
    )}
  </nav>
);
