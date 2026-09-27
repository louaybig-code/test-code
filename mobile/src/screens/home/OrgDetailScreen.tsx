import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Icon } from '../../components/Icon';

interface OrgDetailProps {
  onOpenInvite: () => void;
  onOpenOrgSettings: (tab: 'create' | 'members') => void;
  onOpenCreateWs: () => void;
}

/**
 * OrgDetailScreen — port of the web App.tsx "Single Org View": org header
 * with management actions (Invite / Members / Settings) and the workspace
 * cards grid incl. the dashed "Nouvel espace" card.
 */
export const OrgDetailScreen: React.FC<OrgDetailProps> = ({ onOpenInvite, onOpenOrgSettings, onOpenCreateWs }) => {
  const { colors, isDark } = useTheme();
  const { activeOrg, workspaces, selectWorkspace, ownedOrgIds, loadEverything } = useAppState();
  const [refreshing, setRefreshing] = React.useState(false);

  if (!activeOrg) return null;
  const owned = ownedOrgIds.has(activeOrg.id);

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
      {/* Org header card */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? '#1C2033' : '#FFFFFF', borderColor: isDark ? '#2E3450' : '#DDE1E9' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={[styles.orgName, { color: isDark ? '#E8EAF0' : '#2C3147' }]}>{activeOrg.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 12.5, color: '#6B7280', fontFamily: FONT.inter.regular }}>
                Organisation · {workspaces.length} espace{workspaces.length !== 1 ? 's' : ''} de travail
              </Text>
              {!owned && (
                <View style={styles.invitedPill}>
                  <Text style={styles.invitedText}>Invité</Text>
                </View>
              )}
            </View>
          </View>

          {owned && (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <HeaderAction
                icon="UserPlus"
                label="Inviter"
                bg={BRAND.teal08}
                border="rgba(26,140,140,0.20)"
                color={BRAND.teal}
                onPress={onOpenInvite}
              />
              <HeaderAction
                icon="Users"
                label="Membres"
                bg="rgba(139,92,246,0.10)"
                border="rgba(139,92,246,0.20)"
                color="#8B5CF6"
                onPress={() => onOpenOrgSettings('members')}
              />
              <HeaderAction
                icon="Settings"
                label="Paramètres"
                bg={isDark ? '#252A3D' : '#EEF0F4'}
                border="transparent"
                color={isDark ? '#8890A8' : '#6B7280'}
                onPress={() => onOpenOrgSettings('create')}
              />
            </View>
          )}
        </View>
      </View>

      {/* Workspaces */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#E8EAF0' : '#2C3147' }]}>Espaces de travail</Text>
      <View style={{ gap: 12 }}>
        {workspaces.map((ws) => (
          <Pressable
            key={ws.id}
            onPress={() => selectWorkspace(ws)}
            style={[styles.wsCard, { backgroundColor: isDark ? '#1C2033' : '#FFFFFF', borderColor: isDark ? '#2E3450' : '#DDE1E9' }]}
          >
            <View style={[styles.wsTile, { backgroundColor: BRAND.teal15 }]}>
              <Text style={{ color: BRAND.teal, fontSize: 19, fontFamily: FONT.sora.bold }}>{(ws.name?.[0] ?? 'W').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
              <Text numberOfLines={1} style={[styles.wsName, { color: isDark ? '#E8EAF0' : '#1C2033' }]}>{ws.name}</Text>
              <Text style={{ fontSize: 11.5, color: '#6B7280', fontFamily: FONT.inter.regular, marginTop: 2 }}>Espace de travail</Text>
            </View>
            <Icon name="ArrowRight" size={18} color={BRAND.teal} />
          </Pressable>
        ))}

        {owned && (
          <Pressable
            onPress={onOpenCreateWs}
            style={[styles.wsCard, { borderStyle: 'dashed', backgroundColor: 'transparent', borderColor: isDark ? '#2E3450' : '#DDE1E9' }]}
          >
            <View style={[styles.wsTile, { backgroundColor: isDark ? '#252A3D' : '#EEF0F4' }]}>
              <Text style={{ color: BRAND.orange, fontSize: 22, fontFamily: FONT.sora.bold }}>+</Text>
            </View>
            <Text style={{ marginLeft: 14, color: '#6B7280', fontSize: 14, fontFamily: FONT.inter.bold }}>Nouvel espace</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
};

const HeaderAction: React.FC<{ icon: string; label: string; bg: string; border: string; color: string; onPress: () => void }> = ({
  icon,
  label,
  bg,
  border,
  color,
  onPress,
}) => (
  <Pressable onPress={onPress} style={[styles.action, { backgroundColor: bg, borderColor: border }]}>
    <Icon name={icon as any} size={12} color={color} />
    <Text style={{ color, fontSize: 11.5, fontFamily: FONT.inter.semibold }}>{label}</Text>
  </Pressable>
);

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
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orgName: {
    fontSize: 22,
    fontFamily: FONT.sora.bold,
  },
  invitedPill: {
    backgroundColor: BRAND.teal15,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  invitedText: {
    color: BRAND.teal,
    fontSize: 10,
    fontFamily: FONT.inter.semibold,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONT.inter.bold,
    marginBottom: 12,
  },
  wsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: 16,
  },
  wsTile: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsName: {
    fontSize: 15,
    fontFamily: FONT.inter.bold,
  },
});
