import { Movement, RecurringMovement } from '../types';
import { dateToISO, monthKey } from './format';

// Generación de los movimientos fijos del mes.
//
// Reglas:
// - Sólo se generan hasta la fecha de hoy: un gasto fijo del día 20 no aparece
//   el día 5, porque todavía no pasó.
// - Nunca se duplica: si ya existe un movimiento de ese fijo en ese mes, no se
//   vuelve a crear (aunque el usuario lo haya editado).
// - Si el usuario borra el generado, no vuelve a aparecer en ese mes: para eso
//   se registra el mes como ya procesado (ver `appliedMonths`).

/** Fecha de un fijo dentro de un mes, recortada al último día si hace falta */
export function occurrenceDate(recurring: RecurringMovement, month: Date): string {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(recurring.dayOfMonth, lastDay);
  return dateToISO(new Date(year, monthIndex, day));
}

export interface PendingRecurring {
  recurring: RecurringMovement;
  date: string;
}

/**
 * Fijos que corresponden generar para el mes de `today` y todavía no existen.
 * `appliedMonths` lleva, por fijo, los meses ya procesados (para respetar los
 * que el usuario borró a mano).
 */
export function pendingRecurrings(
  recurrings: RecurringMovement[],
  movements: Movement[],
  today: Date,
  appliedMonths: Record<string, string[]> = {},
): PendingRecurring[] {
  const todayISO = dateToISO(today);
  const key = monthKey(todayISO);
  const already = new Set(
    movements.filter((m) => m.recurringId && monthKey(m.date) === key).map((m) => m.recurringId),
  );

  const pending: PendingRecurring[] = [];
  for (const recurring of recurrings) {
    if (!recurring.active) continue;
    if (already.has(recurring.id)) continue;
    if ((appliedMonths[recurring.id] ?? []).includes(key)) continue;
    const date = occurrenceDate(recurring, today);
    // Todavía no llegó el día
    if (date > todayISO) continue;
    pending.push({ recurring, date });
  }
  return pending;
}

/** Convierte un fijo en el movimiento concreto de ese mes */
export function toMovement(pending: PendingRecurring): Omit<Movement, 'id'> {
  const { recurring, date } = pending;
  return {
    date,
    description: recurring.description,
    category: recurring.category,
    type: recurring.type,
    accountId: recurring.accountId,
    currency: recurring.currency,
    amount: recurring.amount,
    recurringId: recurring.id,
  };
}
