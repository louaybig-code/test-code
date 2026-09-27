import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Icon } from '../../components/Icon';
import { SkeletonLines } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { apiService } from '../../services/api';
import { setUnreadCount } from '../../services/notificationStore';
import { subscribeToNotifications, unsubscribeFromNotifications } from '../../hooks/useSocket';
import { useTheme } from '../../theme/ThemeContext';
import { toast } from '../../components/toast';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Notification } from '../../types';
import { formatRelativeTime } from '../../lib/constants';

/** Web keeps the same translation table for backend titles (EN→FR). */
const TITLE_FR: Record<string, string> = {
  'Task assigned': 'Tâche assignée',
  'Task updated': 'Tâche mise à jour',
  'Comment added': 'Nouveau commentaire',
  'Mention': 'Mention',
  'Sprint started': 'Sprint démarré',
  'Sprint closed': 'Sprint clôturé',
  'Project invitation': 'Invitation au projet',
  'Organization invitation': "Invitation à l'organisation",
};

const translate = (s?: string) => (s && TITLE_FR[s]) || s || '';

interface NotifProps {
  visible: boolean;
  onClose: () => void;
  onOpenTask: (taskId: string) => void;
}

/**
 * NotificationsScreen — port of web `components/NotificationsMenu.tsx` as
 * a mobile sheet center: REST list + live socket inserts, tap-to-mark-read,
 * "mark all read".
 */
export const NotificationsScreen: React.FC<NotifProps> = ({ visible, onClose, onOpenTask }) => {
  const { colors } = useTheme();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const syncBadge = (list: Notification[]) => {
    setUnreadCount(list.filter((n: any) => !n.read && !n.readAt).length);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiService.getNotifications({ limit: 50 });
      const list: Notification[] = Array.isArray(res) ? res : res?.data ?? res?.notifications ?? res?.items ?? [];
      setItems(list);
      syncBadge(list);
    } catch (err: any) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    load();
    const onCreated = () => load();
    const onRead = () => load();
    subscribeToNotifications(onCreated, onRead);
    return () => unsubscribeFromNotifications(onCreated, onRead);
  }, [visible, load]);

  const markRead = async (n: Notification) => {
    // optimistic (same as web)
    const next = items.map((x) => (x.id === n.id ? { ...x, read: true } : x));
    setItems(next as any);
    syncBadge(next as Notification[]);
    try {
      await apiService.markNotificationRead(n.id);
    } catch {
      load();
    }

    const taskId = (n as any).data?.taskId ?? (n as any).taskId;
    if (taskId) onOpenTask(taskId);
  };

  const markAll = async () => {
    const next = items.map((x) => ({ ...x, read: true }));
    setItems(next as any);
    syncBadge(next as Notification[]);
    try {
      await apiService.markAllNotificationsRead();
    } catch {
      load();
    }
  };

  const unread = items.filter((n: any) => !n.read && !n.readAt).length;

  return (
    <Sheet visible={visible} onClose={onClose} title="Notifications" subtitle={unread > 0 ? `${unread} non lue${unread !== 1 ? 's' : ''}` : 'Vous êtes à jour'} heightFraction={0.78}>
      <View style={{ flex: 1 }}>
        {items.length > 0 && (
          <Pressable onPress={markAll} style={{ alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 2, marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: FONT.inter.semibold, color: BRAND.teal }}>Tout marquer comme lu</Text>
          </Pressable>
        )}

        {loading ? (
          <SkeletonLines lines={4} gap={12} />
        ) : items.length === 0 ? (
          <EmptyState icon="Bell" title="Aucune notification" description="Les mentions, assignations et mises à jour apparaîtront ici." />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            renderItem={({ item: n }) => {
              const isUnread = !(n as any).read && !(n as any).readAt;
              const title = translate((n as any).title);
              const body = (n as any).body ?? (n as any).message ?? (n as any).data?.body;
              return (
                <Pressable
                  onPress={() => markRead(n)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isUnread ? BRAND.teal08 : colors.surface2,
                      borderColor: isUnread ? 'rgba(26,140,140,0.28)' : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.iconTile, { backgroundColor: isUnread ? BRAND.teal : colors.surface3 }]}>
                    <Icon name="Bell" size={13} color={isUnread ? '#fff' : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={2} style={{ fontSize: 12.5, fontFamily: isUnread ? FONT.inter.bold : FONT.inter.semibold, color: colors.text }}>
                      {title || 'Notification'}
                    </Text>
                    {!!body && (
                      <Text numberOfLines={2} style={{ fontSize: 11.5, fontFamily: FONT.inter.regular, color: colors.textMuted, marginTop: 2 }}>
                        {body}
                      </Text>
                    )}
                    <Text style={{ fontSize: 10, fontFamily: FONT.inter.medium, color: colors.textMuted, marginTop: 4 }}>
                      {(n as any).createdAt ? formatRelativeTime((n as any).createdAt) : ''}
                    </Text>
                  </View>
                  {isUnread && <View style={styles.unreadDot} />}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'flex-start',
  },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BRAND.orange,
    marginTop: 4,
  },
});
