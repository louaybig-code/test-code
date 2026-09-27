import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface LogoProps {
  height?: number;
  width?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * StudioPilot wordmark — same theme swap as the web (Sidebar.tsx):
 *  - white.png in dark mode, dark.png in light mode.
 */
export const Logo: React.FC<LogoProps> = ({ height = 18, width, style }) => {
  const { isDark } = useTheme();
  const src = isDark
    ? require('../../assets/studiopilot-white.png')
    : require('../../assets/studiopilot-dark.png');
  // original asset is a wide wordmark; keep aspect via height only when width not given
  return (
    <Image
      source={src}
      style={[{ height, width: width ?? height * 4.6 }, style]}
      resizeMode="contain"
    />
  );
};
