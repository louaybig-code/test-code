/**
 * Unread-notification count store — module-level observable so the header
 * badge, the notification screen, and the socket layer stay in sync.
 */
import { useSyncExternalStore } from 'react';

let unreadCount = 0;
const listeners = new Set<() => void>();

export const setUnreadCount = (n: number) => {
  unreadCount = Math.max(0, n);
  listeners.forEach((l) => l());
};

export const bumpUnread = (delta: number) => setUnreadCount(unreadCount + delta);

export const getUnread = () => unreadCount;

export function useUnreadCount(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => unreadCount
  );
}
