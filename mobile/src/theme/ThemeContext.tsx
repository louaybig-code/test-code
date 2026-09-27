import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK, LIGHT, SchemeColors } from './tokens';

export type ThemeName = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeName;
  colors: SchemeColors;
  isDark: boolean;
  ready: boolean; // true once persisted preference has been read
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = 'studiopilot_theme'; // same key as the web app

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Web default: dark (src/hooks/useTheme.ts)
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setThemeState(saved);
      setReady(true);
    });
  }, []);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t);
  };

  const value = useMemo<ThemeContextValue>(() => {
    const colors = theme === 'dark' ? DARK : LIGHT;
    return {
      theme,
      colors,
      isDark: theme === 'dark',
      ready,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    };
  }, [theme, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
