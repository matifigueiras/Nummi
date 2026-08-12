import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { MonthlyCategoryAmounts } from '../utils/calc';
import { Currency } from '../types';
import { formatMoney } from '../utils/format';

// Evolución mes a mes de las categorías de gasto más importantes (siempre
// las mismas 2-3, elegidas por el mes actual, para que cada línea mantenga
// su identidad en el tiempo). Reusa los 3 colores categóricos ya validados
// del resto de la app (accent/expense/investment) en vez de generar una
// paleta nueva. Cada punto se puede tocar (o pasar el mouse, en desktop)
// para ver el monto exacto de ese mes.

const PLOT_HEIGHT = 90;
const HIT_SIZE = 22;

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}

interface Point {
  x: number;
  y: number;
  category: string;
  color: string;
  amount: number;
  date: Date;
}

interface Props {
  data: MonthlyCategoryAmounts[];
  categories: string[];
  currency: Currency;
}

export function CategoryTrend({ data, categories, currency }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [plotWidth, setPlotWidth] = useState(0);
  const [selected, setSelected] = useState<Point | null>(null);

  if (data.length < 2 || categories.length === 0) return null;

  const seriesColors = [colors.expense, colors.investment, colors.accent];
  const max = Math.max(1, ...data.flatMap((d) => categories.map((c) => d.amounts[c] ?? 0)));

  const onLayout = (e: LayoutChangeEvent) => setPlotWidth(e.nativeEvent.layout.width);

  const pointsFor = (category: string, color: string): Point[] =>
    data.map((d, i) => ({
      x: (i / (data.length - 1)) * plotWidth,
      y: PLOT_HEIGHT - ((d.amounts[category] ?? 0) / max) * PLOT_HEIGHT,
      category,
      color,
      amount: d.amounts[category] ?? 0,
      date: d.date,
    }));

  const pathFor = (points: Point[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const allPoints = categories.flatMap((category, i) =>
    pointsFor(category, seriesColors[i % seriesColors.length]),
  );

  const isSelected = (p: Point) =>
    selected?.category === p.category && selected.date.getTime() === p.date.getTime();

  const toggle = (p: Point) => setSelected((prev) => (isSelected(p) ? null : p));

  // El tooltip se pega arriba del punto tocado, con un clamp horizontal
  // simple para que no se corte contra los bordes de la card.
  const tooltipLeft = selected ? Math.min(Math.max(selected.x - 55, 0), Math.max(plotWidth - 110, 0)) : 0;

  return (
    <View>
      <View style={styles.legend}>
        {categories.map((category, i) => (
          <View key={category} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seriesColors[i % seriesColors.length] }]} />
            <Text style={styles.legendLabel}>{category}</Text>
          </View>
        ))}
      </View>

      <View style={styles.plot} onLayout={onLayout}>
        {plotWidth > 0 && (
          <>
            <Svg width={plotWidth} height={PLOT_HEIGHT}>
              {categories.map((category, i) => {
                const color = seriesColors[i % seriesColors.length];
                const points = pointsFor(category, color);
                return (
                  <React.Fragment key={category}>
                    <Path d={pathFor(points)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                    {points.map((p) => (
                      <Circle
                        key={p.date.getTime()}
                        cx={p.x}
                        cy={p.y}
                        r={isSelected(p) ? 4 : 2.5}
                        fill={p.color}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </Svg>

            {allPoints.map((p) => (
              <Pressable
                key={`${p.category}-${p.date.getTime()}`}
                onPress={() => toggle(p)}
                style={[styles.hitTarget, { left: p.x - HIT_SIZE / 2, top: p.y - HIT_SIZE / 2 }]}
                accessibilityRole="button"
                accessibilityLabel={`${p.category}, ${shortMonth(p.date)}: ${formatMoney(p.amount, currency)}`}
              />
            ))}

            {selected && (
              <View style={[styles.tooltip, { left: tooltipLeft, top: Math.max(selected.y - 44, 0) }]}>
                <Text style={styles.tooltipCategory}>{selected.category}</Text>
                <Text style={[styles.tooltipValue, { color: selected.color }]}>
                  {formatMoney(selected.amount, currency)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.labelsRow}>
        {data.map((d) => (
          <Text key={d.key} style={styles.monthLabel}>
            {shortMonth(d.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
    },
    legendLabel: {
      fontSize: font.caption,
      color: c.secondary,
    },
    plot: {
      height: PLOT_HEIGHT,
    },
    hitTarget: {
      position: 'absolute',
      width: HIT_SIZE,
      height: HIT_SIZE,
    },
    tooltip: {
      position: 'absolute',
      width: 110,
      backgroundColor: c.ink,
      borderRadius: radius.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
    },
    tooltipCategory: {
      fontSize: font.caption,
      color: c.inverse,
      opacity: 0.7,
    },
    tooltipValue: {
      fontSize: font.caption + 1,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    monthLabel: {
      fontSize: font.caption,
      color: c.muted,
    },
  });
