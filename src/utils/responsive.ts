import { useWindowDimensions } from 'react-native';

// Ajuste liviano para desktop: la columna central se ensancha y las cards en
// grilla (StatTile de Home) pasan de 2 a 3-4 por fila en pantallas anchas.
// No toca la navegación (la tab bar sigue abajo) — Nummi es principalmente
// una app de celular, esto es sólo para no desperdiciar tanto espacio en PC.

export interface ResponsiveLayout {
  maxWidth: number;
  statColumns: number;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width } = useWindowDimensions();
  if (width >= 1000) return { maxWidth: 900, statColumns: 4 };
  if (width >= 700) return { maxWidth: 680, statColumns: 3 };
  return { maxWidth: 520, statColumns: 2 };
}
