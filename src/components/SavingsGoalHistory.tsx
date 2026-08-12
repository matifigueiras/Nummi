import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { MonthlyIncomeExpense } from '../utils/calc';

// Ahorro real de cada mes contra la meta: verde si ese mes la alcanzó,
// naranja si no. Una línea punteada marca el nivel de la meta para que se
// pueda comparar de un vistazo, sin tener que leer cada barra.

const PLOT_HEIGHT = 90;

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}

interface Props {
  data: MonthlyIncomeExpense[];
  goalAmount: number;
}

export function SavingsGoalHistory({ data, goalAmount }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (data.length < 2 || goalAmount <= 0) return null;

  const savings = data.map((d) => d.income - d.expense);
  const max = Math.max(goalAmount, ...savings, 1);
  const goalLineTop = PLOT_HEIGHT - (goalAmount / max) * PLOT_HEIGHT;

  return (
    <View>
      <Text style={styles.title}>Meses que cumpliste la meta</Text>
      <View style={styles.plotWrap}>
        <View style={[styles.goalLine, { top: goalLineTop, borderColor: colors.muted }]} />
        <View style={styles.plot}>
          {data.map((d, i) => (
            <Bar key={d.key} value={savings[i]} max={max} goalAmount={goalAmount} date={d.date} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Bar({
  value,
  max,
  goalAmount,
  date,
}: {
  value: number;
  max: number;
  goalAmount: number;
  date: Date;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const met = value >= goalAmount;
  const target = Math.max((Math.max(value, 0) / max) * PLOT_HEIGHT, value > 0 ? 3 : 0);
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: target,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [target, height]);

  return (
    <View style={styles.column}>
      <Animated.View
        style={[styles.bar, { height, backgroundColor: met ? colors.income : colors.expense }]}
      />
      <Text style={styles.monthLabel}>{shortMonth(date)}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.secondary,
      marginBottom: spacing.md,
    },
    plotWrap: {
      position: 'relative',
    },
    goalLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderStyle: 'dashed',
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
    bar: {
      width: '100%',
      maxWidth: 24,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    monthLabel: {
      fontSize: font.caption,
      color: c.muted,
      marginTop: spacing.sm,
    },
  });
