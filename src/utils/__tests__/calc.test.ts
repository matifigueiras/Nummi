import { Account, Movement, Position, Property } from '../../types';
import {
  accountBalance,
  expensesByCategory,
  monthStats,
  positionPnlPct,
  positionValue,
  propertyYieldPct,
  savingsByMonth,
} from '../calc';

// Tipo de cambio fijo para que los tests no dependan de la cotización real
const RATE = 1000;

function movement(over: Partial<Movement>): Movement {
  return {
    id: 'm1',
    date: '2026-08-05',
    description: 'Test',
    category: 'Otros',
    type: 'gasto',
    currency: 'ARS',
    amount: 1000,
    ...over,
  };
}

describe('monthStats', () => {
  it('suma ingresos y gastos del mes pedido', () => {
    const movements = [
      movement({ id: '1', type: 'ingreso', amount: 5000 }),
      movement({ id: '2', type: 'gasto', amount: 2000 }),
    ];
    expect(monthStats(movements, '2026-08', RATE)).toEqual({
      income: 5000,
      expense: 2000,
      savings: 3000,
    });
  });

  it('ignora los movimientos de otros meses', () => {
    const movements = [
      movement({ id: '1', type: 'ingreso', amount: 5000, date: '2026-08-01' }),
      movement({ id: '2', type: 'ingreso', amount: 9999, date: '2026-07-31' }),
      movement({ id: '3', type: 'ingreso', amount: 8888, date: '2026-09-01' }),
    ];
    expect(monthStats(movements, '2026-08', RATE).income).toBe(5000);
  });

  it('convierte los montos en USD a ARS al tipo de cambio', () => {
    const movements = [movement({ type: 'ingreso', currency: 'USD', amount: 100 })];
    expect(monthStats(movements, '2026-08', RATE).income).toBe(100_000);
  });

  // El bug que motivó las transferencias: una compra de dólares inflaba
  // ingresos y gastos del mes aunque la plata nunca entró ni salió.
  it('excluye las dos patas de una transferencia', () => {
    const movements = [
      movement({ id: 'sueldo', type: 'ingreso', amount: 100_000 }),
      movement({ id: 'out', type: 'gasto', amount: 50_000, transferId: 't1' }),
      movement({ id: 'in', type: 'ingreso', currency: 'USD', amount: 50, transferId: 't1' }),
    ];
    expect(monthStats(movements, '2026-08', RATE)).toEqual({
      income: 100_000,
      expense: 0,
      savings: 100_000,
    });
  });

  it('da cero cuando no hay movimientos', () => {
    expect(monthStats([], '2026-08', RATE)).toEqual({ income: 0, expense: 0, savings: 0 });
  });
});

