import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../services/api';

let socketInstance: Socket | null = null;

// Global notification callback registry — components register their handlers here
const notificationCallbacks = new Set<(data: any) => void>();
const notificationReadCallbacks = new Set<(data: any) => void>();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://evalys.admin.preprod.studiolab.fr/collab';
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/smash_api/socket.io';

export function connectSocket() {
  const token = getAccessToken();

  // If already connected with a valid token, reuse
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  // Disconnect stale instance
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }

  // Check if Socket.IO is configured
  if (!SOCKET_URL || SOCKET_URL === 'disabled') {
    console.warn('⚠️ Socket.IO disabled - real-time features unavailable');
    return null as any;
  }

  socketInstance = io(SOCKET_URL, {
    path: SOCKET_PATH,
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  // Global handlers — always registered on every new socket instance
  socketInstance.on('notification.created', (data: any) => {
    notificationCallbacks.forEach(cb => cb(data));
  });

  socketInstance.on('notification.read', (data: any) => {
    notificationReadCallbacks.forEach(cb => cb(data));
  });

  socketInstance.on('connect', () => {
    (window as any).__socket = socketInstance;
    socketInstance?.emit('user:join');
    socketInstance?.emit('subscribe:notifications');
  });

  socketInstance.on('disconnect', (reason) => {
    // Silent disconnect
  });

  socketInstance.on('connect_error', (err) => {
    console.warn('Socket.IO connection error:', err.message);
  });

  return socketInstance;
}

// Call this once the auth token is ready — forces a fresh connection with the token
export function reconnectSocketWithToken() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
  return connectSocket();
}

export function getSocket(): Socket {
  if (!socketInstance || socketInstance.disconnected) {
    return connectSocket();
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// ── Register/unregister notification callbacks ──────────────────────────────
export function subscribeToNotifications(
  onCreated: (data: any) => void,
  onRead: (data: any) => void
) {
  notificationCallbacks.add(onCreated);
  notificationReadCallbacks.add(onRead);
}

export function unsubscribeFromNotifications(
  onCreated: (data: any) => void,
  onRead: (data: any) => void
) {
  notificationCallbacks.delete(onCreated);
  notificationReadCallbacks.delete(onRead);
}

// ── Generic hook: subscribe to one or more socket events ──────────────────────
export function useSocket(
  events: Record<string, (data: any) => void>,
  enabled = true
) {
  const eventsRef = useRef(events);
  eventsRef.current = events; // always points to latest callbacks

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    const eventNames = Object.keys(events);

    // Stable wrapper — reads latest callback from ref at call time
    const handlers: Record<string, (data: any) => void> = {};
    eventNames.forEach((event) => {
      handlers[event] = (data: any) => eventsRef.current[event]?.(data);
      socket.on(event, handlers[event]);
    });

    // Re-register after reconnect (socket clears listeners on reconnect)
    const onReconnect = () => {
      eventNames.forEach((event) => {
        socket.off(event, handlers[event]);
        socket.on(event, handlers[event]);
      });
    };
    socket.io.on('reconnect', onReconnect);

    return () => {
      eventNames.forEach((event) => socket.off(event, handlers[event]));
      socket.io.off('reconnect', onReconnect);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

// ── Join/leave a channel room so the server delivers messages to this socket ──
export function useChannelSocket(
  channelId: string | null,
  events: Record<string, (data: any) => void>
) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!channelId) return;

    const socket = getSocket();

    // Tell the backend we want to receive events for this channel
    socket.emit('channel:join', { channelId });

    const handlers: Record<string, (data: any) => void> = {};
    Object.entries(eventsRef.current).forEach(([event, _]) => {
      handlers[event] = (data: any) => eventsRef.current[event]?.(data);
      socket.on(event, handlers[event]);
    });

    return () => {
      // Leave the channel room when switching away
      socket.emit('channel:leave', { channelId });

      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [channelId]);
}
