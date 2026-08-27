import React from 'react';
import {
  Menu, Search, Plus, Kanban, ListTodo,
  Calendar as CalendarIcon, GitFork, BarChart2,
  MessageSquare, Sun, Moon, Rocket, Home,
} from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationsMenu } from './NotificationsMenu';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';

interface NavbarProps {
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
  onClickHome?: () => void;
}

const VIEWS = [
  { id: 'kanban',    label: 'Kanban',     icon: <Kanban       className="w-3.5 h-3.5" /> },
  { id: 'backlog',   label: 'Backlog',    icon: <Rocket       className="w-3.5 h-3.5" /> },
  { id: 'list',      label: 'List',       icon: <ListTodo     className="w-3.5 h-3.5" /> },
  { id: 'calendar',  label: 'Calendar',   icon: <CalendarIcon className="w-3.5 h-3.5" /> },
  { id: 'workflow',  label: 'Workflow',   icon: <GitFork      className="w-3.5 h-3.5" /> },
  { id: 'dashboard', label: 'Analytics',  icon: <BarChart2    className="w-3.5 h-3.5" /> },
  { id: 'channels',  label: 'Discussion', icon: <MessageSquare className="w-3.5 h-3.5" /> },
];

export const Navbar: React.FC<NavbarProps> = ({
  orgName, workspaceName, projectName,
  activeView, onChangeView,
  onOpenCreateTask, onOpenCommandBar, onToggleMobile,
  onOpenProfile, onClickOrg, onClickWorkspace, onClickHome,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-30 px-4 py-2.5 space-y-0"
      style={{
        backgroundColor: 'var(--sp-surface)',
        borderBottom: '1px solid var(--sp-border)',
        boxShadow: 'var(--sp-shadow-sm)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-4 py-1">
        {/* Left — mobile toggle + breadcrumbs */}
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-xl transition-colors cursor-pointer shrink-0"
            style={{ color: 'var(--sp-text-muted)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Home button - returns to organizations list */}
          {onClickHome && (
            <button
              onClick={onClickHome}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 group"
              style={{
                backgroundColor: 'var(--sp-surface-2)',
                border: '1px solid var(--sp-border)',
                color: 'var(--sp-text-muted)',
              }}
              title="Retour aux organisations"
            >
              <Home className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" style={{ color: 'var(--sp-orange)' }} />
              <span className="text-xs font-semibold hidden md:inline">Accueil</span>
            </button>
          )}
          
          <Breadcrumbs
            orgName={orgName}
            workspaceName={workspaceName}
            projectName={projectName}
            onClickOrg={onClickOrg}
            onClickWorkspace={onClickWorkspace}
          />
        </div>

        {/* Right — controls */}
        <div className="flex items-center gap-2 shrink-0">
          {projectName && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={onOpenCreateTask}
            >
              <span className="hidden sm:inline">New</span> Task
            </Button>
          )}

          {/* Search / Cmd+K */}
          <button
            onClick={onOpenCommandBar}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--sp-surface-2)',
              border: '1px solid var(--sp-border)',
              color: 'var(--sp-text-muted)',
              fontSize: '12px',
            }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: 'var(--sp-teal)' }} />
            <span className="hidden md:inline">Search...</span>
            <span
              className="font-mono px-1.5 py-0.5 rounded text-[10px]"
              style={{ backgroundColor: 'var(--sp-surface-3)', color: 'var(--sp-text-muted)' }}
            >
              ⌘K
            </span>
          </button>

          <NotificationsMenu />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl transition-colors cursor-pointer"
            style={{ color: 'var(--sp-text-muted)' }}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark'
              ? <Sun  className="w-4.5 h-4.5" style={{ color: 'var(--sp-orange)' }} />
              : <Moon className="w-4.5 h-4.5" style={{ color: 'var(--sp-charcoal)' }} />}
          </button>
        </div>
      </div>

      {/* ── View Selector Tabs ── */}
      {projectName && (
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar pt-1 pb-0.5">
          {VIEWS.map((v) => {
            const active = activeView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onChangeView(v.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={
                  active
                    ? {
                        backgroundColor: 'var(--sp-charcoal)',
                        color: '#fff',
                        boxShadow: 'var(--sp-shadow-sm)',
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: 'var(--sp-text-muted)',
                      }
                }
              >
                <span
                  style={{
                    color: active ? 'var(--sp-orange)' : 'var(--sp-teal)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {v.icon}
                </span>
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
