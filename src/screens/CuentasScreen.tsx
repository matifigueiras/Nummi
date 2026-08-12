import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AccountModal } from '../components/AccountModal';
import { AccountPicker } from '../components/AccountPicker';
import { Card } from '../components/Card';
import { CategoryTrend } from '../components/CategoryTrend';
import { FormInput } from '../components/form';
import { HideBalanceButton } from '../components/HideBalanceButton';
import { MonthNav } from '../components/MonthNav';
import { MovementRow } from '../components/MovementRow';
import { NewMovementModal } from '../components/NewMovementModal';
import { Screen } from '../components/Screen';
import { useApp } from '../store/AppContext';
import { usePrivacy } from '../store/PrivacyContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { Currency, Movement } from '../types';
import {
  accountBalanceAt,
  categoryAmountsByMonth,
  constantRate,
  expensesByCategory,
  monthStats,
  totalByCurrency,
} from '../utils/calc';
import {
  endOfMonthISO,
  formatMoney,
  formatMonth,
  formatShortDate,
  formatSigned,
  HIDDEN_AMOUNT,
  monthKey,
  monthKeyOf,
} from '../utils/format';
import { searchMovements } from '../utils/search';

const MAX_CATEGORIES = 5;
const TREND_CATEGORIES = 3;
const TREND_MONTHS = 6;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function CuentasScreen() {
  const { accounts, movements, dolar, dolarHistory, refreshAll } = useApp();
  const { hidden } = usePrivacy();
  const styles = useThemedStyles(makeStyles);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [accountModal, setAccountModal] = useState<'new' | 'edit' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Si la cuenta elegida se borró (o todavía no se eligió), cae en la primera
  const account = accounts.find((a) => a.id === selectedId) ?? accounts[0] ?? null;
  const currency: Currency = account?.currency ?? 'ARS';
  const monthKeyValue = monthKeyOf(month);
  const isCurrentMonth = monthKeyValue === monthKeyOf(new Date());

  const accountMovements = useMemo(
    () => (account ? movements.filter((m) => m.accountId === account.id) : []),
    [movements, account],
  );

  // Movimientos del mes elegido, del más nuevo al más viejo
  const monthMovements = useMemo(
    () =>
      accountMovements
        .filter((m) => monthKey(m.date) === monthKeyValue)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [accountMovements, monthKeyValue],
  );

  // Buscar reemplaza temporalmente el filtro por mes: mientras hay texto, la
  // lista muestra coincidencias de TODOS los meses de esta cuenta (los
  // widgets de arriba siguen hablando sólo del mes elegido).
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = useMemo(
    () => searchMovements(accountMovements, searchQuery).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [accountMovements, searchQuery],
  );
  const listedMovements = isSearching ? searchResults : monthMovements;

  // El saldo es acumulado: se muestra al cierre del mes elegido (en el mes en
  // curso coincide con el saldo de hoy).
  const balance = useMemo(
    () => (account ? accountBalanceAt(account, movements, monthKeyValue) : 0),
    [account, movements, monthKeyValue],
  );

  // Equivalente en la otra moneda. En el mes en curso, al blue de hoy; en un
  // mes cerrado, al blue vigente al cierre de ese mes (no al de hoy).
  const equivalentRate = isCurrentMonth
    ? dolar.rate.venta
    : (dolarHistory.rateForDate(endOfMonthISO(month)) ?? dolar.rate.venta);
  const equivalent =
    currency === 'ARS'
      ? formatMoney(balance / equivalentRate, 'USD')
      : formatMoney(balance * equivalentRate, 'ARS');

  // Los montos ya están en la moneda de la caja: no hay conversión (rate = 1)
  const { income: monthIncome, expense: monthExpense } = useMemo(
    () => monthStats(accountMovements, monthKeyValue, constantRate(1)),
    [accountMovements, monthKeyValue],
  );

  const categories = useMemo(
    () => expensesByCategory(accountMovements, monthKeyValue, MAX_CATEGORIES),
    [accountMovements, monthKeyValue],
  );

  // Categorías a trackear en el gráfico de evolución: las top del mes
  // elegido, sin "Otras" (que agrupa el resto y no es una categoría real).
  const trendCategories = useMemo(
    () => categories.filter((c) => c.category !== 'Otras').slice(0, TREND_CATEGORIES).map((c) => c.category),
    [categories],
  );
  const categoryTrend = useMemo(
    () => categoryAmountsByMonth(accountMovements, month, TREND_MONTHS, trendCategories),
    [accountMovements, month, trendCategories],
  );

  const sameCurrencyCount = accounts.filter((a) => a.currency === currency).length;
  const currencyTotal = useMemo(
    () => totalByCurrency(accounts, movements, currency),
    [accounts, movements, currency],
  );

  return (
    <Screen onRefresh={refreshAll}>
      <Text style={styles.title}>Cuentas</Text>

      <AccountPicker
        accounts={accounts}
        selectedId={account?.id ?? null}
        onSelect={setSelectedId}
        onAdd={() => setAccountModal('new')}
      />

      <MonthNav
        month={month}
        onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        nextDisabled={isCurrentMonth}
      />

      <Card>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>
            {isCurrentMonth
              ? 'Saldo disponible'
              : `Saldo al cierre de ${formatMonth(month).toLowerCase()}`}
          </Text>
          <View style={styles.balanceActions}>
            <HideBalanceButton />
            <Pressable
              onPress={() => setAccountModal('edit')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Editar cuenta"
            >
              <Feather name="edit-2" size={14} color={styles.emptyIcon.color} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.balanceValue}>{hidden ? HIDDEN_AMOUNT : formatMoney(balance, currency)}</Text>
        <Text style={styles.balanceEquivalent}>
          {hidden
            ? HIDDEN_AMOUNT
            : `≈ ${equivalent} al blue${isCurrentMonth ? '' : ` del ${formatShortDate(endOfMonthISO(month))}`}`}
        </Text>
        {/* Con varias cuentas de la misma moneda, el total ayuda a no perder
            de vista cuánto hay en total en pesos (o en dólares) */}
        {sameCurrencyCount > 1 && (
          <Text style={styles.balanceTotal}>
            Total en {currency === 'ARS' ? 'pesos' : 'dólares'}:{' '}
            {hidden ? HIDDEN_AMOUNT : formatMoney(currencyTotal, currency)}
          </Text>
        )}
      </Card>

      <Card>
        <Text style={styles.widgetTitle}>Resumen del mes</Text>
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

      {trendCategories.length > 0 && (
        <Card>
          <Text style={styles.widgetTitle}>Categorías en el tiempo</Text>
          <CategoryTrend data={categoryTrend} categories={trendCategories} currency={currency} />
        </Card>
      )}

      <Card style={styles.listCard}>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {isSearching ? `Resultados (${listedMovements.length})` : 'Movimientos'}
          </Text>
          {isSearching && <Text style={styles.searchHint}>en todos los meses</Text>}
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={styles.emptyIcon.color} />
          <FormInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por descripción o categoría"
          />
          {isSearching && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Feather name="x" size={16} color={styles.emptyIcon.color} />
            </Pressable>
          )}
        </View>

        {listedMovements.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={22} color={styles.emptyIcon.color} />
            <Text style={styles.emptyText}>
              {isSearching
                ? `Sin resultados para "${searchQuery.trim()}".`
                : `No hay movimientos en ${formatMonth(month).toLowerCase()} en esta cuenta.`}
            </Text>
          </View>
        ) : (
          listedMovements.map((mov) => (
            <MovementRow key={mov.id} movement={mov} onPress={setEditingMovement} />
          ))
        )}
      </Card>

      <NewMovementModal
        visible={editingMovement !== null}
        onClose={() => setEditingMovement(null)}
        movement={editingMovement}
      />

      <AccountModal
        visible={accountModal !== null}
        onClose={() => setAccountModal(null)}
        account={accountModal === 'edit' ? account : null}
        accountCount={accounts.length}
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
  const pct = Math.max(ratio * 100, 2);
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width no es animable por el driver nativo
    }).start();
    // Se re-dispara con pct a propósito: cambiar de mes o cuenta debe animar
    // hacia el nuevo valor, no saltar.
  }, [pct, width]);

  return (
    <View style={styles.categoryItem}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{category}</Text>
        <Text style={styles.categoryAmount}>{formatMoney(amount, currency)}</Text>
      </View>
      <View style={styles.categoryTrack}>
        <Animated.View
          style={[
            styles.categoryFill,
            {
              width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: colors.expense,
            },
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
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    balanceActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    balanceLabel: {
      fontSize: font.label,
      color: c.secondary,
    },
    balanceTotal: {
      fontSize: font.label,
      color: c.secondary,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
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
    listHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
    },
    searchHint: {
      fontSize: font.caption + 1,
      color: c.muted,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.bg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    searchInput: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingHorizontal: 0,
    },
    empty: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xl,
    },
    emptyIcon: {
      color: c.muted,
    },
    emptyText: {
      fontSize: font.label,
      color: c.muted,
      textAlign: 'center',
    },
  });
