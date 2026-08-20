import {
  addDaysISO,
  dateToISO,
  endOfMonthISO,
  formatDayLabel,
  formatPercent,
  formatThousandsLive,
  monthKey,
  monthKeyOf,
  parseAmount,
  stripThousands,
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

describe('endOfMonthISO', () => {
  it('da el último día de un mes de 31', () => {
    expect(endOfMonthISO(new Date(2026, 6, 15))).toBe('2026-07-31');
  });

  it('da el último día de un mes de 30', () => {
    expect(endOfMonthISO(new Date(2026, 3, 1))).toBe('2026-04-30');
  });

  it('respeta febrero en año bisiesto', () => {
    expect(endOfMonthISO(new Date(2028, 1, 5))).toBe('2028-02-29');
  });

  it('respeta febrero en año no bisiesto', () => {
    expect(endOfMonthISO(new Date(2026, 1, 5))).toBe('2026-02-28');
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

describe('formatThousandsLive', () => {
  it('no toca números menores a mil', () => {
    expect(formatThousandsLive('100')).toBe('100');
  });

  it('agrupa de a tres desde la derecha', () => {
    expect(formatThousandsLive('1000')).toBe('1.000');
    expect(formatThousandsLive('2900000')).toBe('2.900.000');
  });

  it('deja la parte decimal sin tocar', () => {
    expect(formatThousandsLive('1234,56')).toBe('1.234,56');
    expect(formatThousandsLive('1000,5')).toBe('1.000,5');
  });

  it('devuelve vacío para el string vacío', () => {
    expect(formatThousandsLive('')).toBe('');
  });

  it('ignora puntos que ya estuvieran en el crudo', () => {
    // No debería pasar en el flujo normal, pero no debe romper
    expect(formatThousandsLive('1.000')).toBe('1.000');
  });
});

/** Simula tipear `raw` carácter por carácter en un input formateado, tal
 * como hace FormInput: en cada paso el input muestra formatThousandsLive del
 * crudo anterior, el usuario agrega un carácter al final, y stripThousands
 * recalcula el nuevo crudo a partir de esa diferencia. */
function typeSequentially(raw: string): string {
  let current = '';
  for (const ch of raw) {
    const displayed = formatThousandsLive(current);
    current = stripThousands(displayed + ch, current);
  }
  return current;
}

describe('stripThousands', () => {
  it('saca los puntos de miles al pegar un número ya formateado', () => {
    expect(stripThousands('1.000', '')).toBe('1000');
    expect(stripThousands('2.900.000', '')).toBe('2900000');
  });

  it('conserva la coma decimal al pegar un número formateado', () => {
    expect(stripThousands('1.234,56', '')).toBe('1234,56');
  });

  it('descarta letras y otros caracteres al pegar', () => {
    expect(stripThousands('$1.000abc', '')).toBe('1000');
  });

  it('da vacío para el string vacío', () => {
    expect(stripThousands('', '')).toBe('');
  });

  it('borrar el separador de miles no borra ningún dígito', () => {
    // "1.700" con backspace justo sobre el punto → el navegador manda "1700"
    expect(stripThousands('1700', '1700')).toBe('1700');
  });

  it('reemplazar todo el texto seleccionado toma el valor nuevo', () => {
    expect(stripThousands('5000', '17000')).toBe('5000');
  });

  it('no rompe al tipear en el medio de un número ya agrupado', () => {
    // cursor después del "17", insertando un "9": "17.000" → "179.000"
    expect(stripThousands('179.000', '17000')).toBe('179000');
  });

  describe('tipeando dígito por dígito (el bug real: PC, sin decimales)', () => {
    it('no confunde el punto de miles recién agregado con una coma decimal', () => {
      // Antes: al pasar de 4 a 5 dígitos, "1.700" + "0" se leía como
      // "1,7000" (coma decimal) en vez de "17000".
      expect(typeSequentially('17000')).toBe('17000');
    });

    it('sigue funcionando para números más largos', () => {
      expect(typeSequentially('2900000')).toBe('2900000');
      expect(typeSequentially('146217')).toBe('146217');
    });
  });

  describe('tipeando decimales con coma', () => {
    it('agrega la coma y los decimales después de un monto con miles', () => {
      expect(typeSequentially('17000,50')).toBe('17000,50');
    });

    it('deja el decimal "en progreso" sin dígitos todavía', () => {
      expect(stripThousands('146217,', '146217')).toBe('146217,');
    });
  });

  describe('tecla de decimales del teclado numérico (mobile, inserta punto)', () => {
    it('un solo punto se interpreta como coma decimal', () => {
      // el input mostraba "146.217" (con el punto de miles); el usuario
      // agrega la tecla de decimales, que en mobile también manda un punto
      expect(stripThousands('146.217.', '146217')).toBe('146217,');
    });

    it('sigue agregando decimales normalmente después', () => {
      expect(typeSequentially('146217,47')).toBe('146217,47');
    });
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
