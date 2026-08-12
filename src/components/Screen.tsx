import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { spacing, ThemeColors } from '../theme';

// Wrapper común de pantalla: fondo, scroll, safe area y ancho máximo tipo
// teléfono para que en el navegador de escritorio no se estire de más.
//
// Pull-to-refresh a mano: como PWA standalone en iOS no hay barra de Safari
// que recargue la página al tirar hacia abajo, y react-native-web no
// implementa el gesto real de <RefreshControl> (sólo renderiza un View
// vacío) — así que se arma el gesto con touch events + un indicador propio.

const MAX_WIDTH = 520;
const PULL_THRESHOLD = 64;
const PULL_MAX = 90;
const PULL_RESISTANCE = 0.5;

interface Props {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export function Screen({ children, onRefresh }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollYRef = useRef(0);
  const startYRef = useRef<number | null>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  };

  // En nativo, GestureResponderEvent.nativeEvent trae pageY directo. En web
  // (react-native-web) nativeEvent es el TouchEvent del DOM tal cual, sin
  // aplanar: el pageY está adentro de touches[0].
  const touchPageY = (e: GestureResponderEvent): number | undefined => {
    const native = e.nativeEvent as unknown as { pageY?: number; touches?: { pageY: number }[] };
    return native.touches?.[0]?.pageY ?? native.pageY;
  };

  const handleTouchStart = (e: GestureResponderEvent) => {
    if (!onRefresh || refreshing) return;
    startYRef.current = touchPageY(e) ?? null;
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (!onRefresh || refreshing || startYRef.current === null) return;
    if (scrollYRef.current > 0) return;
    const y = touchPageY(e);
    if (y === undefined) return;
    const delta = y - startYRef.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    setPull(Math.min(delta * PULL_RESISTANCE, PULL_MAX));
  };

  const handleTouchEnd = () => {
    startYRef.current = null;
    if (!onRefresh || refreshing) return;
    if (pull >= PULL_THRESHOLD) {
      setRefreshing(true);
      onRefresh().finally(() => {
        setRefreshing(false);
        setPull(0);
      });
    } else {
      setPull(0);
    }
  };

  const indicatorOffset = insets.top + spacing.md;
  const showIndicator = pull > 0 || refreshing;

  return (
    <View style={styles.root}>
      {showIndicator && (
        <View style={[styles.indicator, { top: indicatorOffset }]}>
          {refreshing ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <View style={{ opacity: Math.min(pull / PULL_THRESHOLD, 1) }}>
              <Feather name="arrow-down" size={18} color={colors.muted} />
            </View>
          )}
        </View>
      )}
      <ScrollView
        style={[
          styles.scroll,
          // Sólo se aplica el transform mientras hace falta: dejarlo puesto
          // en translateY(0) de forma permanente le crea a Safari una capa
          // de composición aparte, que deja una costura/línea visible en el
          // borde de abajo del ScrollView incluso en reposo.
          showIndicator && { transform: [{ translateY: refreshing ? PULL_THRESHOLD * 0.6 : pull }] },
        ]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onRefresh ? handleScroll : undefined}
        scrollEventThrottle={16}
        onTouchStart={onRefresh ? handleTouchStart : undefined}
        onTouchMove={onRefresh ? handleTouchMove : undefined}
        onTouchEnd={onRefresh ? handleTouchEnd : undefined}
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
    indicator: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1,
    },
    content: {
      width: '100%',
      maxWidth: MAX_WIDTH,
      alignSelf: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
  });
