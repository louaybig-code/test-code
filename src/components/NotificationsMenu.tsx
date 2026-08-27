import React, { useState, useEffect } from 'react';
import { Bell, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from '../services/api';
import { Notification } from '../types';
import toast from 'react-hot-toast';

export const NotificationsMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications when menu opens
  useEffect(() => {
    if (!isOpen) return;
    
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getNotifications({ limit: 20, unread: false });
        // Handle both array and paginated response
        const notifList = Array.isArray(response) ? response : response.data || [];
        setNotifications(notifList);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        // Fallback to mock data
        setNotifications([
          {
            id: '1',
            userId: 'u1',
            type: 'WELCOME',
            title: 'Bienvenue sur Smash !',
            body: 'Votre espace de travail est prêt pour gérer vos projets agiles.',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ] as any);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl z-40 p-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-violet-500/20 text-violet-400 font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-violet-500 hover:text-violet-400 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Tout marquer comme lu
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {isLoading ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    Chargement...
                  </p>
                ) : notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    Aucune notification.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markAsRead(n.id)}
                      className={`p-3 rounded-xl border text-xs transition cursor-pointer ${
                        n.read
                          ? 'bg-transparent border-slate-200/50 dark:border-slate-800/50 opacity-70'
                          : 'bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/15'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                            {n.title}
                          </h5>
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                            {n.body}
                          </p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {formatTimestamp(n.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
