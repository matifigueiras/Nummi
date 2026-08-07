import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, spacing, ThemeColors } from '../theme';
import { formatMoney, formatMoneyCompact } from '../utils/format';

// Donut Ingresos vs. Gastos. Colores del par validado en theme.ts; los valores
// van directo en la leyenda (etiquetas visibles, no solo color).

const SIZE = 190;
const STROKE = 22;
const GAP_DEG = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;

function polar(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number) {
  const start = polar(startDeg);
  const end = polar(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

interface Props {
  income: number;
  expense: number;
}

export function Donut({ income, expense }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const total = income + expense;
  const balance = income - expense;

  let chart: React.ReactNode;
  if (total <= 0) {
    chart = (
      <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={colors.inkSoft} strokeWidth={STROKE} fill="none" />
    );
  } else if (income <= 0 || expense <= 0) {
    // Un solo segmento: círculo completo del color que corresponda
    chart = (
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        stroke={income > 0 ? colors.income : colors.expense}
        strokeWidth={STROKE}
        fill="none"
      />
    );
  } else {
    const incomeDeg = Math.max(12, Math.min(348, (income / total) * 360));
    chart = (
      <>
        <Path
          d={arcPath(GAP_DEG / 2, incomeDeg - GAP_DEG / 2)}
          stroke={colors.income}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arcPath(incomeDeg + GAP_DEG / 2, 360 - GAP_DEG / 2)}
          stroke={colors.expense}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          {chart}
        </Svg>
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerCaption}>Balance</Text>
          <Text style={[styles.centerValue, balance < 0 && { color: colors.expenseText }]}>
            {formatMoneyCompact(balance, 'ARS')}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        <LegendRow color={colors.income} label="Ingresos" value={formatMoney(income, 'ARS')} />
        <LegendRow color={colors.expense} label="Gastos" value={formatMoney(expense, 'ARS')} />
      </View>
    </View>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      alignItems: 'center',
      gap: spacing.lg,
    },
    centerLabel: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerCaption: {
      fontSize: font.caption,
      fontWeight: '600',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    centerValue: {
      fontSize: 22,
      fontWeight: '700',
      color: c.ink,
      marginTop: 2,
    },
    legend: {
      alignSelf: 'stretch',
      gap: spacing.sm,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendLabel: {
      flex: 1,
      fontSize: font.body,
      color: c.secondary,
    },
    legendValue: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
  });
