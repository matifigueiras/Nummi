// Búsqueda pura sobre el historial del blue, separada del hook que lo carga
// (src/services/dolarHistory.ts) para poder testearla sin AsyncStorage ni red.

export interface HistoryEntry {
  fecha: string; // yyyy-mm-dd
  venta: number;
}

/**
 * Busca la cotización de `date` o, si no existe, la más reciente anterior
 * (fin de semana / feriado sin cotización propia). `entries` debe venir
 * ordenada por fecha ascendente.
 */
export function lookupRate(entries: HistoryEntry[], date: string): number | null {
  if (entries.length === 0) return null;
  if (date < entries[0].fecha) return entries[0].venta;
  let lo = 0;
  let hi = entries.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (entries[mid].fecha <= date) lo = mid;
    else hi = mid - 1;
  }
  return entries[lo].venta;
}
