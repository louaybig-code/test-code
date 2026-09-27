import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FieldSelect } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Icon } from '../../components/Icon';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { OrganizationMember } from '../../types';

type Tab = 'create' | 'members';

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Owner', color: '#EAB308' },
  { value: 'ADMIN', label: 'Admin', color: '#3B82F6' },
  { value: 'MEMBER', label: 'Member', color: '#1A8C8C' },
  { value: 'GUEST', label: 'Guest', color: '#8890A8' },
  { value: 'CLIENT', label: 'Client', color: '#A855F7' },
];

interface OrgSettingsSheetProps {
  visible: boolean;
  defaultTab?: Tab;
  onClose: () => void;
}

/**
 * OrgSettingsSheet — port of web `OrgSettingsModal` (create-org + members tabs).
 */
export const OrgSettingsSheet: React.FC<OrgSettingsSheetProps> = ({ visible, defaultTab = 'create', onClose }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { activeOrg, organizations, setOrganizations, selectOrg, loadEverything } = useAppState();

  const hasOrg = Boolean(activeOrg);
  const [tab, setTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    if (visible) setTab(defaultTab ?? (hasOrg ? 'members' : 'create'));
  }, [visible, defaultTab]);

  // ── create org ──
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    setCreating(true);
    try {
      const newOrg = await apiService.createOrganization({ name: orgName.trim() });
      toast.success('Organisation créée !');
      setOrganizations((prev) => [...prev, newOrg]);
      setOrgName('');
      selectOrg(newOrg);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  // ── members ──
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const loadMembers = async () => {
    if (!activeOrg) return;
    setLoadingMembers(true);
    try {
      const list = await apiService.getOrgMembers(activeOrg.id);
      setMembers(list ?? []);
    } catch {
      toast.error('Échec du chargement des membres');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (visible && tab === 'members' && activeOrg) loadMembers();
  }, [visible, tab, activeOrg?.id]);

  const handleChangeRole = async (member: OrganizationMember, newRole: string) => {
    if (!activeOrg) return;
    const userId = member.userId || member.user?.id;
    if (!userId) return;
    try {
      await apiService.setMemberRoles(activeOrg.id, userId, newRole as any);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole as OrganizationMember['role'] } : m)));
      toast.success('Rôle mis à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleRemove = async (member: OrganizationMember) => {
    if (!activeOrg) return;
    const userId = member.userId || member.user?.id;
    if (!userId) {
      toast.error('Impossible de supprimer ce membre');
      return;
    }
    setRemovingId(member.id);
    try {
      await apiService.deleteOrgMember(activeOrg.id, userId);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success('Membre retiré');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={activeOrg ? `Organisation · ${activeOrg.name}` : 'Organisation'}
      autoHeight
    >
      {/* tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        {(
          [
            { id: 'create', label: 'New Org', icon: 'Building2', disabled: false },
            { id: 'members', label: 'Members', icon: 'Users', disabled: !hasOrg },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              disabled={t.disabled}
              onPress={() => setTab(t.id)}
              style={[styles.tab, active && { backgroundColor: BRAND.orange }, t.disabled && { opacity: 0.4 }]}
            >
              <Icon name={t.icon as any} size={13} color={active ? '#fff' : colors.textMuted} />
              <Text style={[styles.tabText, { color: active ? '#fff' : colors.textMuted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'create' && (
        <View style={{ paddingBottom: 8 }}>
          <Input
            label="Organisation name"
            placeholder="e.g. Acronym Inc, Studio Design"
            icon={<Icon name="Building2" size={15} color={colors.textMuted} />}
            value={orgName}
            onChangeText={setOrgName}
            containerStyle={{ marginBottom: 16, marginTop: 8 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingBottom: 12 }}>
            <Button variant="ghost" onPress={onClose}>Annuler</Button>
            <Button onPress={handleCreate} isLoading={creating}>Create Organisation</Button>
          </View>
        </View>
      )}

      {tab === 'members' && activeOrg && (
        <View style={{ paddingBottom: 8, maxHeight: 420 }}>
          {loadingMembers ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Spinner size={22} color={BRAND.orange} />
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(m) => m.id}
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              nestedScrollEnabled
              renderItem={({ item: m }) => {
                const displayName = m.user
                  ? [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email || 'Inconnu'
                  : m.userId || 'Inconnu';
                const isSelf =
                  !!user &&
                  ((m.userId && m.userId === user.id) || (m.user?.id && m.user.id === user.id) || (m.user?.email && m.user.email === user.email));
                const isConfirming = confirmRemoveId === m.id;
                return (
                  <View
                    style={[
                      styles.memberRow,
                      {
                        backgroundColor: colors.surface2,
                        borderColor: isConfirming ? 'rgba(244,63,94,0.4)' : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={styles.memberAvatar}>
                        <Text style={{ color: BRAND.orange, fontFamily: FONT.inter.bold, fontSize: 11 }}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[styles.memberName, { color: colors.text }]}>
                          {displayName}
                          {isSelf && <Text style={{ color: BRAND.teal, fontSize: 10 }}> (vous)</Text>}
                        </Text>
                        {!!m.user?.email && (
                          <Text numberOfLines={1} style={{ fontSize: 11, color: colors.textMuted }}>{m.user.email}</Text>
                        )}
                      </View>
                      {!isSelf && (
                        <Pressable
                          onPress={() => setConfirmRemoveId(isConfirming ? null : m.id)}
                          hitSlop={6}
                          style={{ padding: 4 }}
                          disabled={removingId === m.id}
                        >
                          {removingId === m.id ? (
                            <Spinner size={13} color="#EF4444" />
                          ) : (
                            <Icon name="Trash2" size={14} color="#FB7185" />
                          )}
                        </Pressable>
                      )}
                    </View>

                    {isConfirming && (
                      <View style={styles.confirmStrip}>
                        <Text style={{ color: '#FB7185', fontSize: 11.5, fontFamily: FONT.inter.semibold }}>
                          Retirer {displayName} de l'organisation ?
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <Pressable onPress={() => handleRemove(m)} style={[styles.smallBtn, { backgroundColor: '#DC2626' }]}>
                            <Text style={styles.smallBtnText}>Oui, retirer</Text>
                          </Pressable>
                          <Pressable onPress={() => setConfirmRemoveId(null)} style={[styles.smallBtn, { backgroundColor: colors.surface3 }]}>
                            <Text style={[styles.smallBtnText, { color: colors.textMuted }]}>Annuler</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {!isConfirming && !isSelf && (
                      <FieldSelect
                        value={m.role}
                        options={ROLE_OPTIONS}
                        onChange={(v) => handleChangeRole(m, v)}
                        compact
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: colors.textMuted, paddingVertical: 24, fontFamily: FONT.inter.regular }}>
                  No members yet.
                </Text>
              }
            />
          )}
          <Text style={{ textAlign: 'right', fontSize: 11, color: colors.textMuted, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            {members.length} membre{members.length !== 1 ? 's' : ''} dans cette organisation
          </Text>
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 4,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  tabText: {
    fontSize: 12,
    fontFamily: FONT.inter.semibold,
  },
  memberRow: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 12,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(232,83,26,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 12.5,
    fontFamily: FONT.inter.semibold,
  },
  confirmStrip: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244,63,94,0.2)',
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONT.inter.semibold,
  },
});
