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

/** Reemplazo visual de un monto cuando el usuario lo oculta (ver PrivacyContext) */
export const HIDDEN_AMOUNT = '••••••';

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

/** Último día del mes de `date`, en ISO yyyy-mm-dd */
export function endOfMonthISO(date: Date): string {
  return dateToISO(new Date(date.getFullYear(), date.getMonth() + 1, 0));
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

/**
 * Agrega el separador de miles mientras se escribe un monto ("2900000" →
 * "2.900.000"). Sólo toca la parte entera; la parte decimal (lo que sigue a
 * la primera coma) queda tal cual, sin forzar cantidad de dígitos.
 */
export function formatThousandsLive(raw: string): string {
  const [intPart, ...rest] = raw.split(',');
  const decPart = rest.length > 0 ? ',' + rest.join('') : '';
  const digitsOnly = intPart.replace(/\D/g, '');
  if (digitsOnly === '') return decPart;
  const grouped = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return grouped + decPart;
}

/**
 * Limpia lo que se insertó/borró en un edit (nunca el texto completo): sólo
 * dígitos y, como mucho, una coma decimal sobreviven. El punto se acepta
 * como alias de coma (teclado numérico de mobile) cuando se tipea un único
 * carácter; en un pegado más largo, en cambio, el punto se asume separador
 * de miles del texto pegado y se descarta.
 */
function sanitizeInsertedRaw(inserted: string, alreadyHasComma: boolean): string {
  if (inserted.length === 0) return '';

  if (inserted.length === 1) {
    const ch = inserted;
    if (/\d/.test(ch)) return ch;
    if ((ch === ',' || ch === '.') && !alreadyHasComma) return ',';
    return '';
  }

  let result = '';
  let usedComma = alreadyHasComma;
  for (const ch of inserted) {
    if (/\d/.test(ch)) {
      result += ch;
    } else if (ch === ',' && !usedComma) {
      result += ',';
      usedComma = true;
    }
    // un "." dentro de un texto pegado se asume separador de miles: se descarta
  }
  return result;
}

/**
 * Inversa de `formatThousandsLive`, pensada para edición en vivo: a partir
 * del valor crudo ANTERIOR (única fuente de verdad) y el texto que quedó en
 * el input tras el último cambio, calcula el nuevo valor crudo.
 *
 * No intenta "adivinar" el significado de cada separador mirando sólo el
 * texto final — eso rompía apenas el número cruzaba de 4 a 5+ dígitos
 * mientras se tipeaba en PC (el punto de miles recién agregado se confundía
 * con una coma decimal). En cambio, reconstruye el texto anterior a partir
 * del crudo (`formatThousandsLive(previousRaw)`), encuentra el prefijo/sufijo
 * en común con el texto nuevo, y sólo la diferencia en el medio —lo que
 * realmente se tipeó o borró— se aplica sobre el crudo. Los puntos que la
 * propia función agrega para mostrar nunca entran en la cuenta.
 */
export function stripThousands(text: string, previousRaw: string): string {
  const oldText = formatThousandsLive(previousRaw);
  if (text === oldText) return previousRaw;

  const maxCommon = Math.min(oldText.length, text.length);
  let prefixLen = 0;
  while (prefixLen < maxCommon && oldText[prefixLen] === text[prefixLen]) prefixLen++;

  const maxSuffix = maxCommon - prefixLen;
  let suffixLen = 0;
  while (
    suffixLen < maxSuffix &&
    oldText[oldText.length - 1 - suffixLen] === text[text.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const inserted = text.slice(prefixLen, text.length - suffixLen);

  // Posición en el crudo equivalente a una posición en el texto formateado:
  // cuenta cuántos caracteres "reales" (no puntos de miles) la preceden.
  const rawIndexAt = (formattedIndex: number) =>
    oldText.slice(0, formattedIndex).replace(/\./g, '').length;

  const prefixLenInRaw = rawIndexAt(prefixLen);
  const suffixLenInRaw = previousRaw.length - rawIndexAt(oldText.length - suffixLen);

  const insertedRaw = sanitizeInsertedRaw(inserted, previousRaw.includes(','));

  return (
    previousRaw.slice(0, prefixLenInRaw) +
    insertedRaw +
    previousRaw.slice(previousRaw.length - suffixLenInRaw)
  );
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
