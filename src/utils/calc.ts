import { Account, Budget, Currency, Movement, Position, Property, WealthSnapshot } from '../types';
import { monthKey, monthKeyOf, toUsd } from './format';

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

/** Cotización de venta del blue para una fecha "yyyy-mm-dd" */
export type RateResolver = (dateISO: string) => number;

/** Resolver que ignora la fecha — para cuando alcanza con un tipo de cambio fijo */
export function constantRate(rate: number): RateResolver {
  return () => rate;
}

export interface MonthStats {
  income: number;
  expense: number;
  savings: number;
}

/**
 * Ingresos, gastos y ahorro de un mes, consolidados en ARS.
 * `key` es "yyyy-mm"; las transferencias quedan excluidas. Cada movimiento en
 * USD se convierte al blue de SU fecha, no al de hoy — así un mes pasado no
 * cambia de valor según cuándo lo mires.
 */
export function monthStats(movements: Movement[], key: string, rateForDate: RateResolver): MonthStats {
  let income = 0;
  let expense = 0;
  for (const mov of movements) {
    if (!isCountedAsFlow(mov)) continue;
    if (monthKey(mov.date) !== key) continue;
    const inArs = toArs(mov.amount, mov.currency, rateForDate(mov.date));
    if (mov.type === 'ingreso') income += inArs;
    else expense += inArs;
  }
  return { income, expense, savings: income - expense };
}

export interface MonthlyIncomeExpense {
  /** "yyyy-mm" */
  key: string;
  /** Primer día del mes, para formatear */
  date: Date;
  income: number;
  expense: number;
}

/**
 * Ingresos y gastos de los últimos `count` meses terminando en `endMonth`
 * (incluido), del más viejo al más nuevo. Los meses sin movimientos dan 0.
 */
export function incomeExpenseByMonth(
  movements: Movement[],
  endMonth: Date,
  count: number,
  rateForDate: RateResolver,
): MonthlyIncomeExpense[] {
  const result: MonthlyIncomeExpense[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(endMonth.getFullYear(), endMonth.getMonth() - offset, 1);
    const key = monthKeyOf(date);
    const { income, expense } = monthStats(movements, key, rateForDate);
    result.push({ key, date, income, expense });
  }
  return result;
}

/** Saldo de una cuenta: saldo inicial + sus movimientos (transferencias incluidas) */
export function accountBalance(account: Account, movements: Movement[]): number {
  const net = movements
    .filter((m) => m.accountId === account.id)
    .reduce((sum, m) => sum + (m.type === 'ingreso' ? m.amount : -m.amount), 0);
  return account.initialBalance + net;
}

