import {
  accountFromDb,
  accountToDb,
  budgetFromDb,
  categoryFromDb,
  categoryToDb,
  movementFromDb,
  movementToDb,
  positionFromDb,
  positionToDb,
  propertyFromDb,
  propertyToDb,
  recurringFromDb,
  recurringToDb,
  savingsGoalFromDb,
} from '../supabaseMappers';

describe('accounts', () => {
  it('lee una fila de la base a Account', () => {
    expect(
      accountFromDb({ id: 'a1', name: 'Banco', currency: 'ARS', initial_balance: 1000 }),
    ).toEqual({ id: 'a1', name: 'Banco', currency: 'ARS', initialBalance: 1000 });
  });

  it('arma el payload de inserción con el user_id', () => {
    expect(accountToDb({ name: 'Banco', currency: 'ARS', initialBalance: 1000 }, 'u1')).toEqual({
      user_id: 'u1',
      name: 'Banco',
      currency: 'ARS',
      initial_balance: 1000,
    });
  });
});

describe('categories', () => {
  it('ida y vuelta sin perder datos', () => {
    const category = categoryFromDb({ id: 'c1', name: 'Comida', type: 'gasto' });
    expect(category).toEqual({ id: 'c1', name: 'Comida', type: 'gasto' });
    expect(categoryToDb(category, 'u1')).toEqual({ user_id: 'u1', name: 'Comida', type: 'gasto' });
  });
});

describe('movements', () => {
  const row = {
    id: 'm1',
    date: '2026-08-05',
    description: 'Supermercado',
    category: 'Comida',
    type: 'gasto' as const,
    account_id: 'a1',
    currency: 'ARS' as const,
    amount: 5000,
    recurring_id: null,
    transfer_id: null,
  };

  it('mapea null a undefined en los campos opcionales', () => {
    const movement = movementFromDb(row);
    expect(movement.recurringId).toBeUndefined();
    expect(movement.transferId).toBeUndefined();
    expect(movement.accountId).toBe('a1');
  });

  it('conserva recurringId y transferId cuando vienen seteados', () => {
    const movement = movementFromDb({ ...row, recurring_id: 'r1', transfer_id: 't1' });
    expect(movement.recurringId).toBe('r1');
    expect(movement.transferId).toBe('t1');
  });

  it('mapea undefined a null al escribir (la app nunca manda undefined explícito a Postgres)', () => {
    const payload = movementToDb(
      {
        date: '2026-08-05',
        description: 'Supermercado',
        category: 'Comida',
        type: 'gasto',
        accountId: 'a1',
        currency: 'ARS',
        amount: 5000,
      },
      'u1',
    );
    expect(payload.recurring_id).toBeNull();
    expect(payload.transfer_id).toBeNull();
    expect(payload.user_id).toBe('u1');
  });
});

describe('positions', () => {
  it('ida y vuelta preserva cantidades fraccionarias', () => {
    const row = {
      id: 'p1',
      kind: 'cripto' as const,
      ticker: 'BTC',
      name: 'Bitcoin',
      quantity: 0.048,
      currency: 'USD' as const,
      buy_price: 52000,
      current_price: 108500,
    };
    const position = positionFromDb(row);
    expect(position.quantity).toBe(0.048);
    expect(positionToDb(position, 'u1')).toEqual({
      user_id: 'u1',
      kind: 'cripto',
      ticker: 'BTC',
      name: 'Bitcoin',
      quantity: 0.048,
      currency: 'USD',
      buy_price: 52000,
      current_price: 108500,
    });
  });
});

describe('properties', () => {
  it('conserva la moneda propia de cada monto', () => {
    const row = {
      id: 'r1',
      name: 'Depto Palermo',
      monthly_rent: 950000,
      rent_currency: 'ARS' as const,
      monthly_expenses: 190000,
      expenses_currency: 'ARS' as const,
      estimated_value: 128000,
      value_currency: 'USD' as const,
    };
    const property = propertyFromDb(row);
    expect(property.rentCurrency).toBe('ARS');
    expect(property.valueCurrency).toBe('USD');
    expect(propertyToDb(property, 'u1').value_currency).toBe('USD');
  });
});

describe('recurring movements', () => {
  it('mapea day_of_month y active', () => {
    const row = {
      id: 'f1',
      description: 'Alquiler',
      category: 'Vivienda',
      type: 'gasto' as const,
      account_id: 'a1',
      currency: 'ARS' as const,
      amount: 650000,
      day_of_month: 3,
      active: true,
    };
    const recurring = recurringFromDb(row);
    expect(recurring.dayOfMonth).toBe(3);
    expect(recurring.active).toBe(true);
    expect(recurringToDb(recurring, 'u1').day_of_month).toBe(3);
  });
});

describe('budgets', () => {
  it('no tiene id propio, sólo categoría y monto', () => {
    expect(budgetFromDb({ category: 'Comida', amount: 200000 })).toEqual({
      category: 'Comida',
      amount: 200000,
    });
  });
});

describe('savingsGoalFromDb', () => {
  it('mapea la fila cuando existe', () => {
    expect(savingsGoalFromDb({ currency: 'ARS', amount: 900000 })).toEqual({
      currency: 'ARS',
      amount: 900000,
    });
  });

  // Un usuario nuevo no tiene fila de meta todavía (nadie la sembró)
  it('da un default cuando no hay fila (usuario sin meta configurada)', () => {
    expect(savingsGoalFromDb(null)).toEqual({ currency: 'ARS', amount: 0 });
  });
});
