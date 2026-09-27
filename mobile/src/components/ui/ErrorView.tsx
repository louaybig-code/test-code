import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';
import { Button } from './Button';

interface ErrorViewProps {
  title: string;
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  onOpenChat?: () => void;
  statusCode?: number;
}

/**
 * ErrorView — port of web `components/ui/ErrorView.tsx` (full-screen brand error).
 * Cloud glyph is rendered with an AlertTriangle icon inside a tinted tile
 * (same visual language as the web's logo icon mark).
 */
export const ErrorView: React.FC<ErrorViewProps> = ({
  title,
  message,
  onRetry,
  retryLabel = 'Réessayer',
  onOpenChat,
  statusCode,
}) => {
  const { colors, isDark } = useTheme();
  // Same swap logic as web Sidebar: white.png in dark mode, dark.png in light mode
  const logo = isDark ? require('../../../assets/studiopilot-white.png') : require('../../../assets/studiopilot-dark.png');

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* radial glow feel (solid bg substitute, gradient handled by system bg) */}
      <View style={styles.cardWrap}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <View style={[styles.warnTile, { backgroundColor: isDark ? 'rgba(232,83,26,0.08)' : '#F4F6FA', borderColor: colors.border }]}>
            <Icon name="AlertTriangle" size={28} color="#E8531A" />
          </View>
          {!!statusCode && <Text style={[styles.code, { color: colors.textMuted }]}>Code {statusCode}</Text>}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {!!message && <Text style={[styles.msg, { color: colors.textSecondary }]}>{message}</Text>}
          <View style={styles.btnRow}>
            <Button onPress={onRetry} icon={<Icon name="RefreshCw" size={16} color="#fff" strokeWidth={2.5} />} style={{ paddingHorizontal: 20 }}>
              {retryLabel}
            </Button>
            {onOpenChat && (
              <Button variant="secondary" onPress={onOpenChat} icon={<Icon name="MessageSquare" size={16} color="#1A8C8C" strokeWidth={2.5} />} />
            )}
          </View>
        </View>
      </View>

      {/* footer */}
      <View style={styles.footer}>
        <Image source={logo} style={styles.footerLogo} resizeMode="contain" />
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Un produit par <Text style={{ color: BRAND.teal, fontFamily: FONT.inter.medium }}>Studiolab SAS</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logo: {
    height: 20,
    width: 96,
    marginBottom: 24,
  },
  warnTile: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  code: {
    fontSize: 12,
    fontFamily: FONT.inter.medium,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: FONT.sora.bold,
    textAlign: 'center',
  },
  msg: {
    fontSize: 13,
    fontFamily: FONT.inter.regular,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 19,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLogo: {
    height: 12,
    width: 48,
    opacity: 0.7,
  },
  footerText: {
    fontSize: 11,
    fontFamily: FONT.inter.regular,
  },
});
