import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { formatPercent } from '../utils/format';

// Compara, en un dot plot, el yield anual de cada propiedad contra el
// retorno ponderado de la cartera de inversiones. Son dos cosas distintas
// (renta vs. ganancia de capital), pero puestas juntas dan una idea rápida
// de qué parte del patrimonio está rindiendo más. Todas las filas comparten
// el mismo eje, centrado en cero, para que la posición del punto sea
// comparable entre filas (no tendría sentido conectarlas con una línea:
// no hay ninguna secuencia entre "Depto", "Cochera" e "Inversiones").

const DOT_SIZE = 10;

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
        <YieldDot key={item.label} item={item} maxAbs={maxAbs} />
      ))}
    </View>
  );
}

function YieldDot({ item, maxAbs }: { item: YieldItem; maxAbs: number }) {
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  const gain = item.pct >= 0;
  // Eje compartido de -maxAbs a +maxAbs, cero en el centro (50%)
  const targetLeft = ((item.pct + maxAbs) / (2 * maxAbs)) * 100;
  const left = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.timing(left, {
      toValue: targetLeft,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [targetLeft, left]);

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
        <View style={s.zeroTick} />
        <Animated.View
          style={[
            s.dot,
            {
              left: left.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
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
      gap: spacing.lg,
    },
    item: {
      gap: spacing.sm,
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
      height: DOT_SIZE,
      justifyContent: 'center',
    },
    zeroTick: {
      position: 'absolute',
      left: '50%',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: c.border,
    },
    dot: {
      position: 'absolute',
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: radius.full,
      marginLeft: -DOT_SIZE / 2,
    },
  });
