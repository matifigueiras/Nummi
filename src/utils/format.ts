import { Currency } from '../types';

const formatters: Record<string, Intl.NumberFormat> = {};

function getFormatter(currency: Currency, compact: boolean): Intl.NumberFormat {
  const key = `${currency}-${compact}`;
  if (!formatters[key]) {
    formatters[key] = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      ...(compact ? { notation: 'compact' } : {}),
    });
  }
  return formatters[key];
}

export function formatMoney(amount: number, currency: Currency): string {
  return getFormatter(currency, false).format(amount);
}

export function formatMoneyCompact(amount: number, currency: Currency): string {
  return getFormatter(currency, true).format(amount);
}

/** Con signo explícito: +$1.000 / -$1.000 */
export function formatSigned(amount: number, currency: Currency): string {
  const sign = amount >= 0 ? '+' : '−';
  return `${sign}${formatMoney(Math.abs(amount), currency)}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '' : '−'}${Math.abs(value).toFixed(decimals).replace('.', ',')}%`;
}

/** "agosto 2026" → "Agosto 2026" */
export function formatMonth(date: Date): string {
  const raw = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** "2026-08-06" → "6 ago" */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date
    .toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    .replace('.', '');
}

/** Clave yyyy-mm de un ISO date, para agrupar por mes */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Convierte un monto a USD usando el blue (venta) como referencia */
export function toUsd(amount: number, currency: Currency, ventaRate: number): number {
  return currency === 'USD' ? amount : amount / ventaRate;
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}
