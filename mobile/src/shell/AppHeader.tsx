import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../state/AppStateContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { FONT } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/ui/Avatar';
import { Logo } from '../components/Logo';
import { useUnreadCount } from '../services/notificationStore';

interface AppHeaderProps {
  onMenuPress: () => void;
  onNotificationsPress: () => void;
  onSearchPress: () => void;
  onProfilePress: () => void;
}

/**
 * AppHeader — port of web `components/Navbar.tsx` (mobile layout):
 * menu button + breadcrumbs (Org / Workspace / Project), notifications bell
 * with unread badge, search, and user avatar.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  onMenuPress,
  onNotificationsPress,
  onSearchPress,
  onProfilePress,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { activeOrg, activeWorkspace, activeProject, activeScreen } = useAppState();
  const { user } = useAuth();
  const unread = useUnreadCount();

  const crumbs: { label: string; active: boolean }[] = [];
  if (activeScreen === 'project' && activeProject) {
    if (activeOrg) crumbs.push({ label: activeOrg.name, active: false });
    if (activeWorkspace) crumbs.push({ label: activeWorkspace.name, active: false });
    crumbs.push({ label: activeProject.name, active: true });
  } else if (activeScreen === 'workspace' && activeWorkspace) {
    if (activeOrg) crumbs.push({ label: activeOrg.name, active: false });
    crumbs.push({ label: activeWorkspace.name, active: true });
  } else if (activeScreen === 'org' && activeOrg) {
    crumbs.push({ label: activeOrg.name, active: true });
  }

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + 6,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left: menu + crumbs/logo */}
      <Pressable onPress={onMenuPress} hitSlop={10} style={[styles.iconBtn, { backgroundColor: colors.surface2 }]}>
        <Icon name="Menu" size={17} color={colors.textSecondary} strokeWidth={2.2} />
      </Pressable>

      <View style={styles.titleWrap}>
        {crumbs.length === 0 ? (
          <Logo width={110} height={20} />
        ) : (
          <View style={styles.crumbsRow}>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Icon name="ChevronRight" size={11} color={colors.textMuted} style={{ marginHorizontal: 3, opacity: 0.7 }} />}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontFamily: c.active ? FONT.inter.bold : FONT.inter.medium,
                    color: c.active ? colors.text : colors.textMuted,
                    maxWidth: i === crumbs.length - 1 ? undefined : 80,
                  }}
                >
                  {c.label}
                </Text>
              </React.Fragment>
            ))}
          </View>
        )}
      </View>

      {/* Right actions */}
      <View style={styles.actions}>
        <Pressable onPress={onSearchPress} hitSlop={8} style={[styles.iconBtn, { backgroundColor: colors.surface2 }]}>
          <Icon name="Search" size={16} color={colors.textSecondary} strokeWidth={2.2} />
        </Pressable>
        <Pressable onPress={onNotificationsPress} hitSlop={8} style={[styles.iconBtn, { backgroundColor: colors.surface2 }]}>
          <Icon name="Bell" size={16} color={colors.textSecondary} strokeWidth={2.2} />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={onProfilePress} hitSlop={8}>
          <Avatar
            src={user?.avatarUrl}
            firstName={user?.firstName ?? undefined}
            lastName={user?.lastName ?? undefined}
            email={user?.email}
            size="sm"
            style={{ transform: [{ scale: 1.25 }] }}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  crumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E8531A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: FONT.inter.bold,
  },
});
