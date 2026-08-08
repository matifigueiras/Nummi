import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { Account } from '../types';

// Selector horizontal de cuentas. Scrollea cuando no entran, así funciona
// igual con dos cuentas que con ocho.

interface Props {
  accounts: Account[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Si viene, se agrega un chip "+" al final */
  onAdd?: () => void;
}

export function AccountPicker({ accounts, selectedId, onSelect, onAdd }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {accounts.map((account) => {
        const active = account.id === selectedId;
        return (
          <Pressable
            key={account.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(account.id)}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {account.name}
            </Text>
            <Text style={[styles.currency, active && styles.currencyActive]}>
              {account.currency}
            </Text>
          </Pressable>
        );
      })}
      {onAdd && (
        <Pressable style={styles.addChip} onPress={onAdd}>
          <Feather name="plus" size={16} color={colors.secondary} />
        </Pressable>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      gap: spacing.sm,
      paddingRight: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
    },
    chipActive: {
      backgroundColor: c.ink,
    },
    label: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.secondary,
      maxWidth: 160,
    },
    labelActive: {
      color: c.inverse,
    },
    currency: {
      fontSize: font.caption,
      fontWeight: '600',
      color: c.muted,
    },
    currencyActive: {
      color: c.inverse,
      opacity: 0.7,
    },
    addChip: {
      width: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
    },
  });
