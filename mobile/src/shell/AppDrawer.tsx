import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../state/AppStateContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/ui/Avatar';
import { Logo } from '../components/Logo';
import { Organization, Project, Workspace } from '../types';

const DRAWER_W = Math.min(Dimensions.get('window').width * 0.84, 340);

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpenCreateProject: () => void;
  onOpenOrgSettings: (defaultTab: 'create' | 'members') => void;
  onOpenInviteOrg: () => void;
  onOpenWorkspaceSettings: () => void;
  onOpenProfile: () => void;
}

/**
 * AppDrawer — port of web `components/Sidebar.tsx` (mobile overlay variant):
 * logo header, org/workspace/project accordion, Accueil + Canaux links,
 * theme toggle, avatar + logout footer. Same muted-surface styling.
 */
export const AppDrawer: React.FC<AppDrawerProps> = ({
  visible,
  onClose,
  onOpenCreateProject,
  onOpenOrgSettings,
  onOpenInviteOrg,
  onOpenWorkspaceSettings,
  onOpenProfile,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const {
    organizations, activeOrg, selectOrg,
    workspaces, activeWorkspace, selectWorkspace,
    projects, activeProject, selectProject,
    goHome, activeScreen, setActiveScreen, setActiveView,
    ownedOrgIds,
  } = useAppState();

  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  const [orgOpen, setOrgOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 16 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -DRAWER_W, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const go = (fn: () => void) => {
    fn();
    onClose();
  };

  const SectionButton: React.FC<{
    label: string;
    icon: string;
    chevron: string;
    open: boolean;
    onToggle: () => void;
    accent?: string;
  }> = ({ label, icon, chevron, open, onToggle }) => (
    <Pressable onPress={onToggle} style={[styles.sectionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <Icon name={icon as any} size={15} color={BRAND.teal} />
      <Text numberOfLines={1} style={[styles.sectionLabel, { color: colors.text }]}>
        {label}
      </Text>
      <Icon name={chevron as any} size={15} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.surface,
            borderRightColor: colors.border,
            paddingTop: insets.top + 14,
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateX }],
          },
        ]}
      >
        {/* header */}
        <View style={styles.logoRow}>
          <Logo width={122} height={21} />
          <Pressable onPress={onClose} hitSlop={12} style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}>
            <Icon name="X" size={15} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {/* ── Organisation accordion ── */}
          <SectionButton
            label={activeOrg?.name ?? 'Organisations'}
            icon="Building2"
            chevron={orgOpen ? 'ChevronUp' : 'ChevronDown'}
            open={orgOpen}
            onToggle={() => setOrgOpen((o) => !o)}
          />
          {orgOpen && (
            <View style={styles.accordion}>
              {organizations.map((o: Organization) => {
                const active = activeOrg?.id === o.id;
                const owned = ownedOrgIds.has(o.id);
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => go(() => selectOrg(o))}
                    style={[styles.item, active && { backgroundColor: BRAND.teal08 }]}
                  >
                    <View style={[styles.itemDot, { backgroundColor: active ? BRAND.teal : colors.borderStrong }]} />
                    <Text numberOfLines={1} style={[styles.itemText, { color: active ? BRAND.teal : colors.textSecondary }]}>
                      {o.name}
                    </Text>
                    {!owned && (
                      <View style={styles.invitedPill}>
                        <Text style={styles.invitedPillText}>Invité</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              <Pressable onPress={() => go(() => onOpenOrgSettings('create'))} style={styles.newItem}>
                <Icon name="Plus" size={14} color={BRAND.orange} />
                <Text style={styles.newItemText}>Nouvelle organisation</Text>
              </Pressable>
            </View>
          )}

          {/* ── Workspace accordion (only if org selected) ── */}
          {activeOrg && (
            <>
              <SectionButton
                label={activeWorkspace?.name ?? 'Espaces de travail'}
                icon="LayoutGrid"
                chevron={wsOpen ? 'ChevronUp' : 'ChevronDown'}
                open={wsOpen}
                onToggle={() => setWsOpen((o) => !o)}
              />
              {wsOpen && (
                <View style={styles.accordion}>
                  {workspaces.map((w: Workspace) => {
                    const active = activeWorkspace?.id === w.id;
                    return (
                      <Pressable
                        key={w.id}
                        onPress={() => go(() => selectWorkspace(w))}
                        style={[styles.item, active && { backgroundColor: BRAND.teal08 }]}
                      >
                        <View style={[styles.itemDot, { backgroundColor: active ? BRAND.teal : colors.borderStrong }]} />
                        <Text numberOfLines={1} style={[styles.itemText, { color: active ? BRAND.teal : colors.textSecondary }]}>
                          {w.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {ownedOrgIds.has(activeOrg.id) && (
                    <Pressable onPress={() => go(onOpenWorkspaceSettings)} style={styles.newItem}>
                      <Icon name="Plus" size={14} color={BRAND.orange} />
                      <Text style={styles.newItemText}>Nouvel espace</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}

          {/* ── Project accordion (only if ws selected) ── */}
          {activeOrg && activeWorkspace && (
            <>
              <SectionButton
                label={activeProject?.name ?? 'Projets'}
                icon="FolderKanban"
                chevron={projOpen ? 'ChevronUp' : 'ChevronDown'}
                open={projOpen}
                onToggle={() => setProjOpen((o) => !o)}
              />
              {projOpen && (
                <View style={styles.accordion}>
                  {projects.map((p: Project) => {
                    const active = activeProject?.id === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => go(() => selectProject(p))}
                        style={[styles.item, active && { backgroundColor: BRAND.teal08 }]}
                      >
                        <View style={[styles.itemDot, { backgroundColor: active ? BRAND.teal : colors.borderStrong }]} />
                        <Text numberOfLines={1} style={[styles.itemText, { color: active ? BRAND.teal : colors.textSecondary }]}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {ownedOrgIds.has(activeOrg.id) && (
                    <Pressable onPress={() => go(onOpenCreateProject)} style={styles.newItem}>
                      <Icon name="Plus" size={14} color={BRAND.orange} />
                      <Text style={styles.newItemText}>Nouveau projet</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}

          {/* separator */}
          <View style={[styles.sep, { backgroundColor: colors.border }]} />

          {/* ── Nav links ── */}
          <Pressable onPress={() => go(goHome)} style={[styles.navLink, activeScreen === 'org' && !activeOrg && styles.navLinkActive]}>
            <Icon name="Home" size={16} color={activeScreen === 'org' && !activeOrg ? BRAND.orange : colors.textSecondary} />
            <Text style={[styles.navLinkText, { color: activeScreen === 'org' && !activeOrg ? BRAND.orange : colors.textSecondary }]}>
              Accueil
            </Text>
          </Pressable>

          {activeWorkspace && (
            <Pressable
              onPress={() =>
                go(() => {
                  // channels are a project view (web: Navbar 'Discussion' tab)
                  if (!activeProject && projects.length > 0) selectProject(projects[0]);
                  setActiveScreen('project');
                  setActiveView('channels');
                })
              }
              style={styles.navLink}
            >
              <Icon name="Hash" size={16} color={colors.textSecondary} />
              <Text style={[styles.navLinkText, { color: colors.textSecondary }]}>Canaux Discussion</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* ── Footer ── */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable onPress={toggleTheme} hitSlop={8} style={[styles.themeBtn, { backgroundColor: colors.surface2 }]}>
            <Icon name={isDark ? 'Sun' : 'Moon'} size={15} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => go(onOpenProfile)} style={styles.avatarBtn}>
            <Avatar src={user?.avatarUrl} firstName={user?.firstName ?? undefined} lastName={user?.lastName ?? undefined} email={user?.email} size="sm" />
            <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
              <Text numberOfLines={1} style={[styles.footerName, { color: colors.text }]}>
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Compte'}
              </Text>
              <Text numberOfLines={1} style={[styles.footerEmail, { color: colors.textMuted }]}>
                {user?.email}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => go(logout)} hitSlop={8} style={[styles.logoutBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
            <Icon name="LogOut" size={15} color="#EF4444" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    borderRightWidth: 1,
    paddingHorizontal: 14,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: FONT.inter.semibold,
  },
  accordion: {
    marginLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(120,130,160,0.25)',
    paddingLeft: 10,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.inter.medium,
  },
  invitedPill: {
    backgroundColor: BRAND.teal15,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  invitedPillText: {
    color: BRAND.teal,
    fontSize: 9.5,
    fontFamily: FONT.inter.semibold,
  },
  newItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  newItemText: {
    color: BRAND.orange,
    fontSize: 12.5,
    fontFamily: FONT.inter.semibold,
  },
  sep: {
    height: 1,
    marginVertical: 6,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navLinkActive: {
    backgroundColor: BRAND.orange08,
  },
  navLinkText: {
    fontSize: 13.5,
    fontFamily: FONT.inter.semibold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  footerName: {
    fontSize: 13,
    fontFamily: FONT.inter.semibold,
  },
  footerEmail: {
    fontSize: 10.5,
    fontFamily: FONT.inter.regular,
    marginTop: 1,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
