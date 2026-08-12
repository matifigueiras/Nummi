import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, spacing, ThemeColors } from '../theme';
import { formatPercent } from '../utils/format';

// Compara el yield anual de cada propiedad contra el retorno ponderado de
// la cartera de inversiones. Son dos cosas distintas (renta vs. ganancia de
// capital), pero puestas juntas dan una idea rápida de qué parte del
// patrimonio está rindiendo más. Sin gráfico: son pocos números sueltos,
// sin ninguna secuencia entre sí, así que el número grande alcanza.

export interface YieldItem {
  label: string;
  pct: number;
}

interface Props {
  items: YieldItem[];
}

export function YieldComparison({ items }: Props) {
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  if (items.length === 0) return null;

  return (
    <View style={s.list}>
      {items.map((item) => {
        const gain = item.pct >= 0;
        return (
          <View key={item.label} style={s.item}>
            <Text style={s.label} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={s.valueRow}>
              <Feather
                name={gain ? 'arrow-up-right' : 'arrow-down-right'}
                size={13}
                color={gain ? colors.incomeText : colors.expenseText}
              />
              <Text style={[s.value, { color: gain ? colors.incomeText : colors.expenseText }]}>
                {formatPercent(item.pct)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    list: {
      gap: spacing.md,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    label: {
      flex: 1,
      fontSize: font.body,
      color: c.secondary,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    value: {
      fontSize: 20,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
  });
