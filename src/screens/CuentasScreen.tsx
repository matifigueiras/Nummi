import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { MovementRow } from '../components/MovementRow';
import { NewMovementModal } from '../components/NewMovementModal';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { useApp } from '../store/AppContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { Currency, Movement } from '../types';
import { accountBalance, expensesByCategory, monthStats } from '../utils/calc';
import { formatMoney, formatMonth, formatSigned, monthKey, monthKeyOf } from '../utils/format';

const MAX_CATEGORIES = 5;

export function CuentasScreen() {
  const { accounts, movements, dolar } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  const account = accounts.find((a) => a.currency === currency);

  const accountMovements = useMemo(
    () =>
      movements
        .filter((m) => m.currency === currency)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [movements, currency],
  );

  const balance = useMemo(
    () => (account ? accountBalance(account, movements) : 0),
    [account, movements],
  );

  // Equivalente en la otra moneda, al blue (venta como referencia)
  const equivalent =
    currency === 'ARS'
      ? formatMoney(balance / dolar.rate.venta, 'USD')
      : formatMoney(balance * dolar.rate.venta, 'ARS');

  // Métricas del mes en curso para esta caja. Los montos ya están en la moneda
  // de la caja, así que la conversión al blue no aplica (rate = 1).
  const currentKey = monthKeyOf(new Date());
  const { income: monthIncome, expense: monthExpense } = useMemo(
    () => monthStats(accountMovements, currentKey, 1),
    [accountMovements, currentKey],
  );

  const categories = useMemo(
    () => expensesByCategory(accountMovements, currentKey, MAX_CATEGORIES),
    [accountMovements, currentKey],
  );

  // Agrupar por mes para los separadores de la lista
  const grouped = useMemo(() => {
    const groups: { key: string; title: string; items: Movement[] }[] = [];
    for (const mov of accountMovements) {
      const key = monthKey(mov.date);
      let group = groups[groups.length - 1];
      if (!group || group.key !== key) {
        const [y, m] = key.split('-').map(Number);
        group = { key, title: formatMonth(new Date(y, m - 1, 1)), items: [] };
        groups.push(group);
      }
      group.items.push(mov);
    }
    return groups;
  }, [accountMovements]);

  return (
    <Screen>
      <Text style={styles.title}>Cuentas</Text>

      <SegmentedControl
        options={[
          { value: 'ARS', label: 'Caja ARS' },
          { value: 'USD', label: 'Caja USD' },
        ]}
        value={currency}
        onChange={setCurrency}
      />

      <Card>
        <Text style={styles.balanceLabel}>Saldo disponible</Text>
        <Text style={styles.balanceValue}>{formatMoney(balance, currency)}</Text>
        <Text style={styles.balanceEquivalent}>≈ {equivalent} al blue</Text>
      </Card>

      <Card>
        <Text style={styles.widgetTitle}>Este mes · {formatMonth(new Date())}</Text>
        <View style={styles.monthRow}>
          <MonthStat
            icon="arrow-down-left"
            tone="income"
            label="Ingresos"
            value={formatMoney(monthIncome, currency)}
          />
          <View style={styles.monthDivider} />
          <MonthStat
            icon="arrow-up-right"
            tone="expense"
            label="Gastos"
            value={formatMoney(monthExpense, currency)}
          />
          <View style={styles.monthDivider} />
          <MonthStat
            icon={monthIncome - monthExpense >= 0 ? 'trending-up' : 'trending-down'}
            tone={monthIncome - monthExpense >= 0 ? 'income' : 'expense'}
            label="Balance"
            value={formatSigned(monthIncome - monthExpense, currency)}
            colorValue
          />
        </View>
      </Card>

      {categories.length > 0 && (
        <Card>
          <Text style={styles.widgetTitle}>Gastos por categoría</Text>
          <View style={styles.categoryList}>
            {categories.map((item) => (
              <CategoryBar
                key={item.category}
                category={item.category}
                amount={item.amount}
                currency={currency}
                maxAmount={categories[0].amount}
              />
            ))}
          </View>
        </Card>
      )}

      <Card style={styles.listCard}>
        <Text style={styles.sectionTitle}>Movimientos</Text>
        {grouped.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay movimientos en esta caja.</Text>
        ) : (
          grouped.map((group) => (
            <View key={group.key}>
              <Text style={styles.monthHeader}>{group.title}</Text>
              {group.items.map((mov) => (
                <MovementRow key={mov.id} movement={mov} onPress={setEditingMovement} />
              ))}
            </View>
          ))
        )}
      </Card>

      <NewMovementModal
        visible={editingMovement !== null}
        onClose={() => setEditingMovement(null)}
        movement={editingMovement}
      />
    </Screen>
  );
}

function MonthStat({
  icon,
  tone,
  label,
  value,
  colorValue,
}: {
  icon: keyof typeof Feather.glyphMap;
  tone: 'income' | 'expense';
  label: string;
  value: string;
  colorValue?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const toneColor = tone === 'income' ? colors.incomeText : colors.expenseText;
  return (
    <View style={styles.monthStat}>
      <View style={styles.monthStatHeader}>
        <Feather name={icon} size={12} color={toneColor} />
        <Text style={styles.monthStatLabel}>{label}</Text>
      </View>
      <Text
        style={[styles.monthStatValue, colorValue && { color: toneColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function CategoryBar({
  category,
  amount,
  currency,
  maxAmount,
}: {
  category: string;
  amount: number;
  currency: Currency;
  maxAmount: number;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ratio = maxAmount > 0 ? amount / maxAmount : 0;
  return (
    <View style={styles.categoryItem}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{category}</Text>
        <Text style={styles.categoryAmount}>{formatMoney(amount, currency)}</Text>
      </View>
      <View style={styles.categoryTrack}>
        <View
          style={[
            styles.categoryFill,
            { width: `${Math.max(ratio * 100, 2)}%`, backgroundColor: colors.expense },
          ]}
        />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: font.title,
      fontWeight: '700',
      color: c.ink,
      letterSpacing: -0.4,
    },
    balanceLabel: {
      fontSize: font.label,
      color: c.secondary,
    },
    balanceValue: {
      fontSize: 34,
      fontWeight: '700',
      color: c.ink,
      marginTop: 4,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    },
    balanceEquivalent: {
      fontSize: font.label,
      color: c.muted,
      marginTop: 4,
    },
    widgetTitle: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.secondary,
      marginBottom: spacing.md,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    monthStat: {
      flex: 1,
      gap: 3,
    },
    monthStatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    monthStatLabel: {
      fontSize: font.caption + 1,
      color: c.secondary,
    },
    monthStatValue: {
      fontSize: font.body,
      fontWeight: '700',
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    monthDivider: {
      width: 1,
      backgroundColor: c.border,
      marginHorizontal: spacing.md,
    },
    categoryList: {
      gap: spacing.md,
    },
    categoryItem: {
      gap: 5,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryName: {
      fontSize: font.label,
      color: c.ink,
      fontWeight: '500',
    },
    categoryAmount: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.secondary,
      fontVariant: ['tabular-nums'],
    },
    categoryTrack: {
      height: 8,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
      overflow: 'hidden',
    },
    categoryFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    listCard: {
      paddingTop: spacing.lg,
    },
    sectionTitle: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
      marginBottom: spacing.xs,
    },
    monthHeader: {
      fontSize: font.caption,
      fontWeight: '600',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    empty: {
      fontSize: font.body,
      color: c.muted,
      paddingVertical: spacing.lg,
    },
  });
