import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { Insight } from '../utils/calc';

// Banner de insight automático (ver monthlyInsight en utils/calc.ts):
// compara categorías del mes actual contra el anterior, sin IA.

export function InsightCard({ insight }: { insight: Insight | null }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!insight) return null;

  const isPositive = insight.tone === 'positive';
  const color = isPositive ? colors.incomeText : colors.expenseText;
  const bg = isPositive ? colors.incomeSoft : colors.expenseSoft;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Feather name={isPositive ? 'trending-down' : 'trending-up'} size={16} color={color} />
      <Text style={styles.text}>{insight.message}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
    },
    text: {
      flex: 1,
      fontSize: font.label,
      color: c.ink,
      lineHeight: 19,
    },
  });
