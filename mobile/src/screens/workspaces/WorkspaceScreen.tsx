import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiService } from '../../services/api';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui/EmptyState';

interface WorkspaceScreenProps {
  onOpenCreateProject: () => void;
  onOpenTask: (taskId: string) => void;
}

/**
 * WorkspaceScreen — port of web App.tsx's workspace overview, INCLUDING the
 * edit tools: rename / delete workspace (type-name confirmation) and
 * inline rename / delete on every project card (same as the web).
 */
export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({ onOpenCreateProject }) => {
  const { colors, isDark } = useTheme();
  const {
    activeWorkspace,
    projects,
    selectProject,
    selectWorkspace,
    selectOrg,
    ownedOrgIds,
    activeOrg,
    setWorkspaces,
    setProjects,
    loadEverything,
  } = useAppState();

  const [refreshing, setRefreshing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // ── workspace rename / delete state (web: editingWsId / deletingWsId) ──
  const [editingWs, setEditingWs] = React.useState(false);
  const [wsName, setWsName] = React.useState('');
  const [deletingWs, setDeletingWs] = React.useState(false);
  const [wsConfirm, setWsConfirm] = React.useState('');

  // ── project rename / delete state (web: editingProjId / deletingProjId) ──
  const [editingProjId, setEditingProjId] = React.useState<string | null>(null);
  const [projName, setProjName] = React.useState('');
  const [deletingProjId, setDeletingProjId] = React.useState<string | null>(null);
  const [projConfirm, setProjConfirm] = React.useState('');

  if (!activeWorkspace) return null;
  const owned = activeOrg ? ownedOrgIds.has(activeOrg.id) : false;

  const shell = {
    cardBg: isDark ? '#1C2033' : '#FFFFFF',
    cardBorder: isDark ? '#2E3450' : '#DDE1E9',
    fieldBg: isDark ? '#252A3D' : '#EEF0F4',
    text: isDark ? '#E8EAF0' : '#1C2033',
    muted: '#6B7280',
  };

  // ── Workspace rename ──────────────────────────────────────────────────────
  const handleRenameWs = async () => {
    if (!wsName.trim() || busy) return;
    setBusy(true);
    try {
      const updated = await apiService.updateWorkspace(activeWorkspace.id, { name: wsName.trim() });
      setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
      selectWorkspace({ ...activeWorkspace, ...updated } as any);
      toast.success('Espace renommé');
      setEditingWs(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  // ── Workspace delete (type name to confirm, same as web) ──────────────────
  const handleDeleteWs = async () => {
    if (wsConfirm !== activeWorkspace.name || busy) return;
    setBusy(true);
    try {
      await apiService.deleteWorkspace(activeWorkspace.id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== activeWorkspace.id));
      toast.success('Espace supprimé');
      setDeletingWs(false);
      // web: back to the org overview
      if (activeOrg) selectOrg(activeOrg);
      else await loadEverything();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  // ── Project rename ────────────────────────────────────────────────────────
  const handleRenameProj = async (projectId: string) => {
    if (!projName.trim() || busy) return;
    setBusy(true);
    try {
      const updated = await apiService.updateProject(projectId, { name: projName.trim() });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      toast.success('Projet renommé');
      setEditingProjId(null);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  // ── Project delete ────────────────────────────────────────────────────────
  const handleDeleteProj = async (projectId: string, name: string) => {
    if (projConfirm !== name || busy) return;
    setBusy(true);
    try {
      await apiService.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast.success('Projet supprimé');
      setDeletingProjId(null);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadEverything();
            setRefreshing(false);
          }}
          tintColor="#E8531A"
          colors={['#E8531A']}
        />
      }
    >
      {/* ── workspace header card (rename + delete — web parity) ── */}
      <View style={[styles.headerCard, { backgroundColor: shell.cardBg, borderColor: shell.cardBorder }]}>
        {editingWs ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              autoFocus
              value={wsName}
              onChangeText={setWsName}
              onSubmitEditing={handleRenameWs}
              placeholder="Nom de l'espace"
              placeholderTextColor={shell.muted}
              style={[styles.nameInput, { backgroundColor: shell.fieldBg, color: shell.text, borderColor: BRAND.teal }]}
            />
            <Pressable onPress={handleRenameWs} disabled={busy} style={[styles.miniBtn, { backgroundColor: BRAND.orange }]}>
              <Icon name="Check" size={14} color="#fff" strokeWidth={2.6} />
            </Pressable>
            <Pressable onPress={() => setEditingWs(false)} style={[styles.miniBtn, { backgroundColor: shell.fieldBg }]}>
              <Icon name="X" size={14} color={shell.muted} />
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={[styles.wsName, { color: shell.text }]}>{activeWorkspace.name}</Text>
            <Text style={{ fontSize: 12.5, color: shell.muted, fontFamily: FONT.inter.regular, marginTop: 4 }}>
              Espace de travail · {projects.length} projet{projects.length !== 1 ? 's' : ''}
            </Text>
            {owned && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Pressable
                  onPress={() => {
                    setEditingWs(true);
                    setWsName(activeWorkspace.name);
                    setDeletingWs(false);
                    setWsConfirm('');
                  }}
                  style={[styles.toolBtn, { backgroundColor: shell.fieldBg }]}
                >
                  <Icon name="Pencil" size={12} color={shell.muted} />
                  <Text style={[styles.toolBtnText, { color: shell.muted }]}>Renommer</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDeletingWs(true);
                    setWsConfirm('');
                    setEditingWs(false);
                  }}
                  style={[styles.toolBtn, styles.dangerBtn]}
                >
                  <Icon name="Trash2" size={12} color="#F87171" />
                  <Text style={[styles.toolBtnText, { color: '#F87171' }]}>Supprimer</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {deletingWs && !editingWs && (
          <View style={styles.dangerZone}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="Trash2" size={14} color="#F87171" />
              <Text style={{ flex: 1, fontSize: 12, color: '#FCA5A5', fontFamily: FONT.inter.regular }}>
                Tapez « {activeWorkspace.name} » pour confirmer la suppression :
              </Text>
            </View>
            <TextInput
              value={wsConfirm}
              onChangeText={setWsConfirm}
              placeholder={activeWorkspace.name}
              placeholderTextColor={shell.muted}
              autoCapitalize="none"
              style={[styles.confirmInput, { backgroundColor: shell.fieldBg, color: shell.text }]}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setDeletingWs(false)} style={[styles.toolBtn, { backgroundColor: shell.fieldBg }]}>
                <Text style={[styles.toolBtnText, { color: shell.muted }]}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteWs}
                disabled={wsConfirm !== activeWorkspace.name || busy}
                style={[styles.toolBtn, { backgroundColor: '#DC2626', opacity: wsConfirm !== activeWorkspace.name ? 0.4 : 1 }]}
              >
                <Text style={[styles.toolBtnText, { color: '#fff' }]}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: shell.text }]}>Projets</Text>

      {projects.length === 0 ? (
        <EmptyState
          icon="FolderKanban"
          title="Aucun projet"
          description="Créez votre premier projet dans cet espace pour commencer."
          actionLabel="Nouveau projet"
          onAction={onOpenCreateProject}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {projects.map((p) =>
            editingProjId === p.id ? (
              /* ── inline rename form (web parity) ── */
              <View key={p.id} style={[styles.card, { backgroundColor: shell.cardBg, borderColor: BRAND.teal }]}>
                <TextInput
                  autoFocus
                  value={projName}
                  onChangeText={setProjName}
                  onSubmitEditing={() => handleRenameProj(p.id)}
                  placeholderTextColor={shell.muted}
                  style={[styles.projInput, { backgroundColor: shell.fieldBg, color: shell.text }]}
                />
                <Pressable onPress={() => handleRenameProj(p.id)} disabled={busy} style={[styles.miniBtn, { backgroundColor: BRAND.orange }]}>
                  <Icon name="Check" size={14} color="#fff" strokeWidth={2.6} />
                </Pressable>
                <Pressable onPress={() => setEditingProjId(null)} style={[styles.miniBtn, { backgroundColor: shell.fieldBg }]}>
                  <Icon name="X" size={14} color={shell.muted} />
                </Pressable>
              </View>
            ) : deletingProjId === p.id ? (
              /* ── inline delete confirm (web parity: type the name) ── */
              <View key={p.id} style={[styles.card, styles.deleteCard, { backgroundColor: shell.cardBg }]}>
                <Text style={{ fontSize: 12, color: '#FCA5A5', fontFamily: FONT.inter.regular }}>
                  Tapez « {p.name} » pour confirmer :
                </Text>
                <TextInput
                  value={projConfirm}
                  onChangeText={setProjConfirm}
                  placeholder={p.name}
                  placeholderTextColor={shell.muted}
                  autoCapitalize="none"
                  style={[styles.confirmInput, { backgroundColor: shell.fieldBg, color: shell.text }]}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => setDeletingProjId(null)} style={[styles.toolBtn, { backgroundColor: shell.fieldBg }]}>
                    <Text style={[styles.toolBtnText, { color: shell.muted }]}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteProj(p.id, p.name)}
                    disabled={projConfirm !== p.name || busy}
                    style={[styles.toolBtn, { backgroundColor: '#DC2626', opacity: projConfirm !== p.name ? 0.4 : 1 }]}
                  >
                    <Text style={[styles.toolBtnText, { color: '#fff' }]}>Supprimer</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* ── normal project card + edit tools ── */
              <View key={p.id} style={[styles.card, { backgroundColor: shell.cardBg, borderColor: shell.cardBorder }]}>
                <Pressable onPress={() => selectProject(p)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 }}>
                  <View style={[styles.tile, { backgroundColor: BRAND.orange15 }]}>
                    <Icon name="FolderKanban" size={18} color={BRAND.orange} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[styles.cardName, { color: shell.text }]}>{p.name}</Text>
                    {!!p.description && (
                      <Text numberOfLines={1} style={{ fontSize: 11.5, color: shell.muted, fontFamily: FONT.inter.regular, marginTop: 2 }}>
                        {p.description}
                      </Text>
                    )}
                  </View>
                </Pressable>
                {owned && (
                  <Pressable
                    onPress={() => {
                      setEditingProjId(p.id);
                      setProjName(p.name);
                      setDeletingProjId(null);
                    }}
                    hitSlop={8}
                    style={[styles.miniBtn, { backgroundColor: shell.fieldBg }]}
                  >
                    <Icon name="Pencil" size={13} color={shell.muted} />
                  </Pressable>
                )}
                {owned && (
                  <Pressable
                    onPress={() => {
                      setDeletingProjId(p.id);
                      setProjConfirm('');
                      setEditingProjId(null);
                    }}
                    hitSlop={8}
                    style={[styles.miniBtn, { backgroundColor: 'rgba(220,38,38,0.10)' }]}
                  >
                    <Icon name="Trash2" size={13} color="#F87171" />
                  </Pressable>
                )}
                <Pressable onPress={() => selectProject(p)} hitSlop={8} style={{ paddingLeft: 6 }}>
                  <Icon name="ArrowRight" size={18} color={BRAND.teal} />
                </Pressable>
              </View>
            )
          )}

          {owned && (
            <Pressable
              onPress={onOpenCreateProject}
              style={[styles.card, styles.dashed, { borderColor: shell.cardBorder }]}
            >
              <View style={[styles.tile, { backgroundColor: shell.fieldBg }]}>
                <Text style={{ color: BRAND.orange, fontSize: 20, fontFamily: FONT.sora.bold }}>+</Text>
              </View>
              <Text style={{ marginLeft: 14, color: shell.muted, fontSize: 14, fontFamily: FONT.inter.bold }}>Nouveau projet</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: 18,
    paddingBottom: 100,
  },
  headerCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  wsName: {
    fontSize: 22,
    fontFamily: FONT.sora.bold,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONT.inter.bold,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: 16,
  },
  deleteCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    borderColor: 'rgba(220,38,38,0.35)',
  },
  dangerZone: {
    marginTop: 14,
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
  },
  dashed: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 15,
    fontFamily: FONT.inter.bold,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16,
    fontFamily: FONT.inter.bold,
  },
  projInput: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13.5,
    fontFamily: FONT.inter.semibold,
  },
  confirmInput: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    fontFamily: FONT.inter.regular,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.35)',
  },
  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  dangerBtn: {
    backgroundColor: 'rgba(220,38,38,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.22)',
  },
  toolBtnText: {
    fontSize: 11.5,
    fontFamily: FONT.inter.semibold,
  },
});
