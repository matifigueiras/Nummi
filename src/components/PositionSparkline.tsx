import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { useTheme } from '../store/ThemeContext';

// Estilo "gráfico de tendencia" (📈/📉) al lado de cada posición: una línea
// con quiebres que termina en punta de flecha. El zigzag es puramente
// decorativo — Nummi no guarda el precio día a día de cada posición (sólo
// el actual), así que no hay puntos intermedios reales que graficar. Sólo
// la dirección final (compra → actual) es real; el resto es forma, no dato.

const WIDTH = 40;
const HEIGHT = 20;
const PADDING = 3;
const ARROW_LENGTH = 6;
const ARROW_SPREAD = (28 * Math.PI) / 180;

// Fracciones (x, y) de 0 a 1 dentro del canvas; y=0 es arriba (precio alto).
// Un quiebre chico en contra de la tendencia y después el tramo final marcado.
const GAIN_SHAPE = [
  [0, 0.8],
  [0.28, 0.55],
  [0.48, 0.68],
  [0.72, 0.28],
  [1, 0.05],
];
const LOSS_SHAPE = GAIN_SHAPE.map(([x, y]) => [x, 1 - y]);

export interface Props {
  buyPrice: number;
  currentPrice: number;
  gain: boolean;
}

export function PositionSparkline({ buyPrice, currentPrice, gain }: Props) {
  const { colors } = useTheme();
  const color = gain ? colors.income : colors.expense;
  const flat = buyPrice === currentPrice;

  const innerW = WIDTH - 2 * PADDING;
  const innerH = HEIGHT - 2 * PADDING;
  const shape = gain ? GAIN_SHAPE : LOSS_SHAPE;
  const points = flat
    ? [
        [PADDING, HEIGHT / 2],
        [WIDTH - PADDING, HEIGHT / 2],
      ]
    : shape.map(([xf, yf]) => [PADDING + xf * innerW, PADDING + yf * innerH]);

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');

  const [tx, ty] = points[points.length - 1];
  const [px, py] = points[points.length - 2];
  const angle = Math.atan2(ty - py, tx - px);
  const arrowPoint = (spreadAngle: number) => {
    const a = angle + Math.PI - spreadAngle;
    return `${tx + ARROW_LENGTH * Math.cos(a)},${ty + ARROW_LENGTH * Math.sin(a)}`;
  };

  return (
    <View>
      <Svg width={WIDTH} height={HEIGHT}>
        <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Polygon points={`${tx},${ty} ${arrowPoint(ARROW_SPREAD)} ${arrowPoint(-ARROW_SPREAD)}`} fill={color} />
      </Svg>
    </View>
  );
}
