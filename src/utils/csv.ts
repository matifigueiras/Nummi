import { Account, Movement, Position, Property } from '../types';

// Armado del CSV de exportación. Es una función pura para poder testear el
// escapado y el contenido sin tocar el sistema de archivos.

/**
 * Escapa un valor para CSV: comillas dobles si contiene separador, comillas o
 * saltos de línea (las comillas internas se duplican).
 */
export function escapeCsv(value: string | number): string {
  const text = String(value);
  if (/[";\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsvRow(values: (string | number)[]): string {
  return values.map(escapeCsv).join(';');
}

/**
 * CSV de movimientos. Usa punto y coma como separador y coma decimal, que es
 * lo que espera Excel en configuración regional argentina.
 */
export function movementsToCsv(movements: Movement[], accounts: Account[]): string {
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';
  const header = toCsvRow([
    'Fecha',
    'Descripción',
    'Categoría',
    'Tipo',
    'Cuenta',
    'Moneda',
    'Monto',
    'Transferencia',
  ]);
  const rows = [...movements]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((m) =>
      toCsvRow([
        m.date,
        m.description,
        m.category,
        m.type,
        accountName(m.accountId),
        m.currency,
        // Signo explícito: así el CSV se puede sumar directo
        String(m.type === 'gasto' ? -m.amount : m.amount).replace('.', ','),
        m.transferId ? 'sí' : '',
      ]),
    );
  return [header, ...rows].join('\n');
}

export function positionsToCsv(positions: Position[]): string {
  const header = toCsvRow([
    'Ticker',
    'Nombre',
    'Tipo',
    'Cantidad',
    'Moneda',
    'Precio compra',
    'Precio actual',
    'Valor',
  ]);
  const rows = positions.map((p) =>
    toCsvRow([
      p.ticker,
      p.name,
      p.kind,
      String(p.quantity).replace('.', ','),
      p.currency,
      String(p.buyPrice).replace('.', ','),
      String(p.currentPrice).replace('.', ','),
      String(p.quantity * p.currentPrice).replace('.', ','),
    ]),
  );
  return [header, ...rows].join('\n');
}

export function propertiesToCsv(properties: Property[]): string {
  const header = toCsvRow([
    'Nombre',
    'Alquiler',
    'Moneda alquiler',
    'Gastos',
    'Moneda gastos',
    'Valor estimado',
    'Moneda valor',
  ]);
  const rows = properties.map((p) =>
    toCsvRow([
      p.name,
      String(p.monthlyRent).replace('.', ','),
      p.rentCurrency,
      String(p.monthlyExpenses).replace('.', ','),
      p.expensesCurrency,
      String(p.estimatedValue).replace('.', ','),
      p.valueCurrency,
    ]),
  );
  return [header, ...rows].join('\n');
}
