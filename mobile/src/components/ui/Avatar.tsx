import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FONT, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { getUserInitials } from '../../lib/constants';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  size?: Size;
  style?: StyleProp<ViewStyle>;
  /** Colored ring around the avatar */
  ringColor?: string;
}

const SIZES: Record<Size, { d: number; fontSize: number }> = {
  sm: { d: 24, fontSize: 9 },
  md: { d: 32, fontSize: 11 },
  lg: { d: 44, fontSize: 14 },
  xl: { d: 64, fontSize: 20 },
};

/**
 * Avatar — port of web `components/ui/Avatar.tsx`.
 * Premium tiny card: 1px border, theme-aware tint, initials centered.
 */
export const Avatar: React.FC<AvatarProps> = ({ src, firstName, lastName, email, size = 'md', style, ringColor }) => {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const { d, fontSize } = SIZES[size];
  const initials = getUserInitials(firstName, lastName, email);

  return (
    <View
      style={[
        styles.ring,
        ringColor
          ? { borderColor: ringColor, borderWidth: 1.5, borderRadius: (d + 4) / 2 + 1.5, padding: 2 }
          : { borderRadius: (d + 2) / 2 + 1, borderWidth: 1, borderColor: colors.border, padding: 1, backgroundColor: colors.surface },
        style,
      ]}
    >
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: colors.surface2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {src && !failed ? (
          <Image source={{ uri: src }} style={{ width: d, height: d }} resizeMode="cover" onError={() => setFailed(true)} />
        ) : (
          <Text style={{ color: colors.text, fontSize, fontFamily: FONT.inter.extrabold }}>{initials}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
