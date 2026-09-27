import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui/EmptyState';

interface WorkspaceScreenProps {
  onOpenCreateProject: () => void;
  onOpenTask: (taskId: string) => void;
}

/**
 * WorkspaceScreen — port of web App.tsx's workspace overview:
 * workspace header + project cards grid (+ "Nouveau projet" dashed card).
 */
export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({ onOpenCreateProject }) => {
  const { colors, isDark } = useTheme();
  const { activeWorkspace, projects, selectProject, ownedOrgIds, activeOrg, loadEverything } = useAppState();
  const [refreshing, setRefreshing] = React.useState(false);

  if (!activeWorkspace) return null;
  const owned = activeOrg ? ownedOrgIds.has(activeOrg.id) : false;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
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
      {/* workspace header */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? '#1C2033' : '#FFFFFF', borderColor: isDark ? '#2E3450' : '#DDE1E9' }]}>
        <Text style={[styles.wsName, { color: isDark ? '#E8EAF0' : '#2C3147' }]}>{activeWorkspace.name}</Text>
        <Text style={{ fontSize: 12.5, color: '#6B7280', fontFamily: FONT.inter.regular, marginTop: 4 }}>
          Espace de travail · {projects.length} projet{projects.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: isDark ? '#E8EAF0' : '#2C3147' }]}>Projets</Text>

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
          {projects.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => selectProject(p)}
              style={[styles.card, { backgroundColor: isDark ? '#1C2033' : '#FFFFFF', borderColor: isDark ? '#2E3450' : '#DDE1E9' }]}
            >
              <View style={[styles.tile, { backgroundColor: BRAND.orange15 }]}>
                <Icon name="FolderKanban" size={18} color={BRAND.orange} />
              </View>
              <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
                <Text numberOfLines={1} style={[styles.cardName, { color: isDark ? '#E8EAF0' : '#1C2033' }]}>{p.name}</Text>
                {!!p.description && (
                  <Text numberOfLines={1} style={{ fontSize: 11.5, color: '#6B7280', fontFamily: FONT.inter.regular, marginTop: 2 }}>
                    {p.description}
                  </Text>
                )}
              </View>
              <Icon name="ArrowRight" size={18} color={BRAND.teal} />
            </Pressable>
          ))}

          {owned && (
            <Pressable
              onPress={onOpenCreateProject}
              style={[styles.card, styles.dashed, { borderColor: isDark ? '#2E3450' : '#DDE1E9' }]}
            >
              <View style={[styles.tile, { backgroundColor: isDark ? '#252A3D' : '#EEF0F4' }]}>
                <Text style={{ color: BRAND.orange, fontSize: 20, fontFamily: FONT.sora.bold }}>+</Text>
              </View>
              <Text style={{ marginLeft: 14, color: '#6B7280', fontSize: 14, fontFamily: FONT.inter.bold }}>Nouveau projet</Text>
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
    paddingBottom: 40,
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
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: 16,
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
});
