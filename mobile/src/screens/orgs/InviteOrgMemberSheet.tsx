import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/Icon';
import { apiService } from '../../services/api';
import { useAppState } from '../../state/AppStateContext';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';

const ROLES: { value: any; label: string; icon: string }[] = [
  { value: 'OWNER', label: 'Owner', icon: 'Crown' },
  { value: 'ADMIN', label: 'Admin', icon: 'Shield' },
  { value: 'MEMBER', label: 'Member', icon: 'User' },
  { value: 'GUEST', label: 'Guest', icon: 'Eye' },
  { value: 'CLIENT', label: 'Client', icon: 'Briefcase' },
];

/**
 * InviteOrgMemberSheet — port of web `InviteOrgMemberModal`:
 * email input + 5-role grid + invite via POST /organizations/:id/invitations.
 */
export const InviteOrgMemberSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { activeOrg } = useAppState();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | 'CLIENT'>('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!activeOrg || !email.trim()) return;
    setSubmitting(true);
    try {
      await apiService.inviteOrgMember(activeOrg.id, { email: email.trim(), role });
      toast.success(`Invitation envoyée à ${email.trim()}`);
      setEmail('');
      setRole('MEMBER');
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Échec de l'envoi de l'invitation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Inviter un membre - ${activeOrg?.name ?? ''}`} autoHeight>
      <Input
        label="Adresse email"
        placeholder="colleague@company.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        containerStyle={{ marginTop: 8 }}
      />

      <Text style={styles.roleLabel}>Rôle</Text>
      <View style={styles.roleGrid}>
        {ROLES.map((r) => {
          const active = role === r.value;
          return (
            <Pressable
              key={r.value}
              onPress={() => setRole(r.value)}
              style={[
                styles.roleBtn,
                active
                  ? { borderColor: BRAND.teal, backgroundColor: BRAND.teal08 }
                  : { borderColor: colors.border, backgroundColor: colors.surface2 },
              ]}
            >
              <Icon name={r.icon as any} size={14} color={active ? BRAND.teal : colors.textMuted} />
              <Text style={{ fontSize: 10, fontFamily: FONT.inter.semibold, color: active ? BRAND.teal : colors.textSecondary }}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.helpText, { color: colors.textMuted }]}>
        Le membre recevra un email d'invitation avec les permissions du rôle sélectionné.
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingBottom: 8 }}>
        <Button variant="ghost" onPress={onClose}>Annuler</Button>
        <Button onPress={handleSubmit} isLoading={submitting} icon={<Icon name="UserPlus" size={15} color="#fff" />}>
          Envoyer l'invitation
        </Button>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  roleLabel: {
    fontSize: 11,
    fontFamily: FONT.inter.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  roleBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  helpText: {
    fontSize: 11,
    fontFamily: FONT.inter.regular,
    marginTop: 8,
  },
});
