import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { apiService } from '../../services/api';
import { Organization, Workspace } from '../../types';
import toast from 'react-hot-toast';
import { LayoutGrid } from 'lucide-react';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrg: Organization | null;
  currentWorkspace: Workspace | null;
  onWorkspaceCreated: (ws: Workspace) => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
  currentOrg,
  onWorkspaceCreated,
}) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !name.trim()) return;
    setIsCreating(true);
    try {
      const newWs = await apiService.createOrgWorkspace(currentOrg.id, { name: name.trim() });
      toast.success('Espace de travail créé !');
      onWorkspaceCreated(newWs);
      setName('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvel Espace de travail" maxWidth="md">
      <form onSubmit={handleCreate} className="space-y-4">
        <Input
          label="Nom de l'espace de travail"
          placeholder="Ex: Équipe Produit, Marketing, Dev Backend"
          icon={<LayoutGrid className="w-4 h-4" />}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" isLoading={isCreating}>Créer l'espace</Button>
        </div>
      </form>
    </Modal>
  );
};
