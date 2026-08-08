import { Account, Currency, Movement, Position, Property } from '../types';
import { monthKey, monthKeyOf } from './format';

// Cálculos puros de la app. Viven acá (y no dentro de las pantallas) para que
// se puedan testear sin montar componentes.

/**
 * Las transferencias entre cajas mueven plata de un lado a otro: cuentan para
 * los saldos, pero no son ingresos ni gastos reales.
 */
export function isCountedAsFlow(movement: Movement): boolean {
  return !movement.transferId;
}

/** Convierte a ARS usando el blue (venta) como referencia */
export function toArs(amount: number, currency: Currency, ventaRate: number): number {
  return currency === 'ARS' ? amount : amount * ventaRate;
}

export interface MonthStats {
  income: number;
  expense: number;
  savings: number;
}

/**
 * Ingresos, gastos y ahorro de un mes, consolidados en ARS.
 * `key` es "yyyy-mm"; las transferencias quedan excluidas.
 */
export function monthStats(movements: Movement[], key: string, ventaRate: number): MonthStats {
  let income = 0;
  let expense = 0;
  for (const mov of movements) {
    if (!isCountedAsFlow(mov)) continue;
    if (monthKey(mov.date) !== key) continue;
    const inArs = toArs(mov.amount, mov.currency, ventaRate);
    if (mov.type === 'ingreso') income += inArs;
    else expense += inArs;
  }
  return { income, expense, savings: income - expense };
}

export interface MonthlySavings {
  /** "yyyy-mm" */
  key: string;
  /** Primer día del mes, para formatear */
  date: Date;
  savings: number;
}

/**
 * Ahorro de los últimos `count` meses terminando en `endMonth` (incluido),
 * del más viejo al más nuevo. Los meses sin movimientos dan 0.
 */
export function savingsByMonth(
  movements: Movement[],
  endMonth: Date,
  count: number,
  ventaRate: number,
): MonthlySavings[] {
  const result: MonthlySavings[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(endMonth.getFullYear(), endMonth.getMonth() - offset, 1);
    const key = monthKeyOf(date);
    result.push({ key, date, savings: monthStats(movements, key, ventaRate).savings });
  }
  return result;
}

/** Saldo de una caja: saldo inicial + todos sus movimientos (transferencias incluidas) */
export function accountBalance(account: Account, movements: Movement[]): number {
  const net = movements
    .filter((m) => m.currency === account.currency)
    .reduce((sum, m) => sum + (m.type === 'ingreso' ? m.amount : -m.amount), 0);
  return account.initialBalance + net;
}

/**
 * Saldo de una caja al cierre de un mes ("yyyy-mm"): saldo inicial + todos los
 * movimientos hasta ese mes inclusive. Con el mes en curso da el saldo de hoy.
 */
export function accountBalanceAt(
  account: Account,
  movements: Movement[],
  untilKey: string,
): number {
  const upToMonth = movements.filter((m) => monthKey(m.date) <= untilKey);
  return accountBalance(account, upToMonth);
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

/**
 * Gastos de un mes agrupados por categoría, de mayor a menor. Más allá de
 * `max` categorías, el resto se agrupa en "Otras".
 */
export function expensesByCategory(
  movements: Movement[],
  key: string,
  max: number,
): CategoryTotal[] {
  const byCategory = new Map<string, number>();
  for (const mov of movements) {
    if (!isCountedAsFlow(mov) || mov.type !== 'gasto') continue;
    if (monthKey(mov.date) !== key) continue;
    byCategory.set(mov.category, (byCategory.get(mov.category) ?? 0) + mov.amount);
  }
  const sorted = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, max);
  const rest = sorted.slice(max).reduce((sum, item) => sum + item.amount, 0);
  if (rest > 0) top.push({ category: 'Otras', amount: rest });
  return top;
}

/** Valor de mercado de una posición, en su propia moneda */
export function positionValue(position: Position): number {
  return position.quantity * position.currentPrice;
}

/** Variación porcentual respecto del precio de compra */
export function positionPnlPct(position: Position): number {
  if (position.buyPrice === 0) return 0;
  return ((position.currentPrice - position.buyPrice) / position.buyPrice) * 100;
}

/**
 * Yield anual de una propiedad, en %. Convierte todo a USD antes de calcular
 * porque alquiler, gastos y valor pueden estar en monedas distintas.
 */
export function propertyYieldPct(property: Property, ventaRate: number): number {
  const toUsdAmount = (amount: number, currency: Currency) =>
    currency === 'USD' ? amount : amount / ventaRate;
  const valueUsd = toUsdAmount(property.estimatedValue, property.valueCurrency);
  if (valueUsd === 0) return 0;
  const netMonthlyUsd =
    toUsdAmount(property.monthlyRent, property.rentCurrency) -
    toUsdAmount(property.monthlyExpenses, property.expensesCurrency);
  return (netMonthlyUsd * 12 * 100) / valueUsd;
}
