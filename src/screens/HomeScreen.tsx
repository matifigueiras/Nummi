import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Donut } from '../components/Donut';
import { MonthNav } from '../components/MonthNav';
import { Screen } from '../components/Screen';
import { StatTile } from '../components/StatTile';
import { useApp } from '../store/AppContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { formatMoney, formatMoneyCompact, monthKey, monthKeyOf } from '../utils/format';

// Nombre mock — cuando haya perfil de usuario real sale de ahí.
const USER_NAME = 'Mati';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buen día';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function HomeScreen() {
  const { movements, savingsGoal, dolar } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const isCurrentMonth = monthKeyOf(month) === monthKeyOf(new Date());

  // Consolidado en ARS: los movimientos en USD se convierten al blue (venta).
  const { income, expense } = useMemo(() => {
    const key = monthKeyOf(month);
    let income = 0;
    let expense = 0;
    for (const mov of movements) {
      if (monthKey(mov.date) !== key) continue;
      const inArs = mov.currency === 'USD' ? mov.amount * dolar.rate.venta : mov.amount;
      if (mov.type === 'ingreso') income += inArs;
      else expense += inArs;
    }
    return { income, expense };
  }, [movements, month, dolar.rate.venta]);

  const savings = income - expense;
  const goalProgress = savingsGoal.amount > 0 ? Math.max(0, Math.min(1, savings / savingsGoal.amount)) : 0;

  return (
    <Screen>
      <MonthNav
        month={month}
        onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        nextDisabled={isCurrentMonth}
      />

      <View>
        <Text style={styles.greeting}>
          {greeting()}, {USER_NAME}
        </Text>
        <Text style={styles.subtitle}>Este es el resumen de tu mes</Text>
      </View>

      <View style={styles.dolarRow}>
        <View style={styles.dolarIcon}>
          <Feather name="dollar-sign" size={13} color={colors.accent} />
        </View>
        <Text style={styles.dolarLabel}>Dólar blue</Text>
        <Text style={styles.dolarValue}>
          {dolar.loading
            ? '—'
            : `Compra $${dolar.rate.compra.toLocaleString('es-AR')} · Venta $${dolar.rate.venta.toLocaleString('es-AR')}`}
        </Text>
      </View>

      <View style={styles.grid}>
        <StatTile
          icon="arrow-down-left"
          iconColor={colors.incomeText}
          iconBg={colors.incomeSoft}
          label="Ingresos"
          value={formatMoney(income, 'ARS')}
        />
        <StatTile
          icon="arrow-up-right"
          iconColor={colors.expenseText}
          iconBg={colors.expenseSoft}
          label="Gastos"
          value={formatMoney(expense, 'ARS')}
        />
        <StatTile
          icon="trending-up"
          iconColor={savings >= 0 ? colors.incomeText : colors.expenseText}
          iconBg={savings >= 0 ? colors.incomeSoft : colors.expenseSoft}
          label="Ahorro del mes"
          value={formatMoney(savings, 'ARS')}
        />
        <StatTile
          icon="target"
          iconColor={colors.ink}
          iconBg={colors.inkSoft}
          label="Meta de ahorro"
          value={formatMoneyCompact(savingsGoal.amount, savingsGoal.currency)}
          sub={`${Math.round(goalProgress * 100)}% alcanzado`}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${goalProgress * 100}%` }]} />
          </View>
        </StatTile>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Ingresos vs. Gastos</Text>
        <Donut income={income} expense={expense} />
      </Card>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    greeting: {
      fontSize: font.title,
      fontWeight: '700',
      color: c.ink,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: font.body,
      color: c.secondary,
      marginTop: 2,
    },
    dolarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radius.full,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    dolarIcon: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dolarLabel: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.ink,
    },
    dolarValue: {
      flex: 1,
      textAlign: 'right',
      fontSize: font.label,
      color: c.secondary,
      fontVariant: ['tabular-nums'],
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    progressTrack: {
      height: 6,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
      backgroundColor: c.accent,
    },
    cardTitle: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
      marginBottom: spacing.lg,
    },
  });
