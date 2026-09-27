import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { Pressable } from 'react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { Sheet } from '../../components/ui/Sheet';
import { apiService } from '../../services/api';
import { toast } from '../../components/toast';
import { Organization } from '../../types';

/**
 * OrgsHomeScreen — port of web `features/dashboard/AllOrganizationsView.tsx`:
 * the organisation cards grid with owned/invited state, delete-with-confirm,
 * and the "Nouvelle organisation" call-to-action card.
 */
export const OrgsHomeScreen: React.FC<{ onOpenCreateOrg: () => void }> = ({ onOpenCreateOrg }) => {
  const { colors, isDark } = useTheme();
  const { organizations, ownedOrgIds, selectOrg, setOrganizations, setOwnedOrgIds, activeOrg, bootstrapDone, loadEverything } = useAppState();
  const [confirmDelete, setConfirmDelete] = React.useState<Organization | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEverything();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await apiService.deleteOrganization(confirmDelete.id);
      setOrganizations((orgs) => orgs.filter((o) => o.id !== confirmDelete.id));
      setOwnedOrgIds((prev) => {
        const next = new Set(prev);
        next.delete(confirmDelete.id);
        return next;
      });
      toast.success('Organisation supprimée');
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Impossible de supprimer cette organisation');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8531A" colors={['#E8531A']} />}
      >
        <View style={styles.headingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heading, { color: colors.text }]}>Organisations</Text>
            <Text style={[styles.subheading, { color: colors.textMuted }]}>
              {organizations.length} organisation{organizations.length !== 1 ? 's' : ''} — vos espaces de travail
            </Text>
          </View>
        </View>

        {organizations.length === 0 && bootstrapDone ? (
          <EmptyState
            icon="Building2"
            title="Aucune organisation"
            description="Créez votre première organisation pour commencer à gérer vos projets."
            actionLabel="Créer une organisation"
            onAction={onOpenCreateOrg}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {organizations.map((org) => {
              const owned = ownedOrgIds.has(org.id);
              return (
                <Pressable
                  key={org.id}
                  onPress={() => selectOrg(org)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDark ? '#1C2033' : colors.surface,
                      borderColor: isDark ? '#2E3450' : '#DDE1E9',
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View style={[styles.initTile, { backgroundColor: BRAND.teal15 }]}>
                    <Text style={styles.initLetter}>{(org.name?.[0] ?? 'O').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text numberOfLines={1} style={[styles.cardTitle, { color: isDark ? '#E8EAF0' : '#1C2033' }]}>
                        {org.name}
                      </Text>
                      {!owned && (
                        <View style={styles.invitedPill}>
                          <Text style={styles.invitedText}>Invité</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardSub, { color: '#6B7280' }]}>Organisation</Text>
                  </View>
                  {owned && (
                    <Pressable onPress={() => setConfirmDelete(org)} hitSlop={10} style={styles.trashBtn}>
                      <Icon name="Trash2" size={16} color="#EF4444" />
                    </Pressable>
                  )}
                  <Icon name="ArrowRight" size={18} color={BRAND.teal} style={{ marginLeft: 10 }} />
                </Pressable>
              );
            })}

            {/* dashed new-org card */}
            <Pressable
              onPress={onOpenCreateOrg}
              style={[
                styles.card,
                styles.dashed,
                { borderColor: isDark ? '#2E3450' : '#DDE1E9' },
              ]}
            >
              <View style={[styles.initTile, { backgroundColor: isDark ? '#252A3D' : '#EEF0F4' }]}>
                <Text style={styles.plusLetter}>+</Text>
              </View>
              <Text style={[styles.cardTitle, { color: '#6B7280', marginLeft: 14 }]}>Nouvelle organisation</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* delete confirmation */}
      <Sheet visible={!!confirmDelete} onClose={() => setConfirmDelete(null)} autoHeight>
        <View style={{ paddingBottom: 16 }}>
          <View style={styles.confirmIconWrap}>
            <Icon name="AlertTriangle" size={26} color="#EF4444" />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>Supprimer l'organisation ?</Text>
          <Text style={[styles.confirmBody, { color: colors.textMuted }]}>
            « {confirmDelete?.name} » ainsi que ses espaces de travail, projets et tâches seront définitivement supprimés. Cette action est irréversible.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <Pressable onPress={() => setConfirmDelete(null)} style={[styles.confirmBtn, { backgroundColor: colors.surface2 }]} disabled={deleting}>
              <Text style={{ color: colors.textSecondary, fontFamily: FONT.inter.semibold, fontSize: 13 }}>Annuler</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={[styles.confirmBtn, { backgroundColor: '#EF4444' }]} disabled={deleting}>
              <Text style={{ color: '#fff', fontFamily: FONT.inter.semibold, fontSize: 13 }}>
                {deleting ? 'Suppression…' : 'Supprimer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  heading: {
    fontSize: 22,
    fontFamily: FONT.sora.bold,
  },
  subheading: {
    fontSize: 12.5,
    fontFamily: FONT.inter.regular,
    marginTop: 3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: 16,
  },
  dashed: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    justifyContent: 'flex-start',
  },
  initTile: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initLetter: {
    fontSize: 20,
    fontFamily: FONT.sora.bold,
    color: BRAND.teal,
  },
  plusLetter: {
    fontSize: 24,
    fontFamily: FONT.sora.bold,
    color: BRAND.orange,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONT.inter.bold,
    flexShrink: 1,
  },
  cardSub: {
    fontSize: 11.5,
    fontFamily: FONT.inter.regular,
    marginTop: 3,
  },
  invitedPill: {
    backgroundColor: BRAND.teal15,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  invitedText: {
    color: BRAND.teal,
    fontSize: 9.5,
    fontFamily: FONT.inter.semibold,
  },
  trashBtn: {
    padding: 6,
  },
  confirmIconWrap: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239,68,68,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 16,
    fontFamily: FONT.sora.bold,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 12.5,
    fontFamily: FONT.inter.regular,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
