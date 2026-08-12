import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BudgetsCard } from '../components/BudgetsCard';
import { Card } from '../components/Card';
import { Donut } from '../components/Donut';
import { IncomeExpenseTrend } from '../components/IncomeExpenseTrend';
import { InsightCard } from '../components/InsightCard';
import { MonthNav } from '../components/MonthNav';
import { PercentageDelta } from '../components/PercentageDelta';
import { SavingsGoalModal } from '../components/SavingsGoalModal';
import { Screen } from '../components/Screen';
import { StatTile } from '../components/StatTile';
import { TotalBalanceCard } from '../components/TotalBalanceCard';
import { useApp } from '../store/AppContext';
import { usePrivacy } from '../store/PrivacyContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import {
  budgetProgress,
  expensesByCategory,
  incomeExpenseByMonth,
  monthlyInsight,
  monthStats,
  percentDelta,
} from '../utils/calc';
import {
  formatMoney,
  formatMoneyCompact,
  formatRelativeTime,
  HIDDEN_AMOUNT,
  monthKeyOf,
} from '../utils/format';

const TREND_MONTHS = 6;

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
  const { movements, savingsGoal, budgets, dolar, dolarHistory, refreshAll } = useApp();
  const { hidden } = usePrivacy();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [showGoalModal, setShowGoalModal] = useState(false);

  const isCurrentMonth = monthKeyOf(month) === monthKeyOf(new Date());

  // Cada movimiento en USD se convierte al blue de SU fecha (si hay
  // historial cargado); si no, cae en la cotización de hoy.
  const rateForDate = useCallback(
    (date: string) => dolarHistory.rateForDate(date) ?? dolar.rate.venta,
    [dolarHistory, dolar.rate.venta],
  );

  // Las transferencias entre cajas no son ingresos ni gastos reales.
  const { income, expense, savings } = useMemo(
    () => monthStats(movements, monthKeyOf(month), rateForDate),
    [movements, month, rateForDate],
  );

  const progress = useMemo(
    () => budgetProgress(budgets, movements, monthKeyOf(month), rateForDate),
    [budgets, movements, month, rateForDate],
  );

  const trend = useMemo(
    () => incomeExpenseByMonth(movements, month, TREND_MONTHS, rateForDate),
    [movements, month, rateForDate],
  );
  // Porcentaje real (puede superar 100%); la barra visual se recorta a 100%
  const goalPct = savingsGoal.amount > 0 ? Math.max(0, (savings / savingsGoal.amount) * 100) : 0;
  const goalBarProgress = Math.min(1, goalPct / 100);

  // Mes anterior: base de comparación para la variación % y el insight.
  // Ahorro no entra acá — un "% de variación" no tiene sentido si el mes
  // pasado cerró en cero o en negativo (ver percentDelta).
  const previousMonth = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() - 1, 1),
    [month],
  );
  const previousStats = useMemo(
    () => monthStats(movements, monthKeyOf(previousMonth), rateForDate),
    [movements, previousMonth, rateForDate],
  );
  const incomeDelta = percentDelta(income, previousStats.income);
  const expenseDelta = percentDelta(expense, previousStats.expense);

  // Insight automático: mayor variación de gasto por categoría vs. el mes
  // anterior. Sin tope de categorías (a diferencia del donut de Cuentas) para
  // no perder de vista una categoría chica que cambió fuerte.
  const currentCategories = useMemo(
    () => expensesByCategory(movements, monthKeyOf(month), Infinity),
    [movements, month],
  );
  const previousCategories = useMemo(
    () => expensesByCategory(movements, monthKeyOf(previousMonth), Infinity),
    [movements, previousMonth],
  );
  const insight = useMemo(
    () => monthlyInsight(currentCategories, previousCategories),
    [currentCategories, previousCategories],
  );

  return (
    <Screen onRefresh={refreshAll}>
      <MonthNav
        month={month}
        onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        nextDisabled={isCurrentMonth}
      />

      <View style={styles.headerRow}>
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
        <View style={styles.dolarRight}>
          <Text style={styles.dolarValue}>
            {dolar.loading
              ? '—'
              : `Compra $${dolar.rate.compra.toLocaleString('es-AR')} · Venta $${dolar.rate.venta.toLocaleString('es-AR')}`}
          </Text>
          {!dolar.loading &&
            (dolar.stale ? (
              <View style={styles.dolarStaleRow}>
                <Feather name="alert-triangle" size={11} color={colors.warningText} />
                <Text style={styles.dolarStaleText}>
                  {dolar.lastUpdated
                    ? `Sin conexión · último valor ${formatRelativeTime(dolar.lastUpdated)}`
                    : 'Sin conexión · valores de referencia'}
                </Text>
              </View>
            ) : (
              dolar.lastUpdated && (
                <Text style={styles.dolarUpdated}>
                  Actualizado {formatRelativeTime(dolar.lastUpdated)}
                </Text>
              )
            ))}
        </View>
      </View>

      <TotalBalanceCard />

      <View style={styles.grid}>
        <StatTile
          icon="arrow-down-left"
          iconColor={colors.incomeText}
          iconBg={colors.incomeSoft}
          label="Ingresos"
          value={hidden ? HIDDEN_AMOUNT : formatMoney(income, 'ARS')}
        >
          {!hidden && incomeDelta !== null && <PercentageDelta value={incomeDelta} />}
        </StatTile>
        <StatTile
          icon="arrow-up-right"
          iconColor={colors.expenseText}
          iconBg={colors.expenseSoft}
          label="Gastos"
          value={hidden ? HIDDEN_AMOUNT : formatMoney(expense, 'ARS')}
        >
          {!hidden && expenseDelta !== null && <PercentageDelta value={expenseDelta} invertColors />}
        </StatTile>
        <StatTile
          icon="trending-up"
          iconColor={savings >= 0 ? colors.incomeText : colors.expenseText}
          iconBg={savings >= 0 ? colors.incomeSoft : colors.expenseSoft}
          label="Ahorro del mes"
          value={hidden ? HIDDEN_AMOUNT : formatMoney(savings, 'ARS')}
        />
        <StatTile
          icon="target"
          iconColor={colors.ink}
          iconBg={colors.inkSoft}
          label="Meta de ahorro"
          value={hidden ? HIDDEN_AMOUNT : formatMoneyCompact(savingsGoal.amount, savingsGoal.currency)}
          sub={`${Math.round(goalPct)}% alcanzado`}
          onPress={() => setShowGoalModal(true)}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${goalBarProgress * 100}%` }]} />
          </View>
        </StatTile>
      </View>

      <InsightCard insight={insight} />

      <Card>
        <Text style={styles.cardTitle}>Ingresos vs. Gastos</Text>
        <Donut income={income} expense={expense} />
      </Card>

      <BudgetsCard progress={progress} editable={isCurrentMonth} />

      <Card>
        <Text style={styles.cardTitle}>Ingresos y gastos por mes</Text>
        <IncomeExpenseTrend key={monthKeyOf(month)} data={trend} />
      </Card>

      <SavingsGoalModal visible={showGoalModal} onClose={() => setShowGoalModal(false)} />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'column',
    },
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
    dolarRight: {
      flex: 1,
      alignItems: 'flex-end',
      gap: 1,
    },
    dolarValue: {
      fontSize: font.label,
      color: c.secondary,
      fontVariant: ['tabular-nums'],
    },
    dolarUpdated: {
      fontSize: font.caption,
      color: c.muted,
    },
    dolarStaleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dolarStaleText: {
      fontSize: font.caption,
      color: c.warningText,
      fontWeight: '600',
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
