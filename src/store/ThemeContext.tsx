import React, { createContext, useContext, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from '../theme';

// El modo elegido vive en memoria (la persistencia llega con el resto del
// almacenamiento). 'system' sigue la preferencia del SO/navegador.

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Modo efectivo, con 'system' ya resuelto */
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const scheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo(
    () => ({ mode, setMode, scheme, colors: scheme === 'dark' ? darkColors : lightColors }),
    [mode, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/** Memoiza un StyleSheet construido con los colores del tema activo. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: ThemeColors) => T,
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
