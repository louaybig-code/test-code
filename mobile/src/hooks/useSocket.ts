/**
 * Socket.IO client — React Native port of web `src/hooks/useSocket.ts`.
 * Same events, same connect/reconnect semantics, same channel room protocol.
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { getAccessToken } from '../services/api';

let socketInstance: Socket | null = null;

// Global notification callback registry — components register their handlers here
const notificationCallbacks = new Set<(data: any) => void>();
const notificationReadCallbacks = new Set<(data: any) => void>();

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const SOCKET_URL: string =
  (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_SOCKET_URL) ||
  extra.socketUrl ||
  'https://studiopilote.fr';
const SOCKET_PATH: string =
  (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_SOCKET_PATH) ||
  extra.socketPath ||
  '/api/v1/socket.io';

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
    notificationCallbacks.forEach((cb) => cb(data));
  });

  socketInstance.on('notification.read', (data: any) => {
    notificationReadCallbacks.forEach((cb) => cb(data));
  });

  socketInstance.on('connect', () => {
    socketInstance?.emit('user:join');
    socketInstance?.emit('subscribe:notifications');
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
    if (!socket) return;
    const eventNames = Object.keys(events);

    const handlers: Record<string, (data: any) => void> = {};
    eventNames.forEach((event) => {
      handlers[event] = (data: any) => eventsRef.current[event]?.(data);
      socket.on(event, handlers[event]);
    });

    // Re-register after reconnect
    const onReconnect = () => {
      eventNames.forEach((event) => {
        socket.off(event, handlers[event]);
        socket.on(event, handlers[event]);
      });
    };
    (socket as any).io?.on?.('reconnect', onReconnect);

    return () => {
      eventNames.forEach((event) => socket.off(event, handlers[event]));
      (socket as any).io?.off?.('reconnect', onReconnect);
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
    if (!socket) return;

    socket.emit('channel:join', { channelId });

    const handlers: Record<string, (data: any) => void> = {};
    Object.entries(eventsRef.current).forEach(([event, _]) => {
      handlers[event] = (data: any) => eventsRef.current[event]?.(data);
      socket.on(event, handlers[event]);
    });

    return () => {
      socket.emit('channel:leave', { channelId });

      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [channelId]);
}
