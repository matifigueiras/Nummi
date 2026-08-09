import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { NewPositionModal } from '../components/NewPositionModal';
import { NewPropertyModal } from '../components/NewPropertyModal';
import { Screen } from '../components/Screen';
import { useApp } from '../store/AppContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { Position, PositionKind, Property } from '../types';
import { accountBalance, positionPnlPct, positionValue, propertyYieldPct } from '../utils/calc';
import { formatMoney, formatPercent, formatRelativeTime, toUsd } from '../utils/format';

export function PatrimonioScreen() {
  const { accounts, movements, positions, properties, dolar, livePrices } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [positionModal, setPositionModal] = useState<PositionKind | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [propertyModal, setPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Todo el patrimonio se consolida en USD (referencia: blue venta).
  const cashUsd = useMemo(
    () =>
      accounts.reduce(
        (sum, account) =>
          sum + toUsd(accountBalance(account, movements), account.currency, dolar.rate.venta),
        0,
      ),
    [accounts, movements, dolar.rate.venta],
  );

  const investmentsUsd = useMemo(
    () =>
      positions.reduce(
        (sum, p) => sum + toUsd(positionValue(p), p.currency, dolar.rate.venta),
        0,
      ),
    [positions, dolar.rate.venta],
  );

  const propertiesUsd = useMemo(
    () =>
      properties.reduce(
        (sum, p) => sum + toUsd(p.estimatedValue, p.valueCurrency, dolar.rate.venta),
        0,
      ),
    [properties, dolar.rate.venta],
  );

  const totalUsd = cashUsd + investmentsUsd + propertiesUsd;

  const stocks = positions.filter((p) => p.kind === 'accion');
  const crypto = positions.filter((p) => p.kind === 'cripto');

  return (
    <Screen>
      <Text style={styles.title}>Patrimonio</Text>

      <Card>
        <Text style={styles.totalLabel}>Patrimonio total</Text>
        <Text style={styles.totalValue}>{formatMoney(totalUsd, 'USD')}</Text>
        <Text style={styles.totalEquivalent}>
          ≈ {formatMoney(totalUsd * dolar.rate.venta, 'ARS')} al blue
        </Text>
        {livePrices.updatedAt && (
          <LiveBadge text={`Precios en vivo · ${formatRelativeTime(livePrices.updatedAt)}`} />
        )}

        <View style={styles.breakdown}>
          <BreakdownRow icon="credit-card" label="Efectivo" value={formatMoney(cashUsd, 'USD')} />
          <BreakdownRow icon="trending-up" label="Inversiones" value={formatMoney(investmentsUsd, 'USD')} />
          <BreakdownRow icon="key" label="Propiedades" value={formatMoney(propertiesUsd, 'USD')} />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <SectionHeader title="Acciones" onAdd={() => setPositionModal('accion')} />
        {stocks.length === 0 ? (
          <Text style={styles.empty}>Sin posiciones todavía.</Text>
        ) : (
          stocks.map((p) => (
            <PositionRow
              key={p.id}
              position={p}
              live={livePrices.liveIds.includes(p.id)}
              onPress={setEditingPosition}
            />
          ))
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <SectionHeader title="Cripto" onAdd={() => setPositionModal('cripto')} />
        {crypto.length === 0 ? (
          <Text style={styles.empty}>Sin posiciones todavía.</Text>
        ) : (
          crypto.map((p) => (
            <PositionRow
              key={p.id}
              position={p}
              live={livePrices.liveIds.includes(p.id)}
              onPress={setEditingPosition}
            />
          ))
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <SectionHeader title="Propiedades" onAdd={() => setPropertyModal(true)} />
        {properties.length === 0 ? (
          <Text style={styles.empty}>Sin propiedades todavía.</Text>
        ) : (
          properties.map((p) => <PropertyRow key={p.id} property={p} onPress={setEditingProperty} />)
        )}
      </Card>

      <NewPositionModal
        visible={positionModal !== null || editingPosition !== null}
        onClose={() => {
          setPositionModal(null);
          setEditingPosition(null);
        }}
        kind={positionModal ?? editingPosition?.kind ?? 'accion'}
        position={editingPosition}
      />
      <NewPropertyModal
        visible={propertyModal || editingProperty !== null}
        onClose={() => {
          setPropertyModal(false);
          setEditingProperty(null);
        }}
        property={editingProperty}
      />
    </Screen>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable
        style={styles.addButton}
        onPress={onAdd}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Agregar ${title.toLowerCase()}`}
      >
        <Feather name="plus" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function BreakdownRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.breakdownRow}>
      <Feather name={icon} size={15} color={colors.secondary} />
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

function LiveBadge({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.liveRow}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>{text}</Text>
    </View>
  );
}

function PositionRow({
  position,
  live,
  onPress,
}: {
  position: Position;
  live: boolean;
  onPress: (position: Position) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const value = positionValue(position);
  const pnlPct = positionPnlPct(position);
  const gain = pnlPct >= 0;
  return (
    <Pressable style={styles.row} onPress={() => onPress(position)}>
      <View style={styles.tickerBadge}>
        <Text style={styles.tickerText}>{position.ticker.slice(0, 4)}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{position.name}</Text>
        <View style={styles.rowMetaLine}>
          {live && <View style={styles.liveDot} />}
          <Text style={styles.rowMeta}>
            {position.quantity} × {formatMoney(position.currentPrice, position.currency)} · compra{' '}
            {formatMoney(position.buyPrice, position.currency)}
          </Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{formatMoney(value, position.currency)}</Text>
        <View
          style={[styles.pnlChip, { backgroundColor: gain ? colors.incomeSoft : colors.expenseSoft }]}
        >
          <Feather
            name={gain ? 'arrow-up-right' : 'arrow-down-right'}
            size={11}
            color={gain ? colors.incomeText : colors.expenseText}
          />
          <Text style={[styles.pnlText, { color: gain ? colors.incomeText : colors.expenseText }]}>
            {formatPercent(pnlPct)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function PropertyRow({
  property,
  onPress,
}: {
  property: Property;
  onPress: (property: Property) => void;
}) {
  const { colors } = useTheme();
  const { dolar } = useApp();
  const styles = useThemedStyles(makeStyles);
  // El yield convierte todo a USD, porque las monedas pueden estar mezcladas
  const yieldPct = propertyYieldPct(property, dolar.rate.venta);
  return (
    <Pressable style={styles.row} onPress={() => onPress(property)}>
      <View style={[styles.tickerBadge, { backgroundColor: colors.accentSoft }]}>
        <Feather name="key" size={15} color={colors.accent} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{property.name}</Text>
        <Text style={styles.rowMeta}>
          Alquiler {formatMoney(property.monthlyRent, property.rentCurrency)} · Gastos{' '}
          {formatMoney(property.monthlyExpenses, property.expensesCurrency)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>
          {formatMoney(property.estimatedValue, property.valueCurrency)}
        </Text>
        <View style={[styles.pnlChip, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.pnlText, { color: colors.incomeText }]}>
            {formatPercent(yieldPct)} anual
          </Text>
        </View>
      </View>
    </Pressable>
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
    totalLabel: {
      fontSize: font.label,
      color: c.secondary,
    },
    totalValue: {
      fontSize: 34,
      fontWeight: '700',
      color: c.ink,
      marginTop: 4,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    },
    totalEquivalent: {
      fontSize: font.label,
      color: c.muted,
      marginTop: 4,
    },
    liveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.accent,
    },
    liveText: {
      fontSize: font.caption,
      fontWeight: '600',
      color: c.accent,
    },
    rowMetaLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    breakdown: {
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: spacing.md,
    },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    breakdownLabel: {
      flex: 1,
      fontSize: font.body,
      color: c.secondary,
    },
    breakdownValue: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    sectionCard: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
    },
    addButton: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      fontSize: font.body,
      color: c.muted,
      paddingVertical: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    tickerBadge: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      backgroundColor: c.inkSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tickerText: {
      fontSize: font.caption,
      fontWeight: '700',
      color: c.ink,
      letterSpacing: 0.3,
    },
    rowInfo: {
      flex: 1,
      gap: 1,
    },
    rowTitle: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
    },
    rowMeta: {
      fontSize: font.caption + 1,
      color: c.muted,
    },
    rowRight: {
      alignItems: 'flex-end',
      gap: 3,
    },
    rowValue: {
      fontSize: font.body,
      fontWeight: '700',
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    pnlChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    pnlText: {
      fontSize: font.caption,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
  });
