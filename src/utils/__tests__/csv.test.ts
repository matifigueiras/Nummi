import { Account, Movement } from '../../types';
import { escapeCsv, movementsToCsv, toCsvRow } from '../csv';

const accounts: Account[] = [
  { id: 'caja-ars', name: 'Caja ARS', currency: 'ARS', initialBalance: 0 },
  { id: 'mp', name: 'Mercado Pago', currency: 'ARS', initialBalance: 0 },
];

function movement(over: Partial<Movement> = {}): Movement {
  return {
    id: 'm1',
    date: '2026-08-05',
    description: 'Supermercado',
    category: 'Comida',
    accountId: 'caja-ars',
    type: 'gasto',
    currency: 'ARS',
    amount: 1000,
    ...over,
  };
}

describe('escapeCsv', () => {
  it('deja el texto simple sin comillas', () => {
    expect(escapeCsv('Supermercado')).toBe('Supermercado');
  });

  // El separador es ";", así que una descripción con ";" rompería la columna
  it('encomilla el texto que contiene el separador', () => {
    expect(escapeCsv('Pan; leche')).toBe('"Pan; leche"');
  });

  it('duplica las comillas internas', () => {
    expect(escapeCsv('Cena "especial"')).toBe('"Cena ""especial"""');
  });

  it('encomilla el texto con saltos de línea', () => {
    expect(escapeCsv('Una\nDos')).toBe('"Una\nDos"');
  });
});

describe('toCsvRow', () => {
  it('une los valores con punto y coma', () => {
    expect(toCsvRow(['a', 'b', 1])).toBe('a;b;1');
  });
});

describe('movementsToCsv', () => {
  it('incluye la fila de encabezados', () => {
    const csv = movementsToCsv([], accounts);
    expect(csv.split('\n')[0]).toContain('Fecha;Descripción;Categoría');
  });

  it('resuelve el nombre de la cuenta', () => {
    const csv = movementsToCsv([movement({ accountId: 'mp' })], accounts);
    expect(csv).toContain('Mercado Pago');
  });

  // El signo permite sumar la columna directo en la planilla
  it('escribe los gastos en negativo y los ingresos en positivo', () => {
    const csv = movementsToCsv(
      [
        movement({ id: '1', type: 'gasto', amount: 1000 }),
        movement({ id: '2', type: 'ingreso', amount: 2000 }),
      ],
      accounts,
    );
    const rows = csv.split('\n');
    expect(rows[1]).toContain('-1000');
    expect(rows[2]).toContain(';2000;');
  });

  it('usa coma decimal', () => {
    const csv = movementsToCsv([movement({ type: 'ingreso', amount: 1234.56 })], accounts);
    expect(csv).toContain('1234,56');
  });

  it('ordena por fecha ascendente', () => {
    const csv = movementsToCsv(
      [
        movement({ id: '1', date: '2026-08-20', description: 'Ultimo' }),
        movement({ id: '2', date: '2026-08-01', description: 'Primero' }),
      ],
      accounts,
    );
    const rows = csv.split('\n');
    expect(rows[1]).toContain('Primero');
    expect(rows[2]).toContain('Ultimo');
  });

  it('marca las transferencias', () => {
    const csv = movementsToCsv([movement({ transferId: 't1' })], accounts);
    expect(csv.split('\n')[1].endsWith('sí')).toBe(true);
  });

  it('deja vacía la marca en los movimientos normales', () => {
    const csv = movementsToCsv([movement()], accounts);
    expect(csv.split('\n')[1].endsWith(';')).toBe(true);
  });
});
