import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  useFonts as useSoraFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppStateProvider } from './src/state/AppStateContext';
import { ToastHost } from './src/components/toast';
import { FONT, PHONE_FRAME_W } from './src/theme/tokens';
import { Logo } from './src/components/Logo';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { AppShell } from './src/shell/AppShell';

/** Boot splash while auth restores (web shows the brand spinner). */
const BootSplash: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.boot, { backgroundColor: colors.bg }]}>
      <Logo width={150} height={32} />
      <ActivityIndicator color="#E8531A" style={{ marginTop: 24 }} />
    </View>
  );
};

/**
 * WebFrame — on desktop web the app renders inside a centered phone-width
 * frame (so absolute elements like the FAB, drawer and toasts stay inside
 * the "screen"); on native or narrow windows it's a no-op pass-through.
 */
const WebFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const framed = Platform.OS === 'web' && width > 640;
  if (!framed) return <View style={{ flex: 1 }}>{children}</View>;
  return (
    <View style={[styles.frameOuter, { backgroundColor: colors.surface2 }]}>
      <View
        style={[
          styles.frameInner,
          { width: PHONE_FRAME_W, borderColor: colors.border, backgroundColor: colors.bg },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const Root: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <BootSplash />;
  if (!user) return <AuthScreen />;
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
};

export default function App() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });
  const [soraLoaded] = useSoraFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  if (!interLoaded || !soraLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStatusBar />
          <WebFrame>
            <Root />
            <ToastHost />
          </WebFrame>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
};

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
});
