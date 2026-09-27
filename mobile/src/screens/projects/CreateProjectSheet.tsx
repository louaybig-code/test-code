import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { FieldSelect } from '../../components/ui/Select';
import { Icon } from '../../components/Icon';
import { apiService } from '../../services/api';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Project } from '../../types';

interface InviteRow {
  id: number;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
}

/**
 * CreateProjectSheet — port of web `CreateProjectModal` (2 steps:
 * create project → invite collaborators by email).
 */
export const CreateProjectSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { activeWorkspace, setProjects, selectProject } = useAppState();

  const [step, setStep] = useState<'create' | 'invite'>('create');
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [invites, setInvites] = useState<InviteRow[]>([{ id: 1, email: '', role: 'MEMBER' }]);
  const [sending, setSending] = useState(false);

  const resetAll = () => {
    setStep('create');
    setCreatedProject(null);
    setName('');
    setDescription('');
    setInvites([{ id: 1, email: '', role: 'MEMBER' }]);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleCreate = async () => {
    if (!activeWorkspace) {
      toast.error('Aucun espace de travail sélectionné');
      return;
    }
    if (!name.trim()) return;
    setCreating(true);
    try {
      const proj = await apiService.createProject(activeWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Projet créé !');
      setCreatedProject(proj);
      setProjects((prev) => [...prev, proj]);
      setStep('invite');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du projet');
    } finally {
      setCreating(false);
    }
  };

  const addRow = () => setInvites((prev) => [...prev, { id: Date.now(), email: '', role: 'MEMBER' }]);
  const removeRow = (id: number) => setInvites((prev) => prev.filter((r) => r.id !== id));
  const updateRow = (id: number, field: 'email' | 'role', value: string) =>
    setInvites((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const handleSendInvites = async () => {
    if (!createdProject) return;
    const valid = invites.filter((r) => r.email.trim().includes('@'));
    if (valid.length === 0) {
      handleClose();
      return;
    }
    setSending(true);
    let count = 0;
    for (const row of valid) {
      try {
        await apiService.inviteProjectMember(createdProject.id, { email: row.email.trim(), role: row.role });
        count++;
      } catch {
        toast.error(`Erreur pour ${row.email}`);
      }
    }
    setSending(false);
    if (count > 0) toast.success(`${count} invitation${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''} !`);
    if (createdProject) selectProject(createdProject);
    handleClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={step === 'create' ? 'Nouveau Projet' : 'Inviter des collaborateurs'}
      autoHeight
    >
      {/* progress indicator (violet, like web) */}
      <View style={styles.stepsRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {step === 'invite' ? (
            <Icon name="CheckCircle2" size={13} color="#10B981" />
          ) : (
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
          )}
          <Text style={[styles.stepLabel, { color: step === 'create' ? '#8B5CF6' : '#10B981' }]}>Créer le projet</Text>
        </View>
        <Icon name="ArrowRight" size={12} color={colors.textMuted} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={[styles.stepBadge, step !== 'invite' && { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]}>
            <Text style={[styles.stepBadgeText, step !== 'invite' && { color: isDark ? '#94A3B8' : '#475569' }]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, { color: step === 'invite' ? '#8B5CF6' : colors.textMuted }]}>Inviter</Text>
        </View>
      </View>

      {step === 'create' ? (
        <View style={{ paddingBottom: 8 }}>
          <Input
            label="Nom du projet"
            placeholder="Ex: Refonte Site Web, Application Mobile V2"
            icon={<Icon name="Folder" size={15} color="#8B5CF6" />}
            value={name}
            onChangeText={setName}
            containerStyle={{ marginBottom: 14 }}
          />
          <Textarea
            label="Description (optionnel)"
            placeholder="Objectifs et périmètre du projet..."
            value={description}
            onChangeText={setDescription}
            containerStyle={{ marginBottom: 16 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 8 }}>
            <Button variant="ghost" onPress={handleClose}>Annuler</Button>
            <Button onPress={handleCreate} isLoading={creating}>Créer & Continuer</Button>
          </View>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
          {createdProject && (
            <View style={styles.successBanner}>
              <Icon name="CheckCircle2" size={15} color="#10B981" />
              <Text style={{ flex: 1, color: '#10B981', fontSize: 12, fontFamily: FONT.inter.regular }}>
                Projet <Text style={{ fontFamily: FONT.inter.bold }}>« {createdProject.name} »</Text> créé avec succès.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>Inviter par email</Text>
            <Pressable onPress={addRow} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="UserPlus" size={12} color="#8B5CF6" />
              <Text style={{ color: '#8B5CF6', fontSize: 12, fontFamily: FONT.inter.semibold }}>Ajouter</Text>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            {invites.map((row) => (
              <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="collaborateur@domaine.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={row.email}
                    onChangeText={(v) => updateRow(row.id, 'email', v)}
                    inputStyle={{ fontSize: 12.5, paddingVertical: 9 }}
                  />
                </View>
                <View style={{ width: 110 }}>
                  <FieldSelect
                    value={row.role}
                    onChange={(v) => updateRow(row.id, 'role', v)}
                    options={[
                      { value: 'MEMBER', label: 'Membre' },
                      { value: 'ADMIN', label: 'Admin' },
                      { value: 'GUEST', label: 'Invité' },
                    ]}
                    compact
                  />
                </View>
                {invites.length > 1 && (
                  <Pressable onPress={() => removeRow(row.id)} hitSlop={8}>
                    <Icon name="X" size={13} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 18, paddingBottom: 12 }}>
            <Button variant="ghost" onPress={handleClose} disabled={sending}>Passer cette étape</Button>
            <Button onPress={handleSendInvites} isLoading={sending} icon={<Icon name="UserPlus" size={13} color="#fff" />}>
              Envoyer les invitations
            </Button>
          </View>
        </ScrollView>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  stepBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: FONT.inter.black,
  },
  stepLabel: {
    fontSize: 12,
    fontFamily: FONT.inter.semibold,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.20)',
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONT.inter.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#94A3B8',
  },
});
