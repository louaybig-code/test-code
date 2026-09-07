import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Organization, OrganizationMember } from '../../types';
import toast from 'react-hot-toast';
import {
  Building,
  Users,
  Trash2,
  Crown,
  Shield,
  User,
  Eye,
  Briefcase,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// ── Role badge helpers ────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  OWNER:  { label: 'Owner',  icon: <Crown   className="w-3 h-3" />, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  ADMIN:  { label: 'Admin',  icon: <Shield  className="w-3 h-3" />, color: 'text-blue-400   bg-blue-400/10   border-blue-400/20'   },
  MEMBER: { label: 'Member', icon: <User    className="w-3 h-3" />, color: 'text-[#1A8C8C]  bg-[#1A8C8C]/10  border-[#1A8C8C]/20'  },
  GUEST:  { label: 'Guest',  icon: <Eye     className="w-3 h-3" />, color: 'text-[#8890A8]  bg-[#8890A8]/10  border-[#8890A8]/20'  },
  CLIENT: { label: 'Client', icon: <Briefcase className="w-3 h-3" />, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const meta = ROLE_META[role] ?? { label: role, icon: <User className="w-3 h-3" />, color: 'text-[#8890A8] bg-[#8890A8]/10 border-[#8890A8]/20' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

type Tab = 'create' | 'members';

interface OrgSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrgCreated: (org: Organization) => void;
  /** Pass the active org so the invite/members tabs are available */
  activeOrg?: Organization | null;
  /** Which tab to open by default */
  defaultTab?: Tab;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const OrgSettingsModal: React.FC<OrgSettingsModalProps> = ({
  isOpen,
  onClose,
  onOrgCreated,
  activeOrg,
  defaultTab,
}) => {
  const { user } = useAuth();
  const hasOrg = Boolean(activeOrg);
  const [tab, setTab] = useState<Tab>(defaultTab ?? (hasOrg ? 'members' : 'create'));

  // Reset tab when modal opens / org changes
  useEffect(() => {
    if (isOpen) setTab(defaultTab ?? (hasOrg ? 'members' : 'create'));
  }, [isOpen, hasOrg, defaultTab]);

  // ── Create org ──────────────────────────────────────────────────────────────
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setIsCreating(true);
    try {
      const newOrg = await apiService.createOrganization({ name: orgName.trim() });
      toast.success('Organisation créée !');
      onOrgCreated(newOrg);
      setOrgName('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Members list ────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const loadMembers = async () => {
    if (!activeOrg) return;
    setIsLoadingMembers(true);
    try {
      const list = await apiService.getOrgMembers(activeOrg.id);
      setMembers(list ?? []);
    } catch {
      toast.error('Échec du chargement des membres');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (isOpen && tab === 'members' && activeOrg) {
      loadMembers();
    }
  }, [isOpen, tab, activeOrg]);

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!activeOrg) return;
    // Backend returns user.id, not userId directly
    const userId = member.userId || member.user?.id;
    if (!userId) { toast.error('Impossible de supprimer ce membre'); return; }
    setRemovingId(member.id);
    try {
      await apiService.deleteOrgMember(activeOrg.id, userId);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success('Membre retiré');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setRemovingId(null);
    }
  };

  const handleChangeRole = async (member: OrganizationMember, newRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT') => {
    if (!activeOrg) return;
    const userId = member.userId || member.user?.id;
    if (!userId) { toast.error('Impossible de modifier ce membre'); return; }
    try {
      await apiService.setMemberRoles(activeOrg.id, userId, newRole);
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, role: newRole } : m));
      toast.success('Rôle mis à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'create',  label: 'New Org',  icon: <Building  className="w-3.5 h-3.5" /> },
    { id: 'members', label: 'Members',  icon: <Users     className="w-3.5 h-3.5" />, disabled: !hasOrg },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        activeOrg
          ? `Organisation · ${activeOrg.name}`
          : 'Organisation'
      }
      maxWidth="lg"
    >
      {/* ── Tab bar ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#131620] border border-[#2E3450] mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            disabled={t.disabled}
            onClick={() => !t.disabled && setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === t.id
                ? 'bg-[#E8531A] text-white shadow'
                : 'text-[#8890A8] hover:text-[#E8EAF0]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Create Org tab ── */}
      {tab === 'create' && (
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <Input
            label="Organisation name"
            placeholder="e.g. Acronym Inc, Studio Design"
            icon={<Building className="w-4 h-4" />}
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>Create Organisation</Button>
          </div>
        </form>
      )}

      {/* ── Members tab ── */}
      {tab === 'members' && activeOrg && (
        <div className="space-y-3 pt-2">
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#E8531A]" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-10 text-[#8890A8] text-sm">No members yet.</div>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const displayName = m.user
                  ? [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email || 'Inconnu'
                  : m.userId || 'Inconnu';
                const email = m.user?.email;
                // Prevent the current user from changing their own role or removing themselves
                const isSelf = user && (
                  (m.userId && m.userId === user.id) ||
                  (m.user?.id && m.user.id === user.id) ||
                  (m.user?.email && m.user.email === user.email)
                );

                const isConfirming = confirmRemoveId === m.id;

                return (
                  <li
                    key={m.id}
                    className={`flex flex-col gap-2 p-3 rounded-xl border transition ${
                      isConfirming
                        ? 'border-rose-500/40 bg-rose-500/5'
                        : 'bg-[#131620] border-[#2E3450]'
                    }`}
                  >
                    {/* Normal row */}
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-[#E8531A]/20 flex items-center justify-center shrink-0">
                        <span className="text-[#E8531A] font-bold text-xs">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#E8EAF0] truncate">
                          {displayName}
                          {isSelf && <span className="ml-1.5 text-[10px] text-[#1A8C8C] font-normal">(vous)</span>}
                        </p>
                        {email && <p className="text-[11px] text-[#8890A8] truncate">{email}</p>}
                      </div>

                      {/* Role selector — disabled for self or while confirming */}
                      <select
                        value={m.role}
                        onChange={(e) => handleChangeRole(m, e.target.value as any)}
                        disabled={!!isSelf || isConfirming}
                        title={isSelf ? 'Vous ne pouvez pas modifier votre propre rôle' : undefined}
                        className={`text-xs font-semibold rounded-xl px-3 py-2 border border-[#2E3450] bg-[#1C2033] text-[#E8EAF0] focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/40 shadow-sm hover:shadow-md hover:border-[#1A8C8C]/30 transition-all duration-150 ${
                          isSelf || isConfirming ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        {(['OWNER', 'ADMIN', 'MEMBER', 'GUEST', 'CLIENT'] as const).map((r) => (
                          <option key={r} value={r}>{ROLE_META[r].label}</option>
                        ))}
                      </select>

                      {/* Delete button — hidden for self */}
                      {isSelf ? (
                        <div className="w-7 h-7 shrink-0" />
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveId(m.id)}
                          disabled={removingId === m.id || isConfirming}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-40 shrink-0"
                          title="Retirer ce membre"
                        >
                          {removingId === m.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </div>

                    {/* Inline confirmation */}
                    {isConfirming && (
                      <div className="flex flex-col gap-2 pt-1 border-t border-rose-500/20">
                        <p className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Retirer <span className="font-bold">{displayName}</span> de l'organisation ?
                        </p>
                        <p className="text-[11px] text-[#8890A8]">
                          Cette action est irréversible. Le membre perdra l'accès à tous les projets.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setConfirmRemoveId(null); handleRemoveMember(m); }}
                            className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
                          >
                            Oui, retirer
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="flex-1 py-1.5 rounded-lg bg-[#252A3D] hover:bg-[#2E3450] text-[#8890A8] text-xs font-semibold transition cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex justify-end pt-1 border-t border-[#2E3450]">
            <p className="text-[11px] text-[#8890A8]">{members.length} membre{members.length !== 1 ? 's' : ''} dans cette organisation</p>
          </div>
        </div>
      )}
    </Modal>
  );
};
