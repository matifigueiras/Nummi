import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, spacing, ThemeColors } from '../theme';
import { formatMoney } from '../utils/format';

// Donut de composición del patrimonio (Efectivo / Inversiones / Propiedades).
// Mismo trazado que Donut.tsx, generalizado a N segmentos en vez de 2 fijos.

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

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  cash: number;
  investments: number;
  properties: number;
}

export function WealthDonut({ cash, investments, properties }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const segments: Segment[] = [
    { label: 'Efectivo', value: cash, color: colors.accent },
    { label: 'Inversiones', value: investments, color: colors.investment },
    { label: 'Propiedades', value: properties, color: colors.expense },
  ];
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);

  let chart: React.ReactNode;
  if (total <= 0) {
    chart = (
      <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={colors.inkSoft} strokeWidth={STROKE} fill="none" />
    );
  } else if (visible.length === 1) {
    chart = (
      <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={visible[0].color} strokeWidth={STROKE} fill="none" />
    );
  } else {
    let start = 0;
    chart = (
      <>
        {visible.map((s) => {
          const deg = (s.value / total) * 360;
          const end = start + deg;
          const path = arcPath(start + GAP_DEG / 2, end - GAP_DEG / 2);
          start = end;
          return (
            <Path
              key={s.label}
              d={path}
              stroke={s.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          {chart}
        </Svg>
      </View>

      <View style={styles.legend}>
        {segments.map((s) => (
          <LegendRow key={s.label} color={s.color} label={s.label} value={formatMoney(s.value, 'USD')} />
        ))}
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
