import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { formatPercent } from '../utils/format';

// Compara, en barras horizontales, el yield anual de cada propiedad contra
// el retorno ponderado de la cartera de inversiones. Son dos cosas distintas
// (renta vs. ganancia de capital), pero puestas juntas dan una idea rápida
// de qué parte del patrimonio está rindiendo más.

export interface YieldItem {
  label: string;
  pct: number;
}

interface Props {
  items: YieldItem[];
}

export function YieldComparison({ items }: Props) {
  const s = useThemedStyles(makeStyles);
  if (items.length === 0) return null;
  const maxAbs = Math.max(1, ...items.map((i) => Math.abs(i.pct)));

  return (
    <View style={s.list}>
      {items.map((item) => (
        <YieldBar key={item.label} item={item} maxAbs={maxAbs} />
      ))}
    </View>
  );
}

function YieldBar({ item, maxAbs }: { item: YieldItem; maxAbs: number }) {
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  const gain = item.pct >= 0;
  const targetPct = (Math.abs(item.pct) / maxAbs) * 100;
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: targetPct,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [targetPct, width]);

  return (
    <View style={s.item}>
      <View style={s.header}>
        <Text style={s.label}>{item.label}</Text>
        <View style={s.pctRow}>
          <Feather
            name={gain ? 'arrow-up-right' : 'arrow-down-right'}
            size={11}
            color={gain ? colors.incomeText : colors.expenseText}
          />
          <Text style={[s.pct, { color: gain ? colors.incomeText : colors.expenseText }]}>
            {formatPercent(item.pct)}
          </Text>
        </View>
      </View>
      <View style={s.track}>
        <Animated.View
          style={[
            s.fill,
            {
              width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: gain ? colors.income : colors.expense,
            },
          ]}
        />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    list: {
      gap: spacing.md,
    },
    item: {
      gap: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
    },
    pctRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    pct: {
      fontSize: font.caption,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 6,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.full,
    },
  });
