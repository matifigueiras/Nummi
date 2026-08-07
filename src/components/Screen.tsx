import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../store/ThemeContext';
import { spacing, ThemeColors } from '../theme';

// Wrapper común de pantalla: fondo, scroll, safe area y ancho máximo tipo
// teléfono para que en el navegador de escritorio no se estire de más.

const MAX_WIDTH = 520;

export function Screen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scroll: {
      flex: 1,
    },
    content: {
      width: '100%',
      maxWidth: MAX_WIDTH,
      alignSelf: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
  });
