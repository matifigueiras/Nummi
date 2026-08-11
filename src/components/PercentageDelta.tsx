import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, ThemeColors } from '../theme';

// Variación % vs. el mes anterior, para mostrar debajo de un monto (Home).

interface Props {
  /** Variación en %. Positivo = subió, negativo = bajó. */
  value: number;
  label?: string;
  /** Para métricas donde bajar es la buena noticia (ej: Gastos) */
  invertColors?: boolean;
}

export function PercentageDelta({ value, label = 'vs. mes anterior', invertColors = false }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (value === 0) {
    return <Text style={styles.neutral}>Sin cambios {label}</Text>;
  }

  const isUp = value > 0;
  const isGood = invertColors ? !isUp : isUp;
  const color = isGood ? colors.incomeText : colors.expenseText;

  return (
    <View style={styles.row}>
      <Feather name={isUp ? 'arrow-up-right' : 'arrow-down-right'} size={11} color={color} />
      <Text style={[styles.value, { color }]}>{Math.round(Math.abs(value))}%</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    value: {
      fontSize: font.caption,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    label: {
      fontSize: font.caption,
      color: c.muted,
    },
    neutral: {
      fontSize: font.caption,
      color: c.muted,
      marginTop: 2,
    },
  });
