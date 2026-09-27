import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { toast } from '../../components/toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/Icon';
import { FIXED, FONT, RADIUS } from '../../theme/tokens';
import { t } from '../../i18n';

type Mode = 'login' | 'register';

/**
 * AuthScreen — port of web `features/auth/AuthPages.tsx`.
 * Fixed deep-charcoal visual identity, tab switch Connexion/Inscription,
 * French zod validation messages, SSO buttons, demo button, invite-token support.
 */
export const AuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // register only
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // invitation
  const [inviteToken] = useState<string | null>(null); // deep-link ?invite= goes here
  const [inviteInfo, setInviteInfo] = useState<{ organizationName: string; inviterName: string; email: string } | null>(null);

  // form errors keyed by field (same messages as web zod schemas)
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!inviteToken) return;
    apiService
      .getInvitation(inviteToken)
      .then((inv: any) => {
        setInviteInfo({
          organizationName: inv.organizationName ?? 'Organisation',
          inviterName: inv.inviterName ?? '',
          email: inv.email ?? '',
        });
        if (inv.email) setEmail(inv.email);
        setMode('register');
      })
      .catch(() => {});
  }, [inviteToken]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
    if (!emailOk) e.email = 'Email invalide';
    if (password.length < 8) e.password = 'Minimum 8 caractères';
    if (mode === 'register') {
      if (firstName.trim().length < 2) e.firstName = 'Minimum 2 caractères';
      if (lastName.trim().length < 2) e.lastName = 'Minimum 2 caractères';
      if (confirmPassword !== password) e.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.toLowerCase(), password);
      } else {
        await register(email.toLowerCase(), password, firstName.trim(), lastName.trim());
      }
      if (inviteToken) {
        try {
          await apiService.acceptInvitationAuth(inviteToken);
        } catch { /* already accepted or expired — ignore */ }
      }
      toast.success('Bienvenue !');
    } catch (err: any) {
      toast.error(err.message || 'Échec de connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSSO = async (provider: 'google' | 'microsoft') => {
    try {
      const { url } = await apiService.ssoRedirect(provider);
      if (url) Linking.openURL(url);
      else toast.error('SSO indisponible');
    } catch (err: any) {
      toast.error(err.message || 'SSO indisponible');
    }
  };

  const handleDemo = async () => {
    setIsSubmitting(true);
    try {
      const n = Math.floor(1000 + Math.random() * 9000);
      const demoEmail = `demo.${n}@smash.app`;
      await register(demoEmail, 'demo1234!', 'Demo', 'User');
      toast.success('Compte démo créé !');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de créer le compte démo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: FIXED.authBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image source={require('../../../assets/studiopilot-white.png')} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Invite banner */}
            {inviteInfo && (
              <View style={styles.inviteBanner}>
                <Icon name="UserPlus" size={16} color="#1A8C8C" />
                <Text style={styles.inviteText}>
                  <Text style={{ fontFamily: FONT.inter.bold }}>{inviteInfo.inviterName}</Text> vous invite à rejoindre{' '}
                  <Text style={{ fontFamily: FONT.inter.bold }}>{inviteInfo.organizationName}</Text>
                </Text>
              </View>
            )}

            {/* Mode tabs */}
            <View style={styles.tabs}>
              {(['login', 'register'] as Mode[]).map((m) => {
                const active = mode === m;
                return (
                  <Pressable key={m} onPress={() => { setMode(m); setErrors({}); }} style={[styles.tab, active && styles.tabActive]}>
                    <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                      {m === 'login' ? 'Connexion' : 'Inscription'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.heading}>
              {mode === 'login' ? 'Ravi de vous revoir' : 'Créer votre compte'}
            </Text>
            <Text style={styles.subheading}>
              {mode === 'login'
                ? 'Connectez-vous pour accéder à vos projets.'
                : 'Rejoignez votre équipe en quelques secondes.'}
            </Text>

            {/* Register name fields */}
            {mode === 'register' && (
              <View style={styles.rowFields}>
                <Input
                  label={t('auth.firstName')}
                  placeholder="Alex"
                  autoCapitalize="words"
                  value={firstName}
                  onChangeText={(v) => { setFirstName(v); setErrors((p) => ({ ...p, firstName: '' })); }}
                  error={errors.firstName}
                  icon={<Icon name="User" size={15} color="#7B85A0" />}
                  containerStyle={{ flex: 1 }}
                />
                <View style={{ width: 12 }} />
                <Input
                  label={t('auth.lastName')}
                  placeholder="Dupont"
                  autoCapitalize="words"
                  value={lastName}
                  onChangeText={(v) => { setLastName(v); setErrors((p) => ({ ...p, lastName: '' })); }}
                  error={errors.lastName}
                  icon={<Icon name="User" size={15} color="#7B85A0" />}
                  containerStyle={{ flex: 1 }}
                />
              </View>
            )}

            <Input
              label={t('auth.email')}
              placeholder="vous@exemple.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: '' })); }}
              error={errors.email}
              icon={<Icon name="Mail" size={15} color="#7B85A0" />}
              containerStyle={{ marginTop: 14 }}
            />

            <Input
              label={t('auth.password')}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })); }}
              error={errors.password}
              icon={<Icon name="Lock" size={15} color="#7B85A0" />}
              rightAdornment={
                <Icon name="Eye" size={16} color={showPassword ? '#1A8C8C' : '#7B85A0'} style={showPassword ? { opacity: 0.6 } : undefined} />
              }
              onRightPress={() => setShowPassword((s) => !s)}
              containerStyle={{ marginTop: 14 }}
            />

            {mode === 'register' && (
              <Input
                label="Confirmer le mot de passe"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                error={errors.confirmPassword}
                icon={<Icon name="Lock" size={15} color="#7B85A0" />}
                containerStyle={{ marginTop: 14 }}
              />
            )}

            <Button onPress={handleSubmit} isLoading={isSubmitting} size="lg" style={{ marginTop: 24 }}>
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </Button>

            {/* SSO divider */}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.divider} />
            </View>

            <Pressable style={styles.ssoBtn} onPress={() => handleSSO('google')}>
              <GoogleMark />
              <Text style={styles.ssoText}>{t('auth.ssoGoogle')}</Text>
            </Pressable>
            <Pressable style={[styles.ssoBtn, { marginTop: 10 }]} onPress={() => handleSSO('microsoft')}>
              <MicrosoftMark />
              <Text style={styles.ssoText}>{t('auth.ssoMicrosoft')}</Text>
            </Pressable>

            {/* Demo */}
            <Pressable style={styles.demoBtn} onPress={handleDemo} disabled={isSubmitting}>
              <Icon name="Rocket" size={14} color="#E8531A" />
              <Text style={styles.demoText}>Essayer avec un compte démo</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            En continuant vous acceptez les conditions d'utilisation de StudioPilot.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/** Tiny inline Google "G" mark (4-color SVG approximation). */
