import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, shadow, spacing, ThemeColors } from '../theme';

// Tab bar propia: Home · Cuentas · (●) FAB · Patrimonio · Más
// El FAB no es una ruta — dispara el modal de nuevo movimiento.

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Cuentas: 'credit-card',
  Patrimonio: 'pie-chart',
  Más: 'more-horizontal',
};

interface Props extends BottomTabBarProps {
  onFabPress: () => void;
}

export function TabBar({ state, navigation, onFabPress }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const renderTab = (routeName: string, index: number) => {
    const focused = state.index === index;
    return (
      <Pressable
        key={routeName}
        style={styles.tab}
        onPress={() => {
          if (!focused) navigation.navigate(routeName);
        }}
      >
        <Feather name={ICONS[routeName]} size={22} color={focused ? colors.ink : colors.muted} />
        <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{routeName}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.inner}>
        {renderTab('Home', 0)}
        {renderTab('Cuentas', 1)}
        <View style={styles.tab}>
          <Pressable style={styles.fab} onPress={onFabPress}>
            <Feather name="plus" size={26} color={colors.inverse} />
          </Pressable>
        </View>
        {renderTab('Patrimonio', 2)}
        {renderTab('Más', 3)}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    bar: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    inner: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    tabLabel: {
      fontSize: font.caption,
      fontWeight: '500',
      color: c.muted,
    },
    tabLabelFocused: {
      color: c.ink,
      fontWeight: '600',
    },
    fab: {
      width: 54,
      height: 54,
      borderRadius: radius.full,
      backgroundColor: c.ink,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -26,
      ...shadow.fab,
    },
  });
