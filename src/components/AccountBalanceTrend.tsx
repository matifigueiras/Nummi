import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { Currency } from '../types';
import { MonthlyAccountBalance, percentDelta } from '../utils/calc';
import { formatMoney, formatMonth } from '../utils/format';

// Evolución del saldo de la cuenta elegida, mes a mes. A diferencia del
// patrimonio, esto es histórico real: el saldo de una cuenta se puede
// reconstruir exacto para cualquier mes pasado a partir de los movimientos
// guardados, sin depender de ningún snapshot.

const PLOT_HEIGHT = 96;
const DOT_RADIUS = 3;

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}

interface Props {
  data: MonthlyAccountBalance[];
  currency: Currency;
}

export function AccountBalanceTrend({ data, currency }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [plotWidth, setPlotWidth] = useState(0);

  if (data.length < 2) return null;

  const balances = data.map((d) => d.balance);
  const min = Math.min(...balances);
  const max = Math.max(...balances);
  const span = max - min;

  const first = balances[0];
  const last = balances[balances.length - 1];
  const growth = percentDelta(last, first);

  const onLayout = (e: LayoutChangeEvent) => setPlotWidth(e.nativeEvent.layout.width);

  const points = balances.map((balance, i) => {
    const x = (i / (data.length - 1)) * plotWidth;
    const y = span === 0 ? PLOT_HEIGHT / 2 : PLOT_HEIGHT - ((balance - min) / span) * PLOT_HEIGHT;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${PLOT_HEIGHT} L ${points[0].x} ${PLOT_HEIGHT} Z`
      : '';

  return (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.currentLabel}>Evolución del saldo</Text>
          <Text style={styles.currentValue}>{formatMoney(last, currency)}</Text>
        </View>
        {growth !== null && (
          <View
            style={[
              styles.growthChip,
              { backgroundColor: growth >= 0 ? colors.incomeSoft : colors.expenseSoft },
            ]}
          >
            <Text
              style={[styles.growthText, { color: growth >= 0 ? colors.incomeText : colors.expenseText }]}
            >
              {growth >= 0 ? '+' : ''}
              {Math.round(growth)}% desde {formatMonth(data[0].date).toLowerCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.plot} onLayout={onLayout}>
        {plotWidth > 0 && (
          <Svg width={plotWidth} height={PLOT_HEIGHT}>
            <Path d={areaPath} fill={colors.accentSoft} stroke="none" />
            <Path d={linePath} fill="none" stroke={colors.accent} strokeWidth={2} strokeLinejoin="round" />
            {points.map((p, i) => (
              <Circle
                key={data[i].key}
                cx={p.x}
                cy={p.y}
                r={i === points.length - 1 ? DOT_RADIUS + 1 : DOT_RADIUS}
                fill={colors.accent}
              />
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.labelsRow}>
        <Text style={styles.monthLabel}>{shortMonth(data[0].date)}</Text>
        <Text style={styles.monthLabel}>{shortMonth(data[data.length - 1].date)}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    currentLabel: {
      fontSize: font.label,
      color: c.secondary,
    },
    currentValue: {
      fontSize: 22,
      fontWeight: '700',
      color: c.ink,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    growthChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full,
    },
    growthText: {
      fontSize: font.caption,
      fontWeight: '700',
    },
    plot: {
      height: PLOT_HEIGHT,
      marginTop: spacing.lg,
    },
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    monthLabel: {
      fontSize: font.caption,
      color: c.muted,
    },
  });
