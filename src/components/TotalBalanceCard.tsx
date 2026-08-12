import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../store/AppContext';
import { usePrivacy } from '../store/PrivacyContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { percentDelta, wealthBreakdown, wealthSnapshotTotal } from '../utils/calc';
import { formatMoney, HIDDEN_AMOUNT } from '../utils/format';

// Card "Saldo total" arriba de Home. Toca para alternar entre el saldo de
// cuentas (en pesos, sin historial) y el patrimonio total (en USD, con
// sparkline real a partir de wealth_snapshots — ver WealthTrend).

const SPARK_HEIGHT = 40;

type Mode = 'cuentas' | 'patrimonio';

export function TotalBalanceCard() {
  const { accounts, movements, positions, properties, dolar, wealthSnapshots } = useApp();
  const { hidden, toggleHidden } = usePrivacy();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<Mode>('cuentas');
  const [sparkWidth, setSparkWidth] = useState(0);

  const cashTotalArs = useMemo(() => {
    if (dolar.loading) return 0;
    const breakdown = wealthBreakdown(accounts, movements, positions, properties, dolar.rate.venta);
    return breakdown.cashUsd * dolar.rate.venta;
  }, [accounts, movements, positions, properties, dolar.loading, dolar.rate.venta]);

  const sortedSnapshots = useMemo(
    () => [...wealthSnapshots].sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1)),
    [wealthSnapshots],
  );
  const patrimonioTotals = sortedSnapshots.map(wealthSnapshotTotal);
  const patrimonioLast = patrimonioTotals[patrimonioTotals.length - 1] ?? 0;
  const patrimonioDelta =
    patrimonioTotals.length >= 2
      ? percentDelta(patrimonioLast, patrimonioTotals[patrimonioTotals.length - 2])
      : null;
  const hasTrend = patrimonioTotals.length >= 2;

  const onSparkLayout = (e: LayoutChangeEvent) => setSparkWidth(e.nativeEvent.layout.width);

  const sparkPath = useMemo(() => {
    if (!hasTrend || sparkWidth === 0) return '';
    const min = Math.min(...patrimonioTotals);
    const max = Math.max(...patrimonioTotals);
    const span = max - min;
    const points = patrimonioTotals.map((total, i) => {
      const x = (i / (patrimonioTotals.length - 1)) * sparkWidth;
      const y = span === 0 ? SPARK_HEIGHT / 2 : SPARK_HEIGHT - ((total - min) / span) * SPARK_HEIGHT;
      return { x, y };
    });
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [hasTrend, sparkWidth, patrimonioTotals]);

  const label = mode === 'cuentas' ? 'Saldo de cuentas' : 'Patrimonio total';
  const value =
    mode === 'cuentas' ? formatMoney(cashTotalArs, 'ARS') : formatMoney(patrimonioLast, 'USD');
  const delta = mode === 'patrimonio' ? patrimonioDelta : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.accent }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setMode((m) => (m === 'cuentas' ? 'patrimonio' : 'cuentas'))}
          style={styles.labelRow}
          accessibilityRole="button"
          accessibilityLabel="Tocar para ver otro total"
          hitSlop={8}
        >
          <Text style={styles.label}>{label}</Text>
          <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Pressable
          onPress={toggleHidden}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar saldo' : 'Ocultar saldo'}
        >
          <Feather name={hidden ? 'eye-off' : 'eye'} size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      <Pressable
        onPress={() => setMode((m) => (m === 'cuentas' ? 'patrimonio' : 'cuentas'))}
        accessibilityRole="button"
        accessibilityLabel="Tocar para ver otro total"
      >
        <Text style={styles.value}>{hidden ? HIDDEN_AMOUNT : value}</Text>

        {!hidden && delta !== null && (
          <View style={styles.deltaRow}>
            <Feather name={delta >= 0 ? 'arrow-up-right' : 'arrow-down-right'} size={11} color="#FFFFFF" />
            <Text style={styles.deltaText}>
              {delta >= 0 ? '+' : ''}
              {Math.round(delta)}% vs. mes anterior
            </Text>
          </View>
        )}

        {mode === 'patrimonio' && hasTrend && (
          <View style={styles.sparkWrap} onLayout={onSparkLayout}>
            {sparkWidth > 0 && (
              <Svg width={sparkWidth} height={SPARK_HEIGHT}>
                <Path d={sparkPath} fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round" />
              </Svg>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    label: {
      fontSize: font.label,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
    },
    value: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: spacing.xs,
      fontVariant: ['tabular-nums'],
    },
    deltaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.xs,
    },
    deltaText: {
      fontSize: font.caption,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    sparkWrap: {
      height: SPARK_HEIGHT,
      marginTop: spacing.md,
    },
  });
