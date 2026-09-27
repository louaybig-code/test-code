import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { FONT, RADIUS } from '../../theme/tokens';
import { Icon } from '../Icon';

/**
 * Badge — port of web `components/ui/Badge.tsx`.
 * Variants: colored (name of a badge color), solid, soft, outline, success, warning, danger, info.
 */
export type BadgeColor = 'blue' | 'green' | 'orange' | 'red' | 'yellow' | 'purple' | 'teal' | 'charcoal' | 'violet' | 'indigo' | 'gray' | 'rose';

const COLOR_MAP: Record<BadgeColor, string> = {
  blue: '#3B82F6',
  green: '#10B981',
  orange: '#F97316',
  red: '#EF4444',
  yellow: '#F59E0B',
  purple: '#A855F7',
  teal: '#14B8A6',
  charcoal: '#6B7280',
  violet: '#8B5CF6',
  indigo: '#6366F1',
  gray: '#6B7280',
  rose: '#F43F5E',
};

interface BadgeProps {
  color?: BadgeColor;
  variant?: 'solid' | 'soft' | 'outline';
  dot?: boolean;
  iconName?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  color = 'blue',
  variant = 'soft',
  dot,
  icon,
  iconName,
  children,
  size = 'sm',
  style,
  textStyle,
}) => {
  const hex = COLOR_MAP[color] ?? color;
  const sm = size === 'sm';

  const bg = variant === 'solid' ? hex : variant === 'soft' ? hex + '1F' : 'transparent';
  const border = variant === 'solid' ? 'transparent' : variant === 'soft' ? hex + '33' : hex + '66';
  const textColor = variant === 'solid' ? '#fff' : hex;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: sm ? 6 : 8,
          paddingVertical: sm ? 2 : 4,
          borderRadius: sm ? 8 : 10,
          gap: sm ? 4 : 6,
        },
        style,
      ]}
    >
      {dot && <View style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: sm ? 2.5 : 3, backgroundColor: textColor }} />}
      {iconName && <Icon name={iconName as any} size={sm ? 10 : 12} color={textColor} strokeWidth={2.5} />}
      {icon}
      {!!children && (
        <Text style={[styles.text, { color: textColor, fontSize: size === 'sm' ? 10.5 : 11.5 }, textStyle]} numberOfLines={1}>
          {children}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FONT.inter.semibold,
  },
});
