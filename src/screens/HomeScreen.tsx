import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Donut } from '../components/Donut';
import { MonthNav } from '../components/MonthNav';
import { SavingsGoalModal } from '../components/SavingsGoalModal';
import { SavingsTrend } from '../components/SavingsTrend';
import { Screen } from '../components/Screen';
import { StatTile } from '../components/StatTile';
import { useApp } from '../store/AppContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { monthStats, savingsByMonth } from '../utils/calc';
import {
  formatMoney,
  formatMoneyCompact,
  formatRelativeTime,
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
  const { movements, savingsGoal, dolar } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [showGoalModal, setShowGoalModal] = useState(false);

  const isCurrentMonth = monthKeyOf(month) === monthKeyOf(new Date());

  // Consolidado en ARS: los movimientos en USD se convierten al blue (venta).
  // Las transferencias entre cajas no son ingresos ni gastos reales.
  const { income, expense, savings } = useMemo(
    () => monthStats(movements, monthKeyOf(month), dolar.rate.venta),
    [movements, month, dolar.rate.venta],
  );

  const trend = useMemo(
    () => savingsByMonth(movements, month, TREND_MONTHS, dolar.rate.venta),
    [movements, month, dolar.rate.venta],
  );
  // Porcentaje real (puede superar 100%); la barra visual se recorta a 100%
  const goalPct = savingsGoal.amount > 0 ? Math.max(0, (savings / savingsGoal.amount) * 100) : 0;
  const goalBarProgress = Math.min(1, goalPct / 100);

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
          sub={`${Math.round(goalPct)}% alcanzado · tocá para editar`}
          onPress={() => setShowGoalModal(true)}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${goalBarProgress * 100}%` }]} />
          </View>
        </StatTile>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Ingresos vs. Gastos</Text>
        <Donut income={income} expense={expense} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Ahorro por mes</Text>
        <SavingsTrend key={monthKeyOf(month)} data={trend} />
      </Card>

      <SavingsGoalModal visible={showGoalModal} onClose={() => setShowGoalModal(false)} />
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
