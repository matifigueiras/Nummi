import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { Movement } from '../types';
import { formatShortDate, formatSigned } from '../utils/format';

export function MovementRow({
  movement,
  onPress,
}: {
  movement: Movement;
  onPress?: (movement: Movement) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isTransfer = Boolean(movement.transferId);
  const isIncome = movement.type === 'ingreso';
  const signed = isIncome ? movement.amount : -movement.amount;

  const iconBg = isTransfer ? colors.inkSoft : isIncome ? colors.incomeSoft : colors.expenseSoft;
  const iconColor = isTransfer
    ? colors.secondary
    : isIncome
      ? colors.incomeText
      : colors.expenseText;
  const icon = isTransfer ? 'repeat' : isIncome ? 'arrow-down-left' : 'arrow-up-right';
  const amountColor = isTransfer ? colors.secondary : isIncome ? colors.incomeText : colors.ink;

  return (
    <Pressable style={styles.row} onPress={onPress ? () => onPress(movement) : undefined}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>
          {movement.description}
        </Text>
        <Text style={styles.meta}>
          {movement.category} · {formatShortDate(movement.date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {formatSigned(signed, movement.currency)}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
      gap: 1,
    },
    description: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
    },
    meta: {
      fontSize: font.caption + 1,
      color: c.muted,
    },
    amount: {
      fontSize: font.body,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
  });
