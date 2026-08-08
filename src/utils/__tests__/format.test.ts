import {
  addDaysISO,
  dateToISO,
  formatDayLabel,
  formatPercent,
  monthKey,
  monthKeyOf,
  parseAmount,
  toUsd,
  todayISO,
} from '../format';

describe('parseAmount', () => {
  it('acepta punto como separador decimal', () => {
    expect(parseAmount('0.048')).toBe(0.048);
  });

  // El teclado en español escribe coma
  it('acepta coma como separador decimal', () => {
    expect(parseAmount('15,5')).toBe(15.5);
  });

  it('ignora espacios alrededor', () => {
    expect(parseAmount('  2000  ')).toBe(2000);
  });

  it('devuelve NaN para texto que no es un número', () => {
    expect(parseAmount('abc')).toBeNaN();
  });

  it('devuelve NaN para el string vacío tras recortar espacios', () => {
    expect(parseAmount('   ')).toBeNaN();
  });
});

describe('claves de mes', () => {
  it('monthKey toma el año y mes de una fecha ISO', () => {
    expect(monthKey('2026-08-06')).toBe('2026-08');
  });

  it('monthKeyOf rellena el mes con cero', () => {
    expect(monthKeyOf(new Date(2026, 0, 15))).toBe('2026-01');
  });

  it('monthKeyOf y monthKey coinciden para la misma fecha', () => {
    const date = new Date(2026, 10, 3);
    expect(monthKeyOf(date)).toBe(monthKey(dateToISO(date)));
  });
});

describe('addDaysISO', () => {
  it('suma días dentro del mismo mes', () => {
    expect(addDaysISO('2026-08-06', 3)).toBe('2026-08-09');
  });

  it('resta días cruzando al mes anterior', () => {
    expect(addDaysISO('2026-08-01', -1)).toBe('2026-07-31');
  });

  it('cruza el cambio de año', () => {
    expect(addDaysISO('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('maneja el 29 de febrero de un año bisiesto', () => {
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('formatDayLabel', () => {
  it('llama "Hoy" a la fecha de hoy', () => {
    expect(formatDayLabel(todayISO())).toBe('Hoy');
  });

  it('llama "Ayer" al día anterior', () => {
    expect(formatDayLabel(addDaysISO(todayISO(), -1))).toBe('Ayer');
  });

  it('usa la fecha corta para días más lejanos', () => {
    const label = formatDayLabel(addDaysISO(todayISO(), -10));
    expect(label).not.toBe('Hoy');
    expect(label).not.toBe('Ayer');
  });
});

describe('toUsd', () => {
  it('deja los montos que ya están en USD', () => {
    expect(toUsd(100, 'USD', 1500)).toBe(100);
  });

  it('divide los montos en ARS por el tipo de cambio', () => {
    expect(toUsd(150_000, 'ARS', 1500)).toBe(100);
  });
});

describe('formatPercent', () => {
  it('usa coma decimal', () => {
    expect(formatPercent(12.34)).toBe('12,3%');
  });

  it('antepone el signo menos a los negativos', () => {
    expect(formatPercent(-5)).toBe('−5,0%');
  });
});
