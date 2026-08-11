import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { WealthSnapshot } from '../types';
import { percentDelta, wealthSnapshotTotal } from '../utils/calc';
import { formatMoney, formatMonth } from '../utils/format';

// Evolución del patrimonio total (USD) mes a mes, a partir de las fotos
// guardadas en wealth_snapshots. No hay forma de reconstruir meses previos a
// que esto existiera (positions/properties no tienen historial de precio),
// así que el gráfico arranca vacío y va creciendo con el uso.

const PLOT_HEIGHT = 96;
const DOT_RADIUS = 3;

function monthDateFromKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}

interface Props {
  snapshots: WealthSnapshot[];
}

export function WealthTrend({ snapshots }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [plotWidth, setPlotWidth] = useState(0);

  const sorted = [...snapshots].sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1));

  if (sorted.length < 2) {
    return (
      <Text style={styles.empty}>
        Todavía no hay suficientes meses guardados. A partir de ahora vamos
        guardando una foto mensual acá para mostrar cómo evoluciona tu
        patrimonio con el tiempo.
      </Text>
    );
  }

  const totals = sorted.map(wealthSnapshotTotal);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const span = max - min;

  const first = totals[0];
  const last = totals[totals.length - 1];
  const growth = percentDelta(last, first);

  const onLayout = (e: LayoutChangeEvent) => setPlotWidth(e.nativeEvent.layout.width);

  const points = totals.map((total, i) => {
    const x = sorted.length > 1 ? (i / (sorted.length - 1)) * plotWidth : plotWidth / 2;
    const y = span === 0 ? PLOT_HEIGHT / 2 : PLOT_HEIGHT - ((total - min) / span) * PLOT_HEIGHT;
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
          <Text style={styles.currentLabel}>Patrimonio actual</Text>
          <Text style={styles.currentValue}>{formatMoney(last, 'USD')}</Text>
        </View>
        {growth !== null && (
          <View
            style={[
              styles.growthChip,
              { backgroundColor: growth >= 0 ? colors.incomeSoft : colors.expenseSoft },
            ]}
          >
            <Text style={[styles.growthText, { color: growth >= 0 ? colors.incomeText : colors.expenseText }]}>
              {growth >= 0 ? '+' : ''}
              {Math.round(growth)}% desde {formatMonth(monthDateFromKey(sorted[0].monthKey)).toLowerCase()}
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
                key={sorted[i].monthKey}
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
        <Text style={styles.monthLabel}>{shortMonth(monthDateFromKey(sorted[0].monthKey))}</Text>
        <Text style={styles.monthLabel}>
          {shortMonth(monthDateFromKey(sorted[sorted.length - 1].monthKey))}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    empty: {
      fontSize: font.label,
      color: c.muted,
      lineHeight: 19,
    },
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
