import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from '../services/api';
import { subscribeToNotifications, unsubscribeFromNotifications } from '../hooks/useSocket';
import { Notification } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const NotificationsMenu: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // ── Load notifications from REST on mount ───────────────────────────────────
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: any = await apiService.getNotifications({ limit: 50, unread: false });
      const list: Notification[] = Array.isArray(response)
        ? response
        : Array.isArray(response?.data) ? response.data : [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read && !(n as any).readAt).length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // ── WebSocket: subscribe to global notification events ──────────────────────
  useEffect(() => {
    // Simple translation helper for backend notification messages
    const translateNotification = (title: string, body: string | null): { title: string; body: string | null } => {
      // Translate task assignment notifications
      if (title.includes('You were assigned a task')) {
        const taskName = title.split('You were assigned a task: ')[1];
        return {
          title: taskName ? `Nouvelle tâche : ${taskName}` : 'Nouvelle tâche assignée',
          body: body?.replace('You have been assigned', 'Vous avez été assigné') || null
        };
      }
      
      // Translate other common patterns
      if (title.includes('New message')) {
        return {
          title: title.replace('New message', 'Nouveau message'),
          body
        };
      }
      
      if (title.includes('Task updated')) {
        return {
          title: title.replace('Task updated', 'Tâche mise à jour'),
          body
        };
      }
      
      // Return as-is if no translation needed
      return { title, body };
    };

    const onNotificationCreated = (n: Notification) => {
      const translated = translateNotification(n.title, n.body);
      
      // Update notification with translated version
      const translatedNotification = { ...n, title: translated.title, body: translated.body };
      
      setNotifications(prev => {
        if (prev.some(x => x.id === n.id)) return prev;
        return [translatedNotification, ...prev];
      });
      setUnreadCount(c => c + 1);
      
      // Compact and attractive toast notification
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-sm bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl rounded-xl pointer-events-auto flex items-center gap-2.5 px-3 py-2.5 ring-1 ring-white/30`}
        >
          <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {translated.title || 'Nouvelle notification'}
            </p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-white/70 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ), { 
        duration: 3500,
        position: 'top-right',
      });
    };

    const onNotificationRead = (payload: { ids?: string[]; all?: boolean }) => {
      setNotifications(prev =>
        prev.map(n => (payload.all || payload.ids?.includes(n.id)) ? { ...n, read: true } : n)
      );
      if (payload.all) setUnreadCount(0);
      else setUnreadCount(c => Math.max(0, c - (payload.ids?.length ?? 0)));
    };

    subscribeToNotifications(onNotificationCreated, onNotificationRead);

    return () => {
      unsubscribeFromNotifications(onNotificationCreated, onNotificationRead);
    };
  }, []); // mount once — stable references

  // ── Mark ALL as read ────────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    // Optimistic update first
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setIsMarkingAll(true);
    try {
      await apiService.markAllNotificationsRead();
    } catch (err: any) {
      console.error('markAllAsRead failed:', err);
      toast.error(err?.message || 'Impossible de marquer les notifications comme lues');
      // Reload from server to get accurate state
      loadNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  // ── Mark single as read ─────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try {
      await apiService.markNotificationRead(id);
    } catch (err: any) {
      console.error('markAsRead failed:', err);
      // Revert on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
      setUnreadCount(c => c + 1);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 text-[10px] font-bold text-white px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl z-40 p-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-violet-500/20 text-violet-400 font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={isMarkingAll}
                    className="text-xs text-violet-500 hover:text-violet-400 font-medium flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                  >
                    {isMarkingAll
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Check className="w-3.5 h-3.5" />
                    }
                    Tout lire
                  </button>
                )}
              </div>

              {/* List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isRead = n.read || !!(n as any).readAt;
                    return (
                      <div
                        key={n.id}
                        onClick={() => !isRead && markAsRead(n.id)}
                        className={`p-3 rounded-xl border text-xs transition ${
                          isRead
                            ? 'bg-transparent border-slate-200/50 dark:border-slate-800/50 opacity-60'
                            : 'bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/15 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${isRead ? 'bg-slate-400/30' : 'bg-violet-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{n.title}</p>
                            {n.body && (
                              <p className="text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                            )}
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {formatTimestamp(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
