/**
 * Minimal branded toast system — drop-in replacement for react-hot-toast
 * (toast.success / toast.error / toast.custom) with StudioPilot styling.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { FONT, RADIUS } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'notif';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let toastId = 0;

function emit(type: ToastType, message: string, duration = 3500, title?: string) {
  const item: ToastItem = { id: ++toastId, type, message, duration, title };
  listeners.forEach((l) => l(item));
  return item.id;
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message, 4200),
  info: (message: string) => emit('info', message),
  /** Branded push-notification style toast (green gradient + bell, like the web). */
  notification: (title: string, body?: string) => emit('notif', body ?? '', 3800, title),
  custom: (type: ToastType, message: string) => emit(type, message),
};

const ToastContext = createContext<null>(null);

export const ToastHost: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const l: Listener = (t) => {
      setItems((prev) => [...prev.slice(-2), t]); // max 3 stacked
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, t.duration);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
      <View pointerEvents="box-none" style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 8 }}>
        {items.map((t) => (
          <ToastCard key={t.id} item={t} />
        ))}
      </View>
    </View>
  );
};

const ToastCard: React.FC<{ item: ToastItem }> = ({ item }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  if (item.type === 'notif') {
    // emerald→teal gradient-ish card matching the web's custom push toast
    return (
      <Animated.View style={[styles.card, { opacity, transform: [{ translateY }], backgroundColor: '#0D9488', borderColor: 'rgba(255,255,255,0.25)' }]}>
        <View style={styles.iconWrap}>
          <Icon name="Bell" size={15} color="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {!!item.title && <Text numberOfLines={1} style={styles.notifTitle}>{item.title}</Text>}
          {!!item.message && <Text numberOfLines={2} style={styles.notifBody}>{item.message}</Text>}
        </View>
      </Animated.View>
    );
  }

  const cfg =
    item.type === 'success'
      ? { icon: 'CheckCircle2', color: '#10B981' }
      : item.type === 'error'
      ? { icon: 'AlertTriangle', color: '#EF4444' }
      : { icon: 'Bell', color: '#1A8C8C' };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '1F' }]}>
        <Icon name={cfg.icon as any} size={15} color={cfg.color} />
      </View>
      <Text style={[styles.text, { color: colors.text }]}>{item.message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.inter.semibold,
  },
  notifTitle: {
    color: '#fff',
    fontSize: 12.5,
    fontFamily: FONT.inter.bold,
  },
  notifBody: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11.5,
    fontFamily: FONT.inter.regular,
    marginTop: 1,
  },
});
