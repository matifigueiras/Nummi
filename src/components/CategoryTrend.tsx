import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { MonthlyCategoryAmounts } from '../utils/calc';

// Evolución mes a mes de las categorías de gasto más importantes (siempre
// las mismas 2-3, elegidas por el mes actual, para que cada línea mantenga
// su identidad en el tiempo). Reusa los 3 colores categóricos ya validados
// del resto de la app (accent/expense/investment) en vez de generar una
// paleta nueva.

const PLOT_HEIGHT = 90;

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
}

interface Props {
  data: MonthlyCategoryAmounts[];
  categories: string[];
}

export function CategoryTrend({ data, categories }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [plotWidth, setPlotWidth] = useState(0);

  if (data.length < 2 || categories.length === 0) return null;

  const seriesColors = [colors.expense, colors.investment, colors.accent];
  const max = Math.max(1, ...data.flatMap((d) => categories.map((c) => d.amounts[c] ?? 0)));

  const onLayout = (e: LayoutChangeEvent) => setPlotWidth(e.nativeEvent.layout.width);

  const pathFor = (category: string) => {
    if (plotWidth === 0) return '';
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * plotWidth;
      const y = PLOT_HEIGHT - ((d.amounts[category] ?? 0) / max) * PLOT_HEIGHT;
      return { x, y };
    });
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

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
          <Svg width={plotWidth} height={PLOT_HEIGHT}>
            {categories.map((category, i) => {
              const color = seriesColors[i % seriesColors.length];
              const d = pathFor(category);
              return (
                <React.Fragment key={category}>
                  <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                  {data.map((month, j) => {
                    const x = (j / (data.length - 1)) * plotWidth;
                    const y = PLOT_HEIGHT - ((month.amounts[category] ?? 0) / max) * PLOT_HEIGHT;
                    return <Circle key={month.key} cx={x} cy={y} r={2.5} fill={color} />;
                  })}
                </React.Fragment>
              );
            })}
          </Svg>
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
