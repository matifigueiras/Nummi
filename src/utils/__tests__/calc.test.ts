import { Account, Movement, Position, Property } from '../../types';
import {
  accountBalance,
  accountBalanceAt,
  budgetProgress,
  categoryAmountsByMonth,
  constantRate,
  expensesByCategory,
  incomeExpenseByMonth,
  investmentsReturnPct,
  monthlyInsight,
  monthStats,
  percentDelta,
  positionPnlPct,
  positionValue,
  propertyYieldPct,
  totalByCurrency,
  wealthBreakdown,
  wealthSnapshotTotal,
} from '../calc';

// Tipo de cambio fijo para que los tests no dependan de la cotización real
const RATE = 1000;
const rate = constantRate(RATE);

function movement(over: Partial<Movement>): Movement {
  return {
    id: 'm1',
    date: '2026-08-05',
    description: 'Test',
    category: 'Otros',
    accountId: 'caja-ars',
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
    expect(monthStats(movements, '2026-08', rate)).toEqual({
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
    expect(monthStats(movements, '2026-08', rate).income).toBe(5000);
  });

  it('convierte los montos en USD a ARS al tipo de cambio', () => {
    const movements = [movement({ type: 'ingreso', currency: 'USD', amount: 100 })];
    expect(monthStats(movements, '2026-08', rate).income).toBe(100_000);
  });

  // El bug que motivó las transferencias: una compra de dólares inflaba
  // ingresos y gastos del mes aunque la plata nunca entró ni salió.
  it('excluye las dos patas de una transferencia', () => {
    const movements = [
      movement({ id: 'sueldo', type: 'ingreso', amount: 100_000 }),
      movement({ id: 'out', type: 'gasto', amount: 50_000, transferId: 't1' }),
      movement({ id: 'in', type: 'ingreso', currency: 'USD', amount: 50, transferId: 't1' }),
    ];
    expect(monthStats(movements, '2026-08', rate)).toEqual({
      income: 100_000,
      expense: 0,
      savings: 100_000,
    });
  });

  it('da cero cuando no hay movimientos', () => {
    expect(monthStats([], '2026-08', rate)).toEqual({ income: 0, expense: 0, savings: 0 });
  });

  // La razón de ser de RateResolver: cada movimiento se convierte al blue de
  // SU fecha, no a uno fijo para todo el mes.
  it('usa la cotización de la fecha de cada movimiento', () => {
    const movements = [
      movement({ id: '1', type: 'ingreso', currency: 'USD', amount: 100, date: '2026-08-05' }),
      movement({ id: '2', type: 'ingreso', currency: 'USD', amount: 100, date: '2026-08-20' }),
    ];
    const byDate = (date: string) => (date === '2026-08-05' ? 1000 : 2000);
    expect(monthStats(movements, '2026-08', byDate).income).toBe(100_000 + 200_000);
  });
});

