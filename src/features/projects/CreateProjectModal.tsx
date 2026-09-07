import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { apiService } from '../../services/api';
import { Project, Workspace } from '../../types';
import toast from 'react-hot-toast';
import { Folder, AlignLeft, UserPlus, X, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspace: Workspace | null;
  onProjectCreated: (project: Project) => void;
}

interface InviteRow {
  id: number;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  currentWorkspace,
  onProjectCreated,
}) => {
  // Step 1: create project
  const [step, setStep] = useState<'create' | 'invite'>('create');
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Invite form
  const [invites, setInvites] = useState<InviteRow[]>([{ id: 1, email: '', role: 'MEMBER' }]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const resetAll = () => {
    setStep('create');
    setCreatedProject(null);
    setName('');
    setDescription('');
    setInvites([{ id: 1, email: '', role: 'MEMBER' }]);
    setSentCount(0);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ── Step 1: Create project ──────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) { toast.error('Aucun espace de travail sélectionné'); return; }
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const proj = await apiService.createProject(currentWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Projet créé !');
      setCreatedProject(proj);
      onProjectCreated(proj);
      setStep('invite');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du projet');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Step 2: Invite collaborators ────────────────────────────────────────────
  const addInviteRow = () => {
    setInvites((prev) => [...prev, { id: Date.now(), email: '', role: 'MEMBER' }]);
  };

  const removeInviteRow = (id: number) => {
    setInvites((prev) => prev.filter((r) => r.id !== id));
  };

  const updateInviteRow = (id: number, field: 'email' | 'role', value: string) => {
    setInvites((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdProject) return;
    const valid = invites.filter((r) => r.email.trim().includes('@'));
    if (valid.length === 0) {
      handleClose();
      return;
    }
    setIsSendingInvites(true);
    let count = 0;
    for (const row of valid) {
      try {
        await apiService.inviteProjectMember(createdProject.id, {
          email: row.email.trim(),
          role: row.role,
        });
        count++;
      } catch {
        toast.error(`Erreur pour ${row.email}`);
      }
    }
    setSentCount(count);
    setIsSendingInvites(false);
    if (count > 0) toast.success(`${count} invitation${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''} !`);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'create' ? 'Nouveau Projet' : `Inviter des collaborateurs`}
      maxWidth="md"
    >
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 'create' ? 'text-violet-400' : 'text-emerald-400'}`}>
          {step === 'invite' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-black">1</span>}
          Créer le projet
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 'invite' ? 'text-violet-400' : 'text-slate-500'}`}>
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${step === 'invite' ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-400'}`}>2</span>
          Inviter des collaborateurs
        </div>
      </div>

      {/* ── Step 1 ── */}
      {step === 'create' && (
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nom du projet"
            placeholder="Ex: Refonte Site Web, Application Mobile V2"
            icon={<Folder className="w-4 h-4 text-violet-500" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description <span className="normal-case font-normal text-slate-500">(optionnel)</span>
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              <textarea
                rows={3}
                placeholder="Objectifs et périmètre du projet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm py-2.5 pl-10 pr-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={handleClose}>Annuler</Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Créer &amp; Continuer
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 'invite' && createdProject && (
        <form onSubmit={handleSendInvites} className="space-y-5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Projet <strong className="mx-1">"{createdProject.name}"</strong> créé avec succès.
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Inviter par email
              </label>
              <button
                type="button"
                onClick={addInviteRow}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {invites.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="collaborateur@domaine.com"
                    value={row.email}
                    onChange={(e) => updateInviteRow(row.id, 'email', e.target.value)}
                    className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <select
                    value={row.role}
                    onChange={(e) => updateInviteRow(row.id, 'role', e.target.value)}
                    className="rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-sm hover:shadow-md hover:border-violet-500/30 transition-all duration-150 cursor-pointer"
                  >
                    <option value="MEMBER">Membre</option>
                    <option value="ADMIN">Admin</option>
                    <option value="GUEST">Invité</option>
                  </select>
                  {invites.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInviteRow(row.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <Button
              variant="ghost"
              type="button"
              onClick={handleClose}
              disabled={isSendingInvites}
            >
              Passer cette étape
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSendingInvites}
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Envoyer les invitations
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
