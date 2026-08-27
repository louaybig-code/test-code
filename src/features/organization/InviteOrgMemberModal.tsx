import React, { useState } from 'react';
import { X, UserPlus, Crown, Shield, User, Eye, Briefcase } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ── Role badge helpers ────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  OWNER:  { label: 'Owner',  icon: <Crown className="w-3 h-3" />, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  ADMIN:  { label: 'Admin',  icon: <Shield className="w-3 h-3" />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  MEMBER: { label: 'Member', icon: <User className="w-3 h-3" />, color: 'text-[#1A8C8C] bg-[#1A8C8C]/10 border-[#1A8C8C]/20' },
  GUEST:  { label: 'Guest',  icon: <Eye className="w-3 h-3" />, color: 'text-[#8890A8] bg-[#8890A8]/10 border-[#8890A8]/20' },
  CLIENT: { label: 'Client', icon: <Briefcase className="w-3 h-3" />, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
};

interface InviteOrgMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

export const InviteOrgMemberModal: React.FC<InviteOrgMemberModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT'>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await apiService.inviteOrgMember(organizationId, {
        email: email.trim(),
        role,
      });
      toast.success(`Invitation envoyée à ${email.trim()}`);
      setEmail('');
      setRole('MEMBER');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Échec de l\'envoi de l\'invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Inviter un membre - ${organizationName}`} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Input */}
        <Input
          label="Adresse email"
          type="email"
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />

        {/* Role Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Rôle
          </label>
          <div className="grid grid-cols-5 gap-2">
            {(['OWNER', 'ADMIN', 'MEMBER', 'GUEST', 'CLIENT'] as const).map((r) => {
              const meta = ROLE_META[r];
              const isSelected = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-[10px] font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'border-[#1A8C8C] bg-[#1A8C8C]/10'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className={isSelected ? 'text-[#1A8C8C]' : 'text-slate-500 dark:text-slate-400'}>
                    {meta.icon}
                  </span>
                  <span className={isSelected ? 'text-[#1A8C8C]' : 'text-slate-700 dark:text-slate-300'}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Le membre recevra un email d'invitation avec les permissions du rôle sélectionné.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Envoyer l'invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
