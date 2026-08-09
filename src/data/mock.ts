import { Account, Category, Movement, Position, Property, SavingsGoal } from '../types';

// Categorías iniciales. "Transferencia" no está: la usan las transferencias
// entre cuentas y no se elige a mano.
export const mockCategories: Category[] = [
  { id: 'c-comida', name: 'Comida', type: 'gasto' },
  { id: 'c-vivienda', name: 'Vivienda', type: 'gasto' },
  { id: 'c-transporte', name: 'Transporte', type: 'gasto' },
  { id: 'c-servicios', name: 'Servicios', type: 'gasto' },
  { id: 'c-salidas', name: 'Salidas', type: 'gasto' },
  { id: 'c-salud', name: 'Salud', type: 'gasto' },
  { id: 'c-viajes', name: 'Viajes', type: 'gasto' },
  { id: 'c-ahorro-g', name: 'Ahorro', type: 'gasto' },
  { id: 'c-otros-g', name: 'Otros', type: 'gasto' },
  { id: 'c-sueldo', name: 'Sueldo', type: 'ingreso' },
  { id: 'c-freelance', name: 'Freelance', type: 'ingreso' },
  { id: 'c-ahorro-i', name: 'Ahorro', type: 'ingreso' },
  { id: 'c-otros-i', name: 'Otros', type: 'ingreso' },
];

// Datos simulados. Cuando exista una API/base de datos real, este archivo
// desaparece y el repositorio pasa a leer de ahí.

export const mockAccounts: Account[] = [
  { id: 'caja-ars', name: 'Caja ARS', currency: 'ARS', initialBalance: 850000 },
  { id: 'caja-usd', name: 'Caja USD', currency: 'USD', initialBalance: 2400 },
];

export const mockMovements: Movement[] = [
  // Mayo 2026
  { id: 'm01', date: '2026-05-01', description: 'Sueldo', category: 'Sueldo', accountId: 'caja-ars', type: 'ingreso', currency: 'ARS', amount: 2650000 },
  { id: 'm02', date: '2026-05-03', description: 'Alquiler depto', category: 'Vivienda', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 620000 },
  { id: 'm03', date: '2026-05-05', description: 'Supermercado Coto', category: 'Comida', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 185000 },
  { id: 'm04', date: '2026-05-10', description: 'Proyecto freelance', category: 'Freelance', accountId: 'caja-usd', type: 'ingreso', currency: 'USD', amount: 450 },
  { id: 'm05', date: '2026-05-14', description: 'Cena con amigos', category: 'Salidas', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 62000 },
  { id: 'm06', date: '2026-05-18', description: 'Internet + celular', category: 'Servicios', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 48000 },
  { id: 'm07', date: '2026-05-22', description: 'Supermercado Día', category: 'Comida', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 96000 },
  { id: 'm08', date: '2026-05-27', description: 'Compra USD', category: 'Transferencia', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 500000, transferId: 't1' },
  { id: 'm09', date: '2026-05-27', description: 'Compra USD', category: 'Transferencia', accountId: 'caja-usd', type: 'ingreso', currency: 'USD', amount: 380, transferId: 't1' },

  // Junio 2026
  { id: 'm10', date: '2026-06-01', description: 'Sueldo', category: 'Sueldo', accountId: 'caja-ars', type: 'ingreso', currency: 'ARS', amount: 2650000 },
  { id: 'm11', date: '2026-06-03', description: 'Alquiler depto', category: 'Vivienda', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 620000 },
  { id: 'm12', date: '2026-06-06', description: 'Supermercado Coto', category: 'Comida', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 210000 },
  { id: 'm13', date: '2026-06-09', description: 'Nafta', category: 'Transporte', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 75000 },
  { id: 'm14', date: '2026-06-12', description: 'Proyecto freelance', category: 'Freelance', accountId: 'caja-usd', type: 'ingreso', currency: 'USD', amount: 600 },
  { id: 'm15', date: '2026-06-15', description: 'Regalo cumpleaños', category: 'Otros', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 55000 },
  { id: 'm16', date: '2026-06-18', description: 'Internet + celular', category: 'Servicios', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 48000 },
  { id: 'm17', date: '2026-06-21', description: 'Suscripciones (Spotify, Netflix)', category: 'Servicios', accountId: 'caja-usd', type: 'gasto', currency: 'USD', amount: 22 },
  { id: 'm18', date: '2026-06-25', description: 'Venta USD', category: 'Transferencia', accountId: 'caja-usd', type: 'gasto', currency: 'USD', amount: 200, transferId: 't2' },
  { id: 'm19', date: '2026-06-25', description: 'Venta USD', category: 'Transferencia', accountId: 'caja-ars', type: 'ingreso', currency: 'ARS', amount: 268000, transferId: 't2' },
  { id: 'm20', date: '2026-06-28', description: 'Farmacia', category: 'Salud', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 34000 },

  // Julio 2026
  { id: 'm21', date: '2026-07-01', description: 'Sueldo', category: 'Sueldo', accountId: 'caja-ars', type: 'ingreso', currency: 'ARS', amount: 2900000 },
  { id: 'm22', date: '2026-07-01', description: 'Aguinaldo', category: 'Sueldo', accountId: 'caja-ars', type: 'ingreso', currency: 'ARS', amount: 1450000 },
  { id: 'm23', date: '2026-07-03', description: 'Alquiler depto', category: 'Vivienda', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 650000 },
  { id: 'm24', date: '2026-07-05', description: 'Supermercado Coto', category: 'Comida', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 195000 },
  { id: 'm25', date: '2026-07-08', description: 'Compra USD', category: 'Transferencia', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 1400000, transferId: 't3' },
  { id: 'm26', date: '2026-07-08', description: 'Compra USD', category: 'Transferencia', accountId: 'caja-usd', type: 'ingreso', currency: 'USD', amount: 1000, transferId: 't3' },
  { id: 'm27', date: '2026-07-12', description: 'Proyecto freelance', category: 'Freelance', accountId: 'caja-usd', type: 'ingreso', currency: 'USD', amount: 500 },
  { id: 'm28', date: '2026-07-15', description: 'Escapada a Mendoza', category: 'Viajes', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 420000 },
  { id: 'm29', date: '2026-07-18', description: 'Internet + celular', category: 'Servicios', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 52000 },
  { id: 'm30', date: '2026-07-21', description: 'Suscripciones (Spotify, Netflix)', category: 'Servicios', accountId: 'caja-usd', type: 'gasto', currency: 'USD', amount: 22 },
  { id: 'm31', date: '2026-07-26', description: 'Cena aniversario', category: 'Salidas', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 98000 },

  // Agosto 2026
  { id: 'm32', date: '2026-08-01', description: 'Sueldo', category: 'Sueldo', accountId: 'caja-ars', type: 'ingreso', currency: 'ARS', amount: 2900000 },
  { id: 'm33', date: '2026-08-03', description: 'Alquiler depto', category: 'Vivienda', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 650000 },
  { id: 'm34', date: '2026-08-04', description: 'Supermercado Jumbo', category: 'Comida', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 172000 },
  { id: 'm35', date: '2026-08-05', description: 'Proyecto freelance', category: 'Freelance', accountId: 'caja-usd', type: 'ingreso', currency: 'USD', amount: 550 },
  { id: 'm36', date: '2026-08-05', description: 'Carga SUBE', category: 'Transporte', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 20000 },
  { id: 'm37', date: '2026-08-06', description: 'Café de especialidad', category: 'Salidas', accountId: 'caja-ars', type: 'gasto', currency: 'ARS', amount: 9500 },
  { id: 'm38', date: '2026-08-03', description: 'Suscripciones (Spotify, Netflix)', category: 'Servicios', accountId: 'caja-usd', type: 'gasto', currency: 'USD', amount: 22 },
];

