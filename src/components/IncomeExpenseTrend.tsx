import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { MonthlyIncomeExpense } from '../utils/calc';
import { formatMoney, formatMonth } from '../utils/format';

// Ingresos y gastos por mes: dos columnas por mes (mismos colores que el
// donut "Ingresos vs. Gastos"), para ver de un vistazo cómo se compone el
// ahorro además de cuánto dio, no sólo el neto.

const PLOT_HEIGHT = 96;

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}

interface Props {
  data: MonthlyIncomeExpense[];
}

export function IncomeExpenseTrend({ data }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (data.length === 0) return null;

  const selected = data.find((d) => d.key === selectedKey) ?? data[data.length - 1];
  const max = Math.max(0, ...data.map((d) => Math.max(d.income, d.expense)));

  return (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.selectedMonth}>{formatMonth(selected.date)}</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
              <Text style={styles.legendValue}>{formatMoney(selected.income, 'ARS')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
              <Text style={styles.legendValue}>{formatMoney(selected.expense, 'ARS')}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.plot}>
        {data.map((item) => (
          <MonthColumn
            key={item.key}
            item={item}
            isSelected={item.key === selected.key}
            max={max}
            onSelect={() => setSelectedKey(item.key)}
          />
        ))}
      </View>
    </View>
  );
}

function MonthColumn({
  item,
  isSelected,
  max,
  onSelect,
}: {
  item: MonthlyIncomeExpense;
  isSelected: boolean;
  max: number;
  onSelect: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const incomeTarget = max > 0 ? Math.max((item.income / max) * PLOT_HEIGHT, item.income > 0 ? 3 : 0) : 0;
  const expenseTarget = max > 0 ? Math.max((item.expense / max) * PLOT_HEIGHT, item.expense > 0 ? 3 : 0) : 0;

  const incomeHeight = useRef(new Animated.Value(0)).current;
  const expenseHeight = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(isSelected ? 1 : 0.45)).current;

  useEffect(() => {
    Animated.timing(incomeHeight, {
      toValue: incomeTarget,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [incomeTarget, incomeHeight]);

  useEffect(() => {
    Animated.timing(expenseHeight, {
      toValue: expenseTarget,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expenseTarget, expenseHeight]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isSelected ? 1 : 0.45,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isSelected, opacity]);

  return (
    <Pressable style={styles.column} onPress={onSelect}>
      <View style={styles.barsRow}>
        <Animated.View
          style={[styles.bar, { height: incomeHeight, backgroundColor: colors.income, opacity }]}
        />
        <Animated.View
          style={[styles.bar, { height: expenseHeight, backgroundColor: colors.expense, opacity }]}
        />
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
      marginBottom: spacing.xxl + spacing.lg,
    },
    selectedMonth: {
      fontSize: font.label,
      color: c.secondary,
    },
    legendRow: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: 4,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
    },
    legendValue: {
      fontSize: 17,
      fontWeight: '700',
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    plot: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      height: PLOT_HEIGHT,
    },
    column: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
    },
    barsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
    },
    bar: {
      width: 10,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
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
