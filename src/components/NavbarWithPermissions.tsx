import React from 'react';
import { Navbar } from './Navbar';
import { usePermissions } from '../context/PermissionsContext';

interface NavbarWithPermissionsProps {
  orgName?: string;
  workspaceName?: string;
  projectName?: string;
  activeView: string;
  onChangeView: (view: string) => void;
  onOpenCreateTask: () => void;
  onOpenCommandBar: () => void;
  onToggleMobile: () => void;
  onOpenProfile: () => void;
  onClickOrg?: () => void;
  onClickWorkspace?: () => void;
}

export const NavbarWithPermissions: React.FC<NavbarWithPermissionsProps> = (props) => {
  const { hasAbility } = usePermissions();
  const canCreateTask = hasAbility('task:create');

  return <Navbar {...props} canCreateTask={canCreateTask} />;
};
