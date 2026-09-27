import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { BRAND, FONT, RADIUS, SchemeColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  /** Icon-only variant content */
  title?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Button — exact port of web `components/ui/Button.tsx` variants:
 *  primary   → orange bg, white text, brand shadow
 *  secondary → teal soft bg (teal08) + teal border
 *  ghost     → transparent, muted text
 *  danger    → red soft bg + red border
 *  icon      → 32×32 neutral square
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  isLoading,
  icon,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();
  const s = styles(colors);

  const v = variantStyles(colors)[variant];
  const sz = sizeConfig[size];
  const isIcon = variant === 'icon';

  const content = (
    <>
      {isLoading ? (
        <Spinner size={sz.iconSize} color={v.textColor} />
      ) : (
        icon &&
        (typeof icon === 'string' ? (
          <Icon name={icon as any} size={sz.iconSize} color={v.textColor} strokeWidth={2.5} />
        ) : (
          icon
        ))
      )}
      {!!children && (
        <Text numberOfLines={1} style={[baseText(sz), { color: v.textColor }, textStyle]}>
          {children}
        </Text>
      )}
    </>
  );

  return (
    <Pressable
      onPress={isLoading || disabled ? undefined : onPress}
      disabled={isLoading || disabled}
      style={({ pressed }) => [
        s.base,
        {
          height: sz.height,
          borderRadius: sz.radius,
          paddingHorizontal: isIcon ? 0 : sz.px,
          width: isIcon ? sz.height : undefined,
          backgroundColor: pressed ? v.pressedBg : v.bg,
          borderColor: v.border ?? undefined,
          borderWidth: v.border ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        v.shadow && {
          shadowColor: pressed ? '#000' : '#E8531A',
          shadowOpacity: pressed ? 0.12 : 0.35,
          shadowRadius: pressed ? 6 : 10,
          shadowOffset: { width: 0, height: pressed ? 2 : 4 },
          elevation: pressed ? 2 : 5,
        },
        style,
      ]}
    >
      {isIcon ? <View style={s.iconWrap}>{content}</View> : <View style={s.row}>{content}</View>}
    </Pressable>
  );
};

function styles(colors: SchemeColors) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

const baseText = (sz: { fontSize: number }): TextStyle => ({
  fontSize: sz.fontSize,
  fontFamily: FONT.inter.semibold,
  letterSpacing: 0.1,
});

const sizeConfig: Record<Size, { height: number; px: number; radius: number; fontSize: number; iconSize: number }> = {
  sm: { height: 34, px: 12, radius: RADIUS.md, fontSize: 12.5, iconSize: 14 },
  md: { height: 40, px: 16, radius: RADIUS.lg, fontSize: 14, iconSize: 16 },
  lg: { height: 46, px: 20, radius: RADIUS.lg, fontSize: 14, iconSize: 16 },
};

function variantStyles(colors: SchemeColors): Record<
  Variant,
  { bg: string; pressedBg: string; textColor: string; border: string | null; shadow: boolean }
> {
  return {
    primary: {
      bg: BRAND.orange,
      pressedBg: BRAND.orange90,
      textColor: '#FFFFFF',
      border: null,
      shadow: true,
    },
    secondary: {
      bg: BRAND.teal08,
      pressedBg: BRAND.teal15,
      textColor: BRAND.teal,
      border: 'rgba(26, 140, 140, 0.45)',
      shadow: false,
    },
    ghost: {
      bg: 'transparent',
      pressedBg: colors.surface2,
      textColor: colors.textSecondary,
      border: null,
      shadow: false,
    },
    danger: {
      bg: 'rgba(239, 68, 68, 0.10)',
      pressedBg: 'rgba(239, 68, 68, 0.18)',
      textColor: '#EF4444',
      border: 'rgba(239, 68, 68, 0.45)',
      shadow: false,
    },
    icon: {
      bg: 'transparent',
      pressedBg: colors.surface2,
      textColor: colors.textSecondary,
      border: null,
      shadow: false,
    },
  };
}
