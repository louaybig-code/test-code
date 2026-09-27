import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Skeleton — port of web `Skeleton.tsx` sp-skeleton shimmer utility.
 * Renders a pulsing rounded block themed to the current surface-2 color.
 */
export const Skeleton: React.FC<{ width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }> = ({
  width = '100%',
  height = 16,
  radius = RADIUS.md,
  style,
}) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: radius, backgroundColor: colors.surface2, opacity }, style]}
    />
  );
};

/** Common row-of-3-lines placeholder. */
export const SkeletonLines: React.FC<{ lines?: number; gap?: number; style?: StyleProp<ViewStyle> }> = ({
  lines = 3,
  gap = 10,
  style,
}) => (
  <Animated.View style={style as any}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height={14} width={i === lines - 1 ? '60%' : '100%'} style={{ marginBottom: i < lines - 1 ? gap : 0 }} />
    ))}
  </Animated.View>
);
