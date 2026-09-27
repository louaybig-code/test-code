import React, { useState } from 'react';
import { View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/Icon';
import { apiService } from '../../services/api';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';

/**
 * CreateWorkspaceSheet — port of web `WorkspaceSettingsModal`:
 * create a workspace inside the active org.
 */
export const CreateWorkspaceSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { activeOrg, loadEverything, setWorkspaces, selectWorkspace } = useAppState();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!activeOrg || !name.trim()) return;
    setCreating(true);
    try {
      const newWs = await apiService.createOrgWorkspace(activeOrg.id, { name: name.trim() });
      toast.success('Espace de travail créé !');
      setWorkspaces((prev) => [...prev, newWs]);
      setName('');
      selectWorkspace(newWs);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nouvel Espace de travail" autoHeight>
      <Input
        label="Nom de l'espace de travail"
        placeholder="Ex: Équipe Produit, Marketing, Dev Backend"
        icon={<Icon name="LayoutGrid" size={15} color={colors.textMuted} />}
        value={name}
        onChangeText={setName}
        containerStyle={{ marginTop: 8, marginBottom: 18 }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 8 }}>
        <Button variant="ghost" onPress={onClose}>Annuler</Button>
        <Button onPress={handleCreate} isLoading={creating}>Créer l'espace</Button>
      </View>
    </Sheet>
  );
};