describe('savingsByMonth', () => {
  const movements = [
    movement({ id: '1', type: 'ingreso', amount: 10_000, date: '2026-08-10' }),
    movement({ id: '2', type: 'gasto', amount: 4_000, date: '2026-08-20' }),
    movement({ id: '3', type: 'gasto', amount: 3_000, date: '2026-07-15' }),
  ];

  it('devuelve los meses del más viejo al más nuevo, terminando en el pedido', () => {
    const result = savingsByMonth(movements, new Date(2026, 7, 1), 3, RATE);
    expect(result.map((r) => r.key)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('calcula el ahorro de cada mes y deja en cero los meses sin movimientos', () => {
    const result = savingsByMonth(movements, new Date(2026, 7, 1), 3, RATE);
    expect(result.map((r) => r.savings)).toEqual([0, -3000, 6000]);
  });

  it('cruza el cambio de año hacia atrás', () => {
    const result = savingsByMonth([], new Date(2026, 1, 1), 3, RATE);
    expect(result.map((r) => r.key)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('accountBalance', () => {
  const account: Account = {
    id: 'caja-ars',
    name: 'Caja ARS',
    currency: 'ARS',
    initialBalance: 1000,
  };

  it('parte del saldo inicial y aplica el signo de cada movimiento', () => {
    const movements = [
      movement({ id: '1', type: 'ingreso', amount: 500 }),
      movement({ id: '2', type: 'gasto', amount: 200 }),
    ];
    expect(accountBalance(account, movements)).toBe(1300);
  });

  it('solo toma los movimientos de la moneda de la caja', () => {
    const movements = [
      movement({ id: '1', type: 'ingreso', amount: 500 }),
      movement({ id: '2', type: 'ingreso', currency: 'USD', amount: 999 }),
    ];
    expect(accountBalance(account, movements)).toBe(1500);
  });

  // Las transferencias sí mueven plata de una caja a otra
  it('incluye las transferencias', () => {
    const movements = [movement({ id: '1', type: 'gasto', amount: 400, transferId: 't1' })];
    expect(accountBalance(account, movements)).toBe(600);
  });
});

describe('expensesByCategory', () => {
  it('agrupa y ordena de mayor a menor', () => {
    const movements = [
      movement({ id: '1', category: 'Comida', amount: 100 }),
      movement({ id: '2', category: 'Vivienda', amount: 500 }),
      movement({ id: '3', category: 'Comida', amount: 250 }),
    ];
    expect(expensesByCategory(movements, '2026-08', 5)).toEqual([
      { category: 'Vivienda', amount: 500 },
      { category: 'Comida', amount: 350 },
    ]);
  });

  it('agrupa el excedente en "Otras"', () => {
    const movements = [
      movement({ id: '1', category: 'A', amount: 100 }),
      movement({ id: '2', category: 'B', amount: 90 }),
      movement({ id: '3', category: 'C', amount: 80 }),
      movement({ id: '4', category: 'D', amount: 70 }),
    ];
    const result = expensesByCategory(movements, '2026-08', 2);
    expect(result).toEqual([
      { category: 'A', amount: 100 },
      { category: 'B', amount: 90 },
      { category: 'Otras', amount: 150 },
    ]);
  });

  it('no agrega "Otras" cuando no sobra nada', () => {
    const movements = [movement({ id: '1', category: 'A', amount: 100 })];
    expect(expensesByCategory(movements, '2026-08', 5)).toHaveLength(1);
  });

  it('ignora ingresos y transferencias', () => {
    const movements = [
      movement({ id: '1', category: 'Comida', amount: 100 }),
      movement({ id: '2', category: 'Sueldo', type: 'ingreso', amount: 9999 }),
      movement({ id: '3', category: 'Transferencia', amount: 8888, transferId: 't1' }),
    ];
    expect(expensesByCategory(movements, '2026-08', 5)).toEqual([
      { category: 'Comida', amount: 100 },
    ]);
  });
});

describe('posiciones', () => {
  function position(over: Partial<Position>): Position {
    return {
      id: 'p1',
      kind: 'accion',
      ticker: 'AAPL',
      name: 'Apple',
      quantity: 10,
      currency: 'USD',
      buyPrice: 100,
      currentPrice: 150,
      ...over,
    };
  }

  it('calcula el valor de mercado', () => {
    expect(positionValue(position({ quantity: 10, currentPrice: 150 }))).toBe(1500);
  });

  it('soporta cantidades fraccionarias (cripto)', () => {
    expect(positionValue(position({ quantity: 0.5, currentPrice: 60_000 }))).toBe(30_000);
  });

  it('calcula la ganancia porcentual', () => {
    expect(positionPnlPct(position({ buyPrice: 100, currentPrice: 150 }))).toBe(50);
  });

  it('calcula la pérdida porcentual', () => {
    expect(positionPnlPct(position({ buyPrice: 2450, currentPrice: 1225 }))).toBe(-50);
  });

  it('no divide por cero si el precio de compra es 0', () => {
    expect(positionPnlPct(position({ buyPrice: 0 }))).toBe(0);
  });
});

describe('propertyYieldPct', () => {
  function property(over: Partial<Property>): Property {
    return {
      id: 'r1',
      name: 'Depto',
      monthlyRent: 1000,
      rentCurrency: 'USD',
      monthlyExpenses: 0,
      expensesCurrency: 'USD',
      estimatedValue: 120_000,
      valueCurrency: 'USD',
      ...over,
    };
  }

  it('calcula el yield anual neto de gastos', () => {
    const result = propertyYieldPct(
      property({ monthlyRent: 1000, monthlyExpenses: 200, estimatedValue: 96_000 }),
      RATE,
    );
    expect(result).toBeCloseTo(10, 5);
  });

  // El caso real: valor en dólares, alquiler y expensas en pesos
  it('convierte a USD cuando las monedas están mezcladas', () => {
    const result = propertyYieldPct(
      property({
        monthlyRent: 1_000_000,
        rentCurrency: 'ARS',
        monthlyExpenses: 200_000,
        expensesCurrency: 'ARS',
        estimatedValue: 96_000,
        valueCurrency: 'USD',
      }),
      RATE,
    );
    // 800.000 ARS/mes ÷ 1000 = 800 USD → 9.600 USD/año sobre 96.000 USD
    expect(result).toBeCloseTo(10, 5);
  });

  it('da negativo cuando los gastos superan el alquiler', () => {
    expect(propertyYieldPct(property({ monthlyRent: 100, monthlyExpenses: 300 }), RATE)).toBeLessThan(0);
  });

  it('no divide por cero si el valor estimado es 0', () => {
    expect(propertyYieldPct(property({ estimatedValue: 0 }), RATE)).toBe(0);
  });
});
