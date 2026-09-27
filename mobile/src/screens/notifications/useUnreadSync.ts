import { useEffect } from 'react';
import { apiService } from '../../services/api';
import { subscribeToNotifications, unsubscribeFromNotifications } from '../../hooks/useSocket';
import { setUnreadCount, bumpUnread } from '../../services/notificationStore';
import { toast } from '../../components/toast';

/**
 * useUnreadSync — keeps the header's unread badge in sync:
 * initial REST fetch + live socket events (notification.created / .read).
 * Mirrors the web NotificationsMenu's data flow.
 */
export function useUnreadSync() {
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res: any = await apiService.getNotifications({ limit: 50 });
        const items = Array.isArray(res) ? res : res?.data ?? res?.notifications ?? res?.items ?? [];
        if (!cancelled) setUnreadCount(items.filter((n: any) => !n.read && !n.readAt).length);
      } catch {
        // silent — badge just stays at 0
      }
    };

    const onCreated = (_n: any) => {
      bumpUnread(1);
      // branded push-style toast, like the web's custom toast
      const title = _n?.title ?? _n?.data?.title ?? 'Nouvelle notification';
      const body = _n?.body ?? _n?.message ?? _n?.data?.body;
      toast.notification(title, body);
    };
    const onRead = () => {
      load(); // resync exactly
    };

    subscribeToNotifications(onCreated, onRead);
    load();

    return () => {
      cancelled = true;
      unsubscribeFromNotifications(onCreated, onRead);
    };
  }, []);
}
