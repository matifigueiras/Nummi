import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { DolarRate } from '../types';

const DOLAR_BLUE_URL = 'https://dolarapi.com/v1/dolares/blue';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Valor de arranque para que la UI nunca muestre $0 si la API tarda o falla.
const FALLBACK_RATE: DolarRate = {
  compra: 1470,
  venta: 1490,
  fechaActualizacion: new Date(0).toISOString(),
};

export interface DolarBlue {
  rate: DolarRate;
  loading: boolean;
  /** true si el último fetch falló y se está mostrando un valor viejo/fallback */
  stale: boolean;
  refresh: () => void;
}

export function useDolarBlue(): DolarBlue {
  const [rate, setRate] = useState<DolarRate>(FALLBACK_RATE);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(true);
  const fetching = useRef(false);

  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const res = await fetch(DOLAR_BLUE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof data?.compra === 'number' && typeof data?.venta === 'number') {
        setRate({
          compra: data.compra,
          venta: data.venta,
          fechaActualizacion: data.fechaActualizacion ?? new Date().toISOString(),
        });
        setStale(false);
      }
    } catch {
      setStale(true);
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    // En web AppState mapea a la visibilidad de la pestaña; en mobile, al foreground.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  return { rate, loading, stale, refresh };
}
