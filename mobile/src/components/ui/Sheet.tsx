import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Pressable as RNPressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Fraction of screen height the sheet tries to occupy on open (0-1). Default 0.82 */
  heightFraction?: number;
  /** Let the content size itself (up to 86% of screen) instead of a fixed height */
  autoHeight?: boolean;
  /** Scroll is managed by the caller — content just fills the sheet body */
  padded?: boolean;
}

/**
 * Sheet — the mobile port of the web `Modal`: a bottom-sheet dialog with
 * backdrop dim, drag handle, slide-up entrance, and the same surface styling.
 */
export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  heightFraction = 0.82,
  autoHeight = false,
  padded = true,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get('window').height;
  const slide = useRef(new Animated.Value(screenH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slide, { toValue: screenH, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                maxHeight: screenH * (autoHeight ? 0.88 : heightFraction),
                height: autoHeight ? undefined : screenH * heightFraction,
                transform: [{ translateY: slide }],
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            {/* drag handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            </View>

            {(!!title || !!subtitle) && (
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  {!!title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
                  {!!subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
                </View>
                <RNPressable
                  onPress={onClose}
                  hitSlop={12}
                  style={[styles.closeBtn, { backgroundColor: colors.surface2 }]}
                >
                  <Icon name="X" size={16} color={colors.textSecondary} />
                </RNPressable>
              </View>
            )}

            <View style={[styles.body, padded && { paddingHorizontal: 20 }]}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16.5,
    fontFamily: FONT.sora.semibold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONT.inter.regular,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
});
