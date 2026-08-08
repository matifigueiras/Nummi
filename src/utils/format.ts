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

/**
 * Acepta coma o punto como separador decimal ("15,5" / "0.048"); NaN si no
 * parsea. El string vacío da NaN a propósito: "sin completar" no es "cero".
 */
export function parseAmount(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return NaN;
  return Number(normalized);
}

/** Convierte un monto a USD usando el blue (venta) como referencia */
export function toUsd(amount: number, currency: Currency, ventaRate: number): number {
  return currency === 'USD' ? amount : amount / ventaRate;
}

export function todayISO(): string {
  return dateToISO(new Date());
}

export function dateToISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** Suma (o resta) días a una fecha ISO yyyy-mm-dd */
export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return dateToISO(new Date(y, m - 1, d + days));
}

/** "Hoy" / "Ayer" / "5 ago" según la distancia con hoy */
export function formatDayLabel(isoDate: string): string {
  if (isoDate === todayISO()) return 'Hoy';
  if (isoDate === addDaysISO(todayISO(), -1)) return 'Ayer';
  return formatShortDate(isoDate);
}

/** "recién" / "hace 5 min" / "hace 2 h" / "hace 3 días" */
export function formatRelativeTime(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 90) return 'recién';
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.round(seconds / 3600)} h`;
  return `hace ${Math.round(seconds / 86400)} días`;
}
