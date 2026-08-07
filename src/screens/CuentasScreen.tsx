import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { MovementRow } from '../components/MovementRow';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { useApp } from '../store/AppContext';
import { useThemedStyles } from '../store/ThemeContext';
import { font, spacing, ThemeColors } from '../theme';
import { Currency, Movement } from '../types';
import { formatMoney, formatMonth, monthKey } from '../utils/format';

export function CuentasScreen() {
  const { accounts, movements, dolar } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [currency, setCurrency] = useState<Currency>('ARS');

  const account = accounts.find((a) => a.currency === currency);

  const accountMovements = useMemo(
    () =>
      movements
        .filter((m) => m.currency === currency)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [movements, currency],
  );

  const balance = useMemo(() => {
    const net = accountMovements.reduce(
      (sum, m) => sum + (m.type === 'ingreso' ? m.amount : -m.amount),
      0,
    );
    return (account?.initialBalance ?? 0) + net;
  }, [accountMovements, account]);

  // Equivalente en la otra moneda, al blue (venta como referencia)
  const equivalent =
    currency === 'ARS'
      ? formatMoney(balance / dolar.rate.venta, 'USD')
      : formatMoney(balance * dolar.rate.venta, 'ARS');

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

      <Card style={styles.listCard}>
        <Text style={styles.sectionTitle}>Movimientos</Text>
        {grouped.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay movimientos en esta caja.</Text>
        ) : (
          grouped.map((group) => (
            <View key={group.key}>
              <Text style={styles.monthHeader}>{group.title}</Text>
              {group.items.map((mov) => (
                <MovementRow key={mov.id} movement={mov} />
              ))}
            </View>
          ))
        )}
      </Card>
    </Screen>
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
