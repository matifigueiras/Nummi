import { Movement, RecurringMovement } from '../../types';
import { occurrenceDate, pendingRecurrings, toMovement } from '../recurring';

function recurring(over: Partial<RecurringMovement> = {}): RecurringMovement {
  return {
    id: 'f1',
    description: 'Alquiler',
    category: 'Vivienda',
    type: 'gasto',
    accountId: 'caja-ars',
    currency: 'ARS',
    amount: 650_000,
    dayOfMonth: 3,
    active: true,
    ...over,
  };
}

function movement(over: Partial<Movement> = {}): Movement {
  return {
    id: 'm1',
    date: '2026-08-03',
    description: 'Alquiler',
    category: 'Vivienda',
    accountId: 'caja-ars',
    type: 'gasto',
    currency: 'ARS',
    amount: 650_000,
    ...over,
  };
}

describe('occurrenceDate', () => {
  it('usa el día indicado del mes', () => {
    expect(occurrenceDate(recurring({ dayOfMonth: 10 }), new Date(2026, 7, 1))).toBe('2026-08-10');
  });

  // Un fijo del día 31 no puede desaparecer en los meses cortos
  it('recorta al último día en meses más cortos', () => {
    expect(occurrenceDate(recurring({ dayOfMonth: 31 }), new Date(2026, 1, 1))).toBe('2026-02-28');
    expect(occurrenceDate(recurring({ dayOfMonth: 31 }), new Date(2026, 3, 1))).toBe('2026-04-30');
  });

  it('respeta el 29 de febrero en años bisiestos', () => {
    expect(occurrenceDate(recurring({ dayOfMonth: 31 }), new Date(2028, 1, 1))).toBe('2028-02-29');
  });
});

describe('pendingRecurrings', () => {
  // La regla que evita mostrar plata que todavía no se movió
  it('no genera un fijo cuyo día todavía no llegó', () => {
    const result = pendingRecurrings([recurring({ dayOfMonth: 20 })], [], new Date(2026, 7, 5));
    expect(result).toHaveLength(0);
  });

  it('genera el fijo el mismo día que corresponde', () => {
    const result = pendingRecurrings([recurring({ dayOfMonth: 5 })], [], new Date(2026, 7, 5));
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-08-05');
  });

  it('genera los fijos de días ya pasados del mes', () => {
    const result = pendingRecurrings([recurring({ dayOfMonth: 3 })], [], new Date(2026, 7, 20));
    expect(result).toHaveLength(1);
  });

  it('ignora los fijos pausados', () => {
    const result = pendingRecurrings(
      [recurring({ active: false, dayOfMonth: 1 })],
      [],
      new Date(2026, 7, 20),
    );
    expect(result).toHaveLength(0);
  });

  // Sin esto, cada apertura de la app duplicaría el alquiler
  it('no vuelve a generar un fijo que ya existe en ese mes', () => {
    const existing = [movement({ recurringId: 'f1', date: '2026-08-03' })];
    const result = pendingRecurrings([recurring()], existing, new Date(2026, 7, 20));
    expect(result).toHaveLength(0);
  });

  it('sí lo genera si el movimiento existente es de otro mes', () => {
    const existing = [movement({ recurringId: 'f1', date: '2026-07-03' })];
    const result = pendingRecurrings([recurring()], existing, new Date(2026, 7, 20));
    expect(result).toHaveLength(1);
  });

  // Si el usuario lo borró a mano, no debe reaparecer solo
  it('respeta los meses ya procesados', () => {
    const result = pendingRecurrings([recurring()], [], new Date(2026, 7, 20), {
      f1: ['2026-08'],
    });
    expect(result).toHaveLength(0);
  });

  it('genera el mes siguiente aunque el anterior esté procesado', () => {
    const result = pendingRecurrings([recurring()], [], new Date(2026, 8, 20), {
      f1: ['2026-08'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-09-03');
  });

  it('devuelve varios fijos cuando todos corresponden', () => {
    const result = pendingRecurrings(
      [recurring({ id: 'f1', dayOfMonth: 1 }), recurring({ id: 'f2', dayOfMonth: 2 })],
      [],
      new Date(2026, 7, 10),
    );
    expect(result.map((r) => r.recurring.id)).toEqual(['f1', 'f2']);
  });
});

describe('toMovement', () => {
  it('copia los datos del fijo y deja la marca de origen', () => {
    const result = toMovement({ recurring: recurring(), date: '2026-08-03' });
    expect(result).toEqual({
      date: '2026-08-03',
      description: 'Alquiler',
      category: 'Vivienda',
      type: 'gasto',
      accountId: 'caja-ars',
      currency: 'ARS',
      amount: 650_000,
      recurringId: 'f1',
    });
  });
});
