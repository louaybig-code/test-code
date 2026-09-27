import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Sheet } from '../../components/ui/Sheet';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiService } from '../../services/api';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';

type Tab = 'profile' | 'notifications';

/**
 * ProfileScreen — port of web `ProfileSettingsModal` (Profil / Notifications tabs)
 * + mobile additions: theme toggle and logout at the bottom (web has them in the
 * sidebar footer, which on mobile lives here + in the drawer).
 */
export const ProfileScreen: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, refetchUser, logout } = useAuth();

  const [tab, setTab] = useState<Tab>('profile');

  // profile form
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // notifications
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      if (user.notificationSettings) {
        setNotifInApp(user.notificationSettings.inApp);
        setNotifEmail(user.notificationSettings.email);
        setNotifPush(user.notificationSettings.push);
      }
    }
  }, [visible, user]);

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setAvatarFile({
        uri: a.uri,
        name: a.fileName ?? 'avatar.jpg',
        type: a.mimeType ?? 'image/jpeg',
      });
    }
  };

  const onSaveProfile = async () => {
    setSavingProfile(true);
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        if (firstName) formData.append('firstName', firstName);
        if (lastName) formData.append('lastName', lastName);
        await apiService.updateMe(formData as any);
        setAvatarFile(null);
      } else {
        await apiService.updateMe({ firstName, lastName });
      }
      toast.success('Profil mis à jour !');
      await refetchUser();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Renseignez les deux champs');
      return;
    }
    setSavingPassword(true);
    try {
      await apiService.updatePassword({ currentPassword, newPassword });
      toast.success('Mot de passe modifié avec succès !');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la modification du mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  const onSaveNotifications = async () => {
    try {
      await apiService.updateNotificationSettings({ inApp: notifInApp, email: notifEmail, push: notifPush });
      toast.success('Préférences de notification enregistrées');
      await refetchUser();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Paramètres du compte" heightFraction={0.85}>
      {/* tabs */}
      <View style={styles.tabsRow}>
        {(
          [
            { id: 'profile', label: 'Profil', icon: 'User' },
            { id: 'notifications', label: 'Notifications', icon: 'Bell' },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tabBtn, active && { borderBottomColor: '#8B5CF6' }]}>
              <Icon name={t.icon as any} size={13} color={active ? '#8B5CF6' : colors.textMuted} />
              <Text style={[styles.tabLabel, { color: active ? '#8B5CF6' : colors.textMuted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === 'profile' && (
          <View>
            {/* avatar block */}
            <View style={[styles.cardBlock, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Avatar src={avatarFile?.uri ?? user?.avatarUrl} firstName={firstName} lastName={lastName} email={user?.email} size="lg" />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 12, fontFamily: FONT.inter.semibold, color: colors.text, marginBottom: 6 }}>Changer l'avatar</Text>
                <Pressable onPress={pickAvatar} style={[styles.pickBtn, { backgroundColor: '#7C3AED' }]}>
                  <Icon name="Paperclip" size={12} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11.5, fontFamily: FONT.inter.semibold }}>
                    {avatarFile ? 'Image sélectionnée ✓' : 'Choisir une image'}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 10.5, color: colors.textMuted, fontFamily: FONT.inter.regular, marginTop: 6 }}>
                  {user?.email}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 14, gap: 12 }}>
              <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
              <Input label="Nom" value={lastName} onChangeText={setLastName} />
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
              <Button size="sm" onPress={onSaveProfile} isLoading={savingProfile}>Enregistrer le profil</Button>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              <Icon name="Lock" size={12} color="#FB7185" /> Sécurité & Mot de passe
            </Text>
            <View style={{ gap: 12, marginTop: 10 }}>
              <Input label="Mot de passe actuel" secureTextEntry autoCapitalize="none" value={currentPassword} onChangeText={setCurrentPassword} />
              <Input label="Nouveau mot de passe" secureTextEntry autoCapitalize="none" value={newPassword} onChangeText={setNewPassword} />
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
              <Button size="sm" variant="danger" onPress={onChangePassword} isLoading={savingPassword}>Changer le mot de passe</Button>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* theme */}
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name={isDark ? 'Moon' : 'Sun'} size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: 12.5, fontFamily: FONT.inter.semibold, color: colors.text }}>
                  Thème — {isDark ? 'Sombre' : 'Clair'}
                </Text>
              </View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#D8DDED', true: BRAND.teal }} thumbColor="#fff" />
            </View>

            {/* logout */}
            <Pressable
              onPress={async () => {
                await logout();
                onClose();
              }}
              style={styles.logoutRow}
            >
              <Icon name="LogOut" size={14} color="#EF4444" />
              <Text style={{ fontSize: 13, fontFamily: FONT.inter.semibold, color: '#EF4444' }}>Déconnexion</Text>
            </Pressable>
          </View>
        )}

        {tab === 'notifications' && (
          <View>
            <View style={[styles.cardBlock, { backgroundColor: colors.surface2, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 14 }]}>
              {[
                { label: 'Notifications In-App (Centre de notification)', value: notifInApp, set: setNotifInApp },
                { label: 'Notifications Email (Assignations & Mentions)', value: notifEmail, set: setNotifEmail },
                { label: 'Notifications Push (Navigateur)', value: notifPush, set: setNotifPush },
              ].map(({ label, value, set }) => (
                <View key={label} style={styles.rowBetween}>
                  <Text style={{ flex: 1, fontSize: 12.5, fontFamily: FONT.inter.semibold, color: colors.text, paddingRight: 10 }}>{label}</Text>
                  <Switch value={value} onValueChange={set} trackColor={{ false: '#454D6A', true: BRAND.teal }} thumbColor="#fff" />
                </View>
              ))}
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: 14 }}>
              <Button size="sm" onPress={onSaveNotifications}>Enregistrer les préférences</Button>
            </View>
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120,130,160,0.2)',
    marginBottom: 14,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 9,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: FONT.inter.bold,
  },
  cardBlock: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: 'center',
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONT.inter.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    alignSelf: 'center',
    paddingVertical: 10,
  },
});
