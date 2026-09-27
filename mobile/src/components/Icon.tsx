import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon, Ellipse } from 'react-native-svg';
import { ICONS, IconNode } from './icons';

export interface IconProps {
  /** Lucide icon name exactly as imported in the web app (e.g. "Folder", "CheckCircle2") */
  name: keyof typeof ICONS & string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Spin continuously (for Loader2) */
  spin?: boolean;
  style?: any;
}

const TAGS: Record<string, any> = { path: Path, circle: Circle, rect: Rect, line: Line, polyline: Polyline, polygon: Polygon, ellipse: Ellipse };

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000', strokeWidth = 2, spin = false, style }) => {
  const nodes: IconNode[] = (ICONS as any)[name] ?? [];
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spin) return;
    rotateAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const svg = (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {nodes.map(([tag, attrs], i) => {
        const C = TAGS[tag];
        if (!C) return null;
        return <C key={i} {...attrs} />;
      })}
    </Svg>
  );

  if (!spin) return svg;
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[{ transform: [{ rotate }] }, style]}>{svg}</Animated.View>;
};
