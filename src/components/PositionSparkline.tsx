import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import { useTheme } from '../store/ThemeContext';

// Línea de 2 puntos (compra → precio actual) al lado de cada posición, con
// una punta de flecha en vez de un punto. No es un histórico real: Nummi no
// guarda el precio del día a día de cada posición (sólo el actual), así que
// esto es lo más honesto que se puede mostrar sin inventar datos — comunica
// la misma dirección que ya dice el % de ganancia/pérdida, pero de un
// vistazo.

const WIDTH = 40;
const HEIGHT = 20;
const PADDING = 3;
const ARROW_LENGTH = 6;
const ARROW_SPREAD = (28 * Math.PI) / 180;

export interface Props {
  buyPrice: number;
  currentPrice: number;
  gain: boolean;
}

export function PositionSparkline({ buyPrice, currentPrice, gain }: Props) {
  const { colors } = useTheme();
  const color = gain ? colors.income : colors.expense;
  const flat = buyPrice === currentPrice;

  const x1 = PADDING;
  const x2 = WIDTH - PADDING;
  const y1 = flat ? HEIGHT / 2 : gain ? HEIGHT - PADDING : PADDING;
  const y2 = flat ? HEIGHT / 2 : gain ? PADDING : HEIGHT - PADDING;

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowPoint = (spreadAngle: number) => {
    const a = angle + Math.PI - spreadAngle;
    return `${x2 + ARROW_LENGTH * Math.cos(a)},${y2 + ARROW_LENGTH * Math.sin(a)}`;
  };

  return (
    <View>
      <Svg width={WIDTH} height={HEIGHT}>
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Polygon
          points={`${x2},${y2} ${arrowPoint(ARROW_SPREAD)} ${arrowPoint(-ARROW_SPREAD)}`}
          fill={color}
        />
      </Svg>
    </View>
  );
}