const GoogleMark = () => (
  <View style={{ width: 16, height: 16 }}>
    <Text style={{ fontSize: 14, lineHeight: 16, fontFamily: FONT.inter.bold, color: '#4285F4' }}>G</Text>
  </View>
);

const MicrosoftMark = () => (
  <View style={{ width: 15, height: 15, flexDirection: 'row', flexWrap: 'wrap' }}>
    {['#F25022', '#7FBA00', '#00A4EF', '#FFB900'].map((c) => (
      <View key={c} style={{ width: 7, height: 7, backgroundColor: c, margin: 0.25 }} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
  },
  inner: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    height: 30,
    width: 148,
  },
  card: {
    backgroundColor: FIXED.card,
    borderWidth: 1,
    borderColor: FIXED.cardBorder,
    borderRadius: RADIUS.xxl,
    padding: 22,
  },
  inviteBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(26,140,140,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(26,140,140,0.30)',
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 16,
  },
  inviteText: {
    flex: 1,
    color: FIXED.text,
    fontSize: 12.5,
    fontFamily: FONT.inter.regular,
    lineHeight: 17,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: FIXED.surface2,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#E8531A',
  },
  tabText: {
    fontSize: 13,
    fontFamily: FONT.inter.semibold,
    color: '#8890A8',
  },
  tabTextActive: {
    color: '#fff',
  },
  heading: {
    fontSize: 20,
    fontFamily: FONT.sora.bold,
    color: FIXED.text,
  },
  subheading: {
    fontSize: 12.5,
    fontFamily: FONT.inter.regular,
    color: FIXED.textMuted,
    marginTop: 4,
    marginBottom: 6,
  },
  rowFields: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: FIXED.cardBorder,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: FONT.inter.medium,
    color: FIXED.textMuted,
  },
  ssoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: FIXED.cardBorder,
    backgroundColor: FIXED.surface2,
  },
  ssoText: {
    fontSize: 13,
    fontFamily: FONT.inter.semibold,
    color: FIXED.text,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  demoText: {
    fontSize: 12.5,
    fontFamily: FONT.inter.semibold,
    color: '#E8531A',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONT.inter.regular,
    color: FIXED.textMuted,
    marginTop: 20,
    opacity: 0.8,
  },
});