describe('incomeExpenseByMonth', () => {
  const movements = [
    movement({ id: '1', type: 'ingreso', amount: 10_000, date: '2026-08-10' }),
    movement({ id: '2', type: 'gasto', amount: 4_000, date: '2026-08-20' }),
    movement({ id: '3', type: 'gasto', amount: 3_000, date: '2026-07-15' }),
  ];

  it('separa ingresos y gastos de cada mes, en cero si no hay movimientos', () => {
    const result = incomeExpenseByMonth(movements, new Date(2026, 7, 1), 3, rate);
    expect(result).toEqual([
      { key: '2026-06', date: new Date(2026, 5, 1), income: 0, expense: 0 },
      { key: '2026-07', date: new Date(2026, 6, 1), income: 0, expense: 3000 },
      { key: '2026-08', date: new Date(2026, 7, 1), income: 10000, expense: 4000 },
    ]);
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

  it('solo toma los movimientos de esa cuenta', () => {
    const movements = [
      movement({ id: '1', type: 'ingreso', amount: 500 }),
      movement({ id: '2', type: 'ingreso', accountId: 'caja-usd', currency: 'USD', amount: 999 }),
    ];
    expect(accountBalance(account, movements)).toBe(1500);
  });

  // Lo que habilita tener varias cuentas: dos cajas en pesos no se mezclan
  it('separa dos cuentas de la misma moneda', () => {
    const mercadoPago: Account = {
      id: 'mp',
      name: 'Mercado Pago',
      currency: 'ARS',
      initialBalance: 200,
    };
    const movements = [
      movement({ id: '1', type: 'ingreso', amount: 500 }),
      movement({ id: '2', type: 'ingreso', accountId: 'mp', amount: 300 }),
    ];
    expect(accountBalance(account, movements)).toBe(1500);
    expect(accountBalance(mercadoPago, movements)).toBe(500);
  });

  // Las transferencias sí mueven plata de una cuenta a otra
  it('incluye las transferencias', () => {
    const movements = [movement({ id: '1', type: 'gasto', amount: 400, transferId: 't1' })];
    expect(accountBalance(account, movements)).toBe(600);
  });
});

describe('totalByCurrency', () => {
  const banco: Account = { id: 'banco', name: 'Banco', currency: 'ARS', initialBalance: 1000 };
  const mp: Account = { id: 'mp', name: 'Mercado Pago', currency: 'ARS', initialBalance: 500 };
  const usd: Account = { id: 'usd', name: 'Dólares', currency: 'USD', initialBalance: 100 };
  const accounts = [banco, mp, usd];

  it('suma los saldos de todas las cuentas de esa moneda', () => {
    const movements = [
      movement({ id: '1', accountId: 'banco', type: 'ingreso', amount: 200 }),
      movement({ id: '2', accountId: 'mp', type: 'gasto', amount: 100 }),
    ];
    expect(totalByCurrency(accounts, movements, 'ARS')).toBe(1600);
  });

  it('no mezcla monedas distintas', () => {
    expect(totalByCurrency(accounts, [], 'USD')).toBe(100);
  });

  it('da cero si no hay cuentas de esa moneda', () => {
    expect(totalByCurrency([usd], [], 'ARS')).toBe(0);
  });
});

describe('accountBalanceAt', () => {
  const account: Account = {
    id: 'caja-ars',
    name: 'Caja ARS',
    currency: 'ARS',
    initialBalance: 1000,
  };
  const movements = [
    movement({ id: '1', type: 'ingreso', amount: 500, date: '2026-06-10' }),
    movement({ id: '2', type: 'ingreso', amount: 300, date: '2026-07-10' }),
    movement({ id: '3', type: 'gasto', amount: 200, date: '2026-08-10' }),
  ];

  it('acumula solo hasta el mes pedido', () => {
    expect(accountBalanceAt(account, movements, '2026-06')).toBe(1500);
    expect(accountBalanceAt(account, movements, '2026-07')).toBe(1800);
    expect(accountBalanceAt(account, movements, '2026-08')).toBe(1600);
  });

  it('devuelve el saldo inicial para un mes anterior a todo movimiento', () => {
    expect(accountBalanceAt(account, movements, '2026-05')).toBe(1000);
  });

  it('coincide con el saldo total cuando el mes cubre todos los movimientos', () => {
    expect(accountBalanceAt(account, movements, '2026-12')).toBe(
      accountBalance(account, movements),
    );
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

describe('categoryAmountsByMonth', () => {
  const movements = [
    movement({ id: '1', category: 'Comida', amount: 5000, date: '2026-08-10' }),
    movement({ id: '2', category: 'Vivienda', amount: 3000, date: '2026-08-15' }),
    movement({ id: '3', category: 'Comida', amount: 4000, date: '2026-07-10' }),
    // categoría fuera de la lista pedida: se ignora
    movement({ id: '4', category: 'Salidas', amount: 999, date: '2026-08-05' }),
  ];

  it('mantiene la misma lista de categorías en todos los meses, en cero si no hubo gasto', () => {
    const result = categoryAmountsByMonth(movements, new Date(2026, 7, 1), 2, ['Comida', 'Vivienda']);
    expect(result).toEqual([
      { key: '2026-07', date: new Date(2026, 6, 1), amounts: { Comida: 4000, Vivienda: 0 } },
      { key: '2026-08', date: new Date(2026, 7, 1), amounts: { Comida: 5000, Vivienda: 3000 } },
    ]);
  });

  it('ignora categorías que no están en la lista pedida', () => {
    const result = categoryAmountsByMonth(movements, new Date(2026, 7, 1), 1, ['Comida']);
    expect(result[0].amounts).toEqual({ Comida: 5000 });
  });
});

describe('budgetProgress', () => {
  const budgets = [{ category: 'Comida', amount: 200_000 }];

  it('calcula lo gastado y lo que queda', () => {
    const movements = [movement({ category: 'Comida', amount: 50_000 })];
    const [result] = budgetProgress(budgets, movements, '2026-08', rate);
    expect(result.spent).toBe(50_000);
    expect(result.remaining).toBe(150_000);
    expect(result.status).toBe('ok');
  });

  it('avisa cuando se acerca al límite (80%)', () => {
    const movements = [movement({ category: 'Comida', amount: 160_000 })];
    expect(budgetProgress(budgets, movements, '2026-08', rate)[0].status).toBe('cerca');
  });

  it('marca excedido y deja el sobrante en negativo', () => {
    const movements = [movement({ category: 'Comida', amount: 250_000 })];
    const [result] = budgetProgress(budgets, movements, '2026-08', rate);
    expect(result.status).toBe('excedido');
    expect(result.remaining).toBe(-50_000);
    expect(result.ratio).toBeCloseTo(1.25, 5);
  });

  it('suma los gastos en USD convertidos al blue', () => {
    const movements = [movement({ category: 'Comida', currency: 'USD', amount: 100 })];
    expect(budgetProgress(budgets, movements, '2026-08', rate)[0].spent).toBe(100_000);
  });

  it('ignora ingresos, transferencias y otros meses', () => {
    const movements = [
      movement({ id: '1', category: 'Comida', type: 'ingreso', amount: 9999 }),
      movement({ id: '2', category: 'Comida', amount: 8888, transferId: 't1' }),
      movement({ id: '3', category: 'Comida', amount: 7777, date: '2026-07-05' }),
    ];
    expect(budgetProgress(budgets, movements, '2026-08', rate)[0].spent).toBe(0);
  });

  // Las cuentas no importan: el presupuesto es del mes, no de una cuenta
  it('suma los gastos de todas las cuentas', () => {
    const movements = [
      movement({ id: '1', category: 'Comida', accountId: 'caja-ars', amount: 30_000 }),
      movement({ id: '2', category: 'Comida', accountId: 'mp', amount: 20_000 }),
    ];
    expect(budgetProgress(budgets, movements, '2026-08', rate)[0].spent).toBe(50_000);
  });

  it('ordena primero lo más consumido', () => {
    const many = [
      { category: 'Comida', amount: 100_000 },
      { category: 'Salidas', amount: 100_000 },
    ];
    const movements = [
      movement({ id: '1', category: 'Comida', amount: 10_000 }),
      movement({ id: '2', category: 'Salidas', amount: 90_000 }),
    ];
    expect(budgetProgress(many, movements, '2026-08', rate).map((b) => b.category)).toEqual([
      'Salidas',
      'Comida',
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

  it('pondera el retorno por el valor actual de cada posición', () => {
    const result = investmentsReturnPct(
      [
        // 1500 USD de valor, +50%
        position({ quantity: 10, buyPrice: 100, currentPrice: 150 }),
        // 2700 USD de valor, -10% — pesa más por ser la posición más grande
        position({ id: 'p2', quantity: 30, buyPrice: 100, currentPrice: 90 }),
      ],
      RATE,
    );
    // (1500*50 + 2700*-10) / 4200 ≈ 11.43
    expect(result).toBeCloseTo(80 / 7, 5);
  });

  it('da cero sin posiciones', () => {
    expect(investmentsReturnPct([], RATE)).toBe(0);
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

describe('percentDelta', () => {
  it('calcula la variación porcentual entre dos valores', () => {
    expect(percentDelta(120, 100)).toBeCloseTo(20, 5);
    expect(percentDelta(80, 100)).toBeCloseTo(-20, 5);
  });

  it('da null si no hay mes anterior con qué comparar', () => {
    expect(percentDelta(100, 0)).toBeNull();
    expect(percentDelta(100, -50)).toBeNull();
  });
});

describe('monthlyInsight', () => {
  it('elige la categoría con mayor variación porcentual en valor absoluto', () => {
    const current = [
      { category: 'Comida', amount: 55_000 }, // +10% (chico)
      { category: 'Viajes', amount: 30_000 }, // -70% (grande)
    ];
    const previous = [
      { category: 'Comida', amount: 50_000 },
      { category: 'Viajes', amount: 100_000 },
    ];
    const insight = monthlyInsight(current, previous);
    expect(insight?.tone).toBe('positive');
    expect(insight?.message).toContain('70%');
    expect(insight?.message).toContain('viajes');
  });

  it('marca como negativo un aumento de gasto', () => {
    const current = [{ category: 'Salidas', amount: 50_000 }];
    const previous = [{ category: 'Salidas', amount: 20_000 }];
    const insight = monthlyInsight(current, previous);
    expect(insight?.tone).toBe('negative');
    expect(insight?.message).toContain('150%');
  });

  it('ignora variaciones menores al umbral', () => {
    const current = [{ category: 'Comida', amount: 105_000 }];
    const previous = [{ category: 'Comida', amount: 100_000 }];
    expect(monthlyInsight(current, previous)).toBeNull();
  });

  it('ignora categorías con montos irrelevantes en ambos meses', () => {
    const current = [{ category: 'Otros', amount: 500 }];
    const previous = [{ category: 'Otros', amount: 100 }];
    expect(monthlyInsight(current, previous)).toBeNull();
  });

  it('ignora categorías nuevas sin mes anterior para comparar', () => {
    const current = [{ category: 'Mascota', amount: 40_000 }];
    const previous: { category: string; amount: number }[] = [];
    expect(monthlyInsight(current, previous)).toBeNull();
  });

  it('da null sin datos', () => {
    expect(monthlyInsight([], [])).toBeNull();
  });
});

describe('wealthBreakdown', () => {
  const account: Account = {
    id: 'caja-usd',
    name: 'Caja USD',
    currency: 'USD',
    initialBalance: 1000,
  };
  const position: Position = {
    id: 'p1',
    kind: 'accion',
    ticker: 'AAPL',
    name: 'Apple',
    quantity: 10,
    currency: 'USD',
    buyPrice: 100,
    currentPrice: 150,
  };
  const property: Property = {
    id: 'r1',
    name: 'Depto',
    monthlyRent: 1000,
    rentCurrency: 'USD',
    monthlyExpenses: 0,
    expensesCurrency: 'USD',
    estimatedValue: 50_000,
    valueCurrency: 'USD',
  };

  it('desglosa efectivo, inversiones y propiedades, todo consolidado en USD', () => {
    const arsAccount: Account = { ...account, id: 'caja-ars', currency: 'ARS', initialBalance: RATE };
    const result = wealthBreakdown([account, arsAccount], [], [position], [property], RATE);
    // caja-usd: 1000 USD directo. caja-ars: RATE ARS / RATE = 1 USD
    expect(result.cashUsd).toBe(1001);
    expect(result.investmentsUsd).toBe(positionValue(position));
    expect(result.propertiesUsd).toBe(50_000);
  });

  it('da todo en cero sin cuentas/posiciones/propiedades', () => {
    expect(wealthBreakdown([], [], [], [], RATE)).toEqual({
      cashUsd: 0,
      investmentsUsd: 0,
      propertiesUsd: 0,
    });
  });
});

describe('wealthSnapshotTotal', () => {
  it('suma las tres partes de una foto mensual', () => {
    expect(
      wealthSnapshotTotal({ monthKey: '2026-08', cashUsd: 100, investmentsUsd: 200, propertiesUsd: 300 }),
    ).toBe(600);
  });
});
