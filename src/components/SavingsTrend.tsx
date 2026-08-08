import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { MonthlySavings } from '../utils/calc';
import { formatMoney, formatMonth } from '../utils/format';

// Ahorro por mes: columnas sobre una línea de cero. Verde si el mes cerró
// ahorrando, naranja si se gastó de más — el mismo par de colores que usa el
// resto de la app. Una sola serie, así que no lleva leyenda; el valor del mes
// elegido se muestra arriba y cada columna se puede tocar para verlo.

const PLOT_HEIGHT = 96;
const MAX_BAR_WIDTH = 24;

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}

interface Props {
  data: MonthlySavings[];
}

export function SavingsTrend({ data }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Por defecto se muestra el mes más reciente del rango
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (data.length === 0) return null;

  const selected = data.find((d) => d.key === selectedKey) ?? data[data.length - 1];

  const maxPositive = Math.max(0, ...data.map((d) => d.savings));
  const maxNegative = Math.max(0, ...data.map((d) => -d.savings));
  const span = maxPositive + maxNegative;
  // Si no hay negativos, todo el alto es zona positiva (y viceversa)
  const positiveZone = span === 0 ? PLOT_HEIGHT : (maxPositive / span) * PLOT_HEIGHT;
  const negativeZone = PLOT_HEIGHT - positiveZone;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.selectedMonth}>{formatMonth(selected.date)}</Text>
        <Text
          style={[
            styles.selectedValue,
            { color: selected.savings >= 0 ? colors.incomeText : colors.expenseText },
          ]}
        >
          {formatMoney(selected.savings, 'ARS')}
        </Text>
      </View>

      <View>
        {/* Línea de cero: una sola hairline continua detrás de las columnas */}
        <View style={[styles.zeroLine, { top: positiveZone, backgroundColor: colors.border }]} />
        <View style={styles.plot}>
          {data.map((item) => {
          const isSelected = item.key === selected.key;
          const positive = item.savings >= 0;
          const barHeight = positive
            ? maxPositive > 0
              ? (item.savings / maxPositive) * positiveZone
              : 0
            : maxNegative > 0
              ? (-item.savings / maxNegative) * negativeZone
              : 0;
            return (
              <Pressable
                key={item.key}
                style={styles.column}
                onPress={() => setSelectedKey(item.key)}
              >
                <View style={[styles.positiveZone, { height: positiveZone }]}>
                  {positive && (
                    <View
                      style={[
                        styles.bar,
                        styles.barPositive,
                        {
                          height: Math.max(barHeight, item.savings > 0 ? 3 : 0),
                          backgroundColor: colors.income,
                          opacity: isSelected ? 1 : 0.45,
                        },
                      ]}
                    />
                  )}
                </View>
                <View style={[styles.negativeZone, { height: negativeZone }]}>
                  {!positive && (
                    <View
                      style={[
                        styles.bar,
                        styles.barNegative,
                        {
                          height: Math.max(barHeight, 3),
                          backgroundColor: colors.expense,
                          opacity: isSelected ? 1 : 0.45,
                        },
                      ]}
                    />
                  )}
                </View>
                <Text style={[styles.monthLabel, isSelected && styles.monthLabelSelected]}>
                  {shortMonth(item.date)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    selectedMonth: {
      fontSize: font.label,
      color: c.secondary,
    },
    selectedValue: {
      fontSize: 20,
      fontWeight: '700',
    },
    plot: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    column: {
      flex: 1,
      alignItems: 'center',
    },
    positiveZone: {
      width: '100%',
      maxWidth: MAX_BAR_WIDTH,
      justifyContent: 'flex-end',
    },
    negativeZone: {
      width: '100%',
      maxWidth: MAX_BAR_WIDTH,
      justifyContent: 'flex-start',
    },
    zeroLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
    },
    bar: {
      width: '100%',
    },
    barPositive: {
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    barNegative: {
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 4,
    },
    monthLabel: {
      fontSize: font.caption,
      color: c.muted,
      marginTop: spacing.sm,
      fontVariant: ['tabular-nums'],
    },
    monthLabelSelected: {
      color: c.ink,
      fontWeight: '700',
    },
  });
