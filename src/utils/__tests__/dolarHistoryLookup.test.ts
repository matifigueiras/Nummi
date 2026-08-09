import { HistoryEntry, lookupRate } from '../dolarHistoryLookup';

function entries(pairs: [string, number][]): HistoryEntry[] {
  return pairs.map(([fecha, venta]) => ({ fecha, venta }));
}

describe('lookupRate', () => {
  const history = entries([
    ['2026-08-01', 1400],
    ['2026-08-05', 1450],
    ['2026-08-10', 1500],
  ]);

  it('devuelve la cotización exacta cuando la fecha está en el historial', () => {
    expect(lookupRate(history, '2026-08-05')).toBe(1450);
  });

  // Un fin de semana o feriado no tiene cotización propia: se usa la última hábil
  it('devuelve la más reciente anterior cuando la fecha no está', () => {
    expect(lookupRate(history, '2026-08-07')).toBe(1450);
    expect(lookupRate(history, '2026-08-09')).toBe(1450);
  });

  it('devuelve la última disponible para una fecha futura', () => {
    expect(lookupRate(history, '2026-12-31')).toBe(1500);
  });

  it('devuelve la primera disponible para una fecha anterior a todo el historial', () => {
    expect(lookupRate(history, '2020-01-01')).toBe(1400);
  });

  it('da null si no hay historial cargado', () => {
    expect(lookupRate([], '2026-08-05')).toBeNull();
  });

  it('funciona con un historial de una sola entrada', () => {
    expect(lookupRate(entries([['2026-08-05', 1450]]), '2026-08-20')).toBe(1450);
  });
});