export const mockPositions: Position[] = [
  { id: 'p1', kind: 'accion', ticker: 'AAPL', name: 'Apple', quantity: 10, currency: 'USD', buyPrice: 192, currentPrice: 238 },
  { id: 'p2', kind: 'accion', ticker: 'NVDA', name: 'NVIDIA', quantity: 6, currency: 'USD', buyPrice: 98, currentPrice: 182 },
  { id: 'p3', kind: 'accion', ticker: 'SPY', name: 'S&P 500 ETF', quantity: 4, currency: 'USD', buyPrice: 505, currentPrice: 574 },
  { id: 'p4', kind: 'accion', ticker: 'GGAL', name: 'Grupo Galicia', quantity: 100, currency: 'ARS', buyPrice: 4500, currentPrice: 7200 },
  { id: 'p5', kind: 'cripto', ticker: 'BTC', name: 'Bitcoin', quantity: 0.048, currency: 'USD', buyPrice: 52000, currentPrice: 108500 },
  { id: 'p6', kind: 'cripto', ticker: 'ETH', name: 'Ethereum', quantity: 0.85, currency: 'USD', buyPrice: 2450, currentPrice: 3920 },
];

export const mockProperties: Property[] = [
  // Caso típico argentino: valor en USD, alquiler y gastos en ARS
  {
    id: 'r1',
    name: 'Depto 2 amb · Palermo',
    monthlyRent: 950000,
    rentCurrency: 'ARS',
    monthlyExpenses: 190000,
    expensesCurrency: 'ARS',
    estimatedValue: 128000,
    valueCurrency: 'USD',
  },
  {
    id: 'r2',
    name: 'Cochera · Belgrano',
    monthlyRent: 95,
    rentCurrency: 'USD',
    monthlyExpenses: 18,
    expensesCurrency: 'USD',
    estimatedValue: 19500,
    valueCurrency: 'USD',
  },
];

export const mockSavingsGoal: SavingsGoal = { currency: 'ARS', amount: 900000 };
