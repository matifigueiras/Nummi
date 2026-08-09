import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { HistoryEntry, lookupRate } from '../utils/dolarHistoryLookup';

// Historial diario del blue, para convertir movimientos de meses pasados al
// tipo de cambio que regía ese día — no al de hoy. Se persiste porque son
// ~5700 registros y no cambia el pasado; sólo hace falta refrescar cuando el
// último dato guardado quedó viejo (se sumó un día nuevo).

const HISTORY_URL = 'https://api.argentinadatos.com/v1/cotizaciones/dolares/blue';
const STORAGE_KEY = 'nummi:dolarHistory:v1';

interface StoredHistory {
  entries: HistoryEntry[]; // ordenadas por fecha ascendente
}

export interface DolarHistory {
  loading: boolean;
  /** Cotización de venta vigente en `dateISO`, o la más cercana hacia atrás. `null` si todavía no hay historial cargado. */
  rateForDate: (dateISO: string) => number | null;
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function useDolarHistory(): DolarHistory {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const cached: StoredHistory | null = raw ? JSON.parse(raw) : null;
      const isFresh = cached && cached.entries.length > 0 && cached.entries.at(-1)!.fecha >= todayISO();
      if (cached) setEntries(cached.entries);
      if (isFresh) {
        setLoading(false);
        return;
      }
      const res = await fetch(HISTORY_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fresh: HistoryEntry[] = Array.isArray(data)
        ? data
            .filter((d) => typeof d?.fecha === 'string' && typeof d?.venta === 'number')
            .map((d) => ({ fecha: d.fecha.slice(0, 10), venta: d.venta }))
            .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
        : [];
      if (fresh.length > 0) {
        setEntries(fresh);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: fresh }));
      }
    } catch {
      // Sin red o API caída: se queda con lo que ya tenía en caché (o vacío)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rateForDate = useCallback((dateISO: string) => lookupRate(entries, dateISO), [entries]);

  return { loading, rateForDate };
}
