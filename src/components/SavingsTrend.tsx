import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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
          {data.map((item) => (
            <Column
              key={item.key}
              item={item}
              isSelected={item.key === selected.key}
              positiveZone={positiveZone}
              negativeZone={negativeZone}
              maxPositive={maxPositive}
              maxNegative={maxNegative}
              onSelect={() => setSelectedKey(item.key)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function Column({
  item,
  isSelected,
  positiveZone,
  negativeZone,
  maxPositive,
  maxNegative,
  onSelect,
}: {
  item: MonthlySavings;
  isSelected: boolean;
  positiveZone: number;
  negativeZone: number;
  maxPositive: number;
  maxNegative: number;
  onSelect: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const positive = item.savings >= 0;
  const rawHeight = positive
    ? maxPositive > 0
      ? (item.savings / maxPositive) * positiveZone
      : 0
    : maxNegative > 0
      ? (-item.savings / maxNegative) * negativeZone
      : 0;
  const targetHeight = positive
    ? Math.max(rawHeight, item.savings > 0 ? 3 : 0)
    : Math.max(rawHeight, 3);

  const height = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(isSelected ? 1 : 0.45)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: targetHeight,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height no es animable por el driver nativo
    }).start();
    // Se re-dispara con targetHeight a propósito: si cambian los datos del
    // rango, la columna anima hacia el nuevo alto en vez de saltar.
  }, [targetHeight, height]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isSelected ? 1 : 0.45,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isSelected, opacity]);

  return (
    <Pressable style={styles.column} onPress={onSelect}>
      <View style={[styles.positiveZone, { height: positiveZone }]}>
        {positive && (
          <Animated.View
            style={[styles.bar, styles.barPositive, { height, backgroundColor: colors.income, opacity }]}
          />
        )}
      </View>
      <View style={[styles.negativeZone, { height: negativeZone }]}>
        {!positive && (
          <Animated.View
            style={[styles.bar, styles.barNegative, { height, backgroundColor: colors.expense, opacity }]}
          />
        )}
      </View>
      <Text style={[styles.monthLabel, isSelected && styles.monthLabelSelected]}>
        {shortMonth(item.date)}
      </Text>
    </Pressable>
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
