import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Tag, X, AlertTriangle, Pencil, Check } from 'lucide-react';
import { apiService } from '../../services/api';
import { ProjectStatus } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { usePermissions } from '../../context/PermissionsContext';
import toast from 'react-hot-toast';

interface WorkflowEditorProps {
  projectId: string;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ projectId }) => {
  const { hasAbility } = usePermissions();
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusCategory, setNewStatusCategory] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');
  const [newStatusColor, setNewStatusColor] = useState('#1A8C8C');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // ID of the status waiting for inline confirmation
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Permission check
  const canManageWorkflow = hasAbility('workflow:manage');

  const loadStatuses = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getStatuses(projectId);
      setStatuses(data ?? []);
    } catch (err: any) {
      toast.error(err?.message || 'Error loading statuses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadStatuses();
  }, [projectId]);

  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageWorkflow) {
      toast.error('Vous n\'avez pas la permission de gérer le workflow');
      return;
    }
    if (!newStatusName.trim()) return;
    try {
      await apiService.createStatus(projectId, {
        name: newStatusName.trim(),
        category: newStatusCategory,
        color: newStatusColor,
      });
      toast.success('Statut créé');
      setNewStatusName('');
      loadStatuses();
    } catch (err: any) {
      toast.error(err?.message || 'Error creating status');
    }
  };

  const handleConfirmDelete = async (status: ProjectStatus) => {
    if (!canManageWorkflow) {
      toast.error('Vous n\'avez pas la permission de gérer le workflow');
      return;
    }
    setConfirmId(null);
    setDeletingId(status.id);
    try {
      await apiService.deleteStatus(status.id);
      setStatuses((prev) => prev.filter((s) => s.id !== status.id));
      toast.success(`"${status.name}" supprimé`);
    } catch (err: any) {
      toast.error(err?.message || `Impossible de supprimer "${status.name}"`);
      loadStatuses();
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (st: ProjectStatus) => {
    setEditingId(st.id);
    setEditingName(st.name);
    setEditingColor(st.color || '#1A8C8C');
    setConfirmId(null);
    // Focus input on next tick
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('');
  };

  const handleSaveRename = async (st: ProjectStatus) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    // No change — just cancel
    if (trimmed === st.name && editingColor === (st.color || '#1A8C8C')) {
      cancelEditing();
      return;
    }
    setSavingId(st.id);
    try {
      await apiService.updateStatus(st.id, { name: trimmed, color: editingColor });
      setStatuses((prev) =>
        prev.map((s) => (s.id === st.id ? { ...s, name: trimmed, color: editingColor } : s))
      );
      toast.success(`Statut renommé en "${trimmed}"`);
      cancelEditing();
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de renommer le statut');
    } finally {
      setSavingId(null);
    }
  };  if (isLoading) return (
    <div className="text-xs text-[#6B7280] p-4 flex items-center gap-2">
      <span className="w-3 h-3 rounded-full border-2 border-[#E8531A] border-t-transparent animate-spin inline-block" />
      Chargement du workflow...
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── Add Status ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C2033] border border-[#DDE1E9] dark:border-[#2E3450] shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#2C3147] dark:text-[#E8EAF0] flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#E8531A]" /> Ajouter un statut au workflow
        </h3>

        <form onSubmit={handleCreateStatus} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <Input
              placeholder="Nom du statut (ex : En révision, Test QA)"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              disabled={!canManageWorkflow}
            />
          </div>

          <div>
            <select
              value={newStatusCategory}
              onChange={(e) => setNewStatusCategory(e.target.value as any)}
              disabled={!canManageWorkflow}
              className={`w-full bg-[#EEF0F4] dark:bg-[#252A3D] border border-[#DDE1E9] dark:border-[#2E3450] rounded-xl py-2.5 px-3.5 text-sm font-medium text-[#1C2033] dark:text-[#E8EAF0] focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/50 shadow-sm hover:shadow-md hover:border-[#1A8C8C]/30 transition-all duration-150 cursor-pointer ${
                !canManageWorkflow ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="TODO">À FAIRE</option>
              <option value="IN_PROGRESS">EN COURS</option>
              <option value="DONE">TERMINÉ</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={newStatusColor}
              onChange={(e) => setNewStatusColor(e.target.value)}
              disabled={!canManageWorkflow}
              className={`w-10 h-9 rounded-lg bg-transparent shrink-0 ${
                canManageWorkflow ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              }`}
              title={canManageWorkflow ? 'Choisir la couleur' : 'Vous n\'avez pas la permission de gérer le workflow'}
            />
            <Button 
              variant="primary" 
              size="sm" 
              type="submit" 
              icon={<Plus className="w-3.5 h-3.5" />}
              disabled={!canManageWorkflow}
            >
              Ajouter
            </Button>
          </div>
        </form>

        {!canManageWorkflow && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400">
              Vous n'avez pas la permission de gérer le workflow.
            </p>
          </div>
        )}

      </div>

      {/* ── Existing Statuses ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
          Statuts existants ({statuses.length})
        </h4>

        {statuses.length === 0 ? (
          <p className="text-xs text-[#6B7280] italic">Aucun statut. Ajoutez-en un ci-dessus.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {statuses.map((st) => {
              const isDeleting = deletingId === st.id;
              const isConfirming = confirmId === st.id;
              const isEditing = editingId === st.id;

              return (
                <div
                  key={st.id || st.key || st.name}
                  className={`relative p-3.5 rounded-xl border transition overflow-hidden
                    ${isEditing
                      ? 'border-[#1A8C8C]/40 bg-[#1A8C8C]/5 dark:bg-[#1A8C8C]/10'
                      : isConfirming
                      ? 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/10'
                      : isDeleting
                      ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10'
                      : 'bg-white dark:bg-[#1C2033] border-[#DDE1E9] dark:border-[#2E3450] shadow-sm'
                    }`}
                >
                  {/* ── Normal view ── */}
                  {!isConfirming && !isEditing && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: st.color || '#1A8C8C' }}
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-[#1C2033] dark:text-[#E8EAF0] truncate">
                            {st.name}
                          </h5>
                          <span className="text-[10px] text-[#1A8C8C] font-mono">{st.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Rename button */}
                        <button
                          onClick={() => canManageWorkflow ? startEditing(st) : toast.error('Vous n\'avez pas la permission de gérer le workflow')}
                          disabled={isDeleting || !canManageWorkflow}
                          className={`p-1.5 rounded-lg transition
                            ${canManageWorkflow
                              ? 'text-[#6B7280] hover:text-[#1A8C8C] hover:bg-[#1A8C8C]/10 cursor-pointer'
                              : 'text-[#6B7280]/30 cursor-not-allowed'
                            }`}
                          title={canManageWorkflow ? `Renommer "${st.name}"` : 'Permission refusée'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => canManageWorkflow ? setConfirmId(st.id) : toast.error('Vous n\'avez pas la permission de gérer le workflow')}
                          disabled={isDeleting || !canManageWorkflow}
                          className={`p-1.5 rounded-lg transition
                            ${isDeleting
                              ? 'text-rose-400 cursor-wait'
                              : canManageWorkflow
                              ? 'text-[#6B7280] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer'
                              : 'text-[#6B7280]/30 cursor-not-allowed'
                            }`}
                          title={canManageWorkflow ? `Supprimer "${st.name}"` : 'Permission refusée'}
                        >
                          {isDeleting
                            ? <span className="w-4 h-4 rounded-full border-2 border-rose-400 border-t-transparent animate-spin inline-block" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Inline rename ── */}
                  {isEditing && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[10px] font-semibold text-[#1A8C8C] uppercase tracking-wider">Renommer le statut</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingColor}
                          onChange={(e) => setEditingColor(e.target.value)}
                          className="w-8 h-8 rounded-lg bg-transparent cursor-pointer shrink-0"
                          title="Pick color"
                        />
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(st);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 bg-[#EEF0F4] dark:bg-[#252A3D] border border-[#DDE1E9] dark:border-[#2E3450] rounded-lg px-2.5 py-1.5 text-xs text-[#1C2033] dark:text-[#E8EAF0] focus:outline-none focus:ring-2 focus:ring-[#1A8C8C]/50"
                          placeholder="Nom du statut…"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveRename(st)}
                          disabled={savingId === st.id || !editingName.trim()}
                          className="flex-1 py-1.5 rounded-lg bg-[#1A8C8C] hover:bg-[#157878] disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {savingId === st.id
                            ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                            : <><Check className="w-3.5 h-3.5" /> Enregistrer</>
                          }
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={savingId === st.id}
                          className="flex-1 py-1.5 rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] hover:bg-[#DDE1E9] dark:hover:bg-[#2E3450] text-[#6B7280] text-xs font-semibold transition cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Inline confirm ── */}
                  {isConfirming && !isEditing && (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <p className="text-xs font-semibold text-rose-400">
                          Supprimer &ldquo;{st.name}&rdquo; ?
                        </p>
                      </div>
                      <p className="text-[11px] text-[#8890A8]">
                        Ce statut sera définitivement supprimé et cette action est irréversible.
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          onClick={() => handleConfirmDelete(st)}
                          className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Oui, supprimer
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="flex-1 py-1.5 rounded-lg bg-[#EEF0F4] dark:bg-[#252A3D] hover:bg-[#DDE1E9] dark:hover:bg-[#2E3450] text-[#6B7280] dark:text-[#8890A8] text-xs font-semibold transition cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