/** Suma de los saldos de todas las cuentas de una moneda */
export function totalByCurrency(
  accounts: Account[],
  movements: Movement[],
  currency: Currency,
): number {
  return accounts
    .filter((a) => a.currency === currency)
    .reduce((sum, a) => sum + accountBalance(a, movements), 0);
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

export interface BudgetProgress {
  category: string;
  /** Límite mensual, en ARS */
  limit: number;
  /** Gastado en el mes, consolidado en ARS */
  spent: number;
  /** 0..n — puede pasar de 1 si se excedió */
  ratio: number;
  /** Positivo: queda plata. Negativo: se pasó */
  remaining: number;
  status: 'ok' | 'cerca' | 'excedido';
}

/** A partir de este porcentaje el presupuesto avisa que está por agotarse */
const NEAR_LIMIT_RATIO = 0.8;

/**
 * Avance de cada presupuesto en un mes, sobre TODAS las cuentas y consolidado
 * en ARS (los gastos en USD se convierten al blue).
 */
export function budgetProgress(
  budgets: Budget[],
  movements: Movement[],
  key: string,
  rateForDate: RateResolver,
): BudgetProgress[] {
  const spentByCategory = new Map<string, number>();
  for (const mov of movements) {
    if (!isCountedAsFlow(mov) || mov.type !== 'gasto') continue;
    if (monthKey(mov.date) !== key) continue;
    const inArs = toArs(mov.amount, mov.currency, rateForDate(mov.date));
    spentByCategory.set(mov.category, (spentByCategory.get(mov.category) ?? 0) + inArs);
  }

  return budgets
    .map((budget) => {
      const spent = spentByCategory.get(budget.category) ?? 0;
      const ratio = budget.amount > 0 ? spent / budget.amount : 0;
      return {
        category: budget.category,
        limit: budget.amount,
        spent,
        ratio,
        remaining: budget.amount - spent,
        status: ratio > 1 ? 'excedido' : ratio >= NEAR_LIMIT_RATIO ? 'cerca' : 'ok',
      } as BudgetProgress;
    })
    // Lo más urgente primero
    .sort((a, b) => b.ratio - a.ratio);
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

export interface WealthBreakdown {
  cashUsd: number;
  investmentsUsd: number;
  propertiesUsd: number;
}

/**
 * Patrimonio consolidado en USD, desglosado en efectivo / inversiones /
 * propiedades (mismo criterio que el donut de Patrimonio: todo al blue
 * venta). Usado tanto para mostrar el desglose de hoy como para guardar la
 * foto mensual (ver WealthSnapshot).
 */
export function wealthBreakdown(
  accounts: Account[],
  movements: Movement[],
  positions: Position[],
  properties: Property[],
  ventaRate: number,
): WealthBreakdown {
  const cashUsd = accounts.reduce(
    (sum, a) => sum + toUsd(accountBalance(a, movements), a.currency, ventaRate),
    0,
  );
  const investmentsUsd = positions.reduce(
    (sum, p) => sum + toUsd(positionValue(p), p.currency, ventaRate),
    0,
  );
  const propertiesUsd = properties.reduce(
    (sum, p) => sum + toUsd(p.estimatedValue, p.valueCurrency, ventaRate),
    0,
  );
  return { cashUsd, investmentsUsd, propertiesUsd };
}

/** Total de una foto mensual de patrimonio (suma de las tres partes) */
export function wealthSnapshotTotal(snapshot: WealthSnapshot): number {
  return snapshot.cashUsd + snapshot.investmentsUsd + snapshot.propertiesUsd;
}

/**
 * Variación % entre dos valores. `null` si no hay base de comparación
 * (mes anterior en cero o sin datos) — dividir por cero no tiene un % real.
 */
export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface Insight {
  message: string;
  tone: 'positive' | 'negative';
}

// Variaciones por debajo de esto se consideran ruido, no una noticia real
const INSIGHT_MIN_CHANGE_PCT = 10;
// Categorías con montos irrelevantes en ambos meses no generan insight
const INSIGHT_MIN_AMOUNT = 1000;

/**
 * Compara el gasto por categoría del mes actual contra el anterior y devuelve
 * la variación más relevante (mayor % en valor absoluto). No usa IA: es una
 * comparación directa sobre los mismos datos de `expensesByCategory`.
 */
export function monthlyInsight(current: CategoryTotal[], previous: CategoryTotal[]): Insight | null {
  const prevByCategory = new Map(previous.map((c) => [c.category, c.amount]));

  let best: { category: string; pct: number } | null = null;
  for (const curr of current) {
    const prevAmount = prevByCategory.get(curr.category);
    if (!prevAmount) continue;
    if (curr.amount < INSIGHT_MIN_AMOUNT && prevAmount < INSIGHT_MIN_AMOUNT) continue;

    const pct = ((curr.amount - prevAmount) / prevAmount) * 100;
    if (Math.abs(pct) < INSIGHT_MIN_CHANGE_PCT) continue;

    // Prioriza la variación más grande en valor absoluto
    if (!best || Math.abs(pct) > Math.abs(best.pct)) {
      best = { category: curr.category, pct };
    }
  }

  if (!best) return null;
  const rounded = Math.round(Math.abs(best.pct));
  const isReduction = best.pct < 0;
  return {
    message: isReduction
      ? `Gastaste ${rounded}% menos en ${best.category.toLowerCase()} que el mes pasado. ¡Bien ahí!`
      : `Gastaste ${rounded}% más en ${best.category.toLowerCase()} que el mes pasado.`,
    tone: isReduction ? 'positive' : 'negative',
  };
}
