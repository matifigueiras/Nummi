import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../store/ThemeContext';

// Línea de 2 puntos (compra → precio actual) al lado de cada posición.
// No es un histórico real: Nummi no guarda el precio del día a día de cada
// posición (sólo el actual), así que esto es lo más honesto que se puede
// mostrar sin inventar datos — comunica la misma dirección que ya dice el
// % de ganancia/pérdida, pero de un vistazo.

const WIDTH = 40;
const HEIGHT = 20;
const PADDING = 3;

interface Props {
  buyPrice: number;
  currentPrice: number;
  gain: boolean;
}

export function PositionSparkline({ buyPrice, currentPrice, gain }: Props) {
  const { colors } = useTheme();
  const color = gain ? colors.income : colors.expense;

  const y1 = gain ? HEIGHT - PADDING : PADDING;
  const y2 = gain ? PADDING : HEIGHT - PADDING;
  const flat = buyPrice === currentPrice;

  return (
    <View>
      <Svg width={WIDTH} height={HEIGHT}>
        <Line
          x1={PADDING}
          y1={flat ? HEIGHT / 2 : y1}
          x2={WIDTH - PADDING}
          y2={flat ? HEIGHT / 2 : y2}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx={WIDTH - PADDING} cy={flat ? HEIGHT / 2 : y2} r={2.5} fill={color} />
      </Svg>
    </View>
  );
}
