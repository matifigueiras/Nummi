import {
  Account,
  Budget,
  Category,
  Currency,
  Movement,
  MovementType,
  Position,
  PositionKind,
  Property,
  RecurringMovement,
  SavingsGoal,
} from '../types';

// Conversión entre las filas de Postgres (snake_case, tal como las define
// supabase/schema.sql) y los tipos de la app (camelCase, src/types.ts).
// Funciones puras a propósito — se testean sin tocar la red.

export interface AccountRow {
  id: string;
  name: string;
  currency: Currency;
  initial_balance: number;
}

export function accountFromDb(row: AccountRow): Account {
  return { id: row.id, name: row.name, currency: row.currency, initialBalance: row.initial_balance };
}

export function accountToDb(account: Omit<Account, 'id'>, userId: string) {
  return {
    user_id: userId,
    name: account.name,
    currency: account.currency,
    initial_balance: account.initialBalance,
  };
}

export interface CategoryRow {
  id: string;
  name: string;
  type: MovementType;
}

export function categoryFromDb(row: CategoryRow): Category {
  return { id: row.id, name: row.name, type: row.type };
}

export function categoryToDb(category: Omit<Category, 'id'>, userId: string) {
  return { user_id: userId, name: category.name, type: category.type };
}

export interface MovementRow {
  id: string;
  date: string;
  description: string;
  category: string;
  type: MovementType;
  account_id: string;
  currency: Currency;
  amount: number;
  recurring_id: string | null;
  transfer_id: string | null;
}

export function movementFromDb(row: MovementRow): Movement {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    category: row.category,
    type: row.type,
    accountId: row.account_id,
    currency: row.currency,
    amount: row.amount,
    recurringId: row.recurring_id ?? undefined,
    transferId: row.transfer_id ?? undefined,
  };
}

export function movementToDb(movement: Omit<Movement, 'id'>, userId: string) {
  return {
    user_id: userId,
    date: movement.date,
    description: movement.description,
    category: movement.category,
    type: movement.type,
    account_id: movement.accountId,
    currency: movement.currency,
    amount: movement.amount,
    recurring_id: movement.recurringId ?? null,
    transfer_id: movement.transferId ?? null,
  };
}

export interface PositionRow {
  id: string;
  kind: PositionKind;
  ticker: string;
  name: string;
  quantity: number;
  currency: Currency;
  buy_price: number;
  current_price: number;
}

export function positionFromDb(row: PositionRow): Position {
  return {
    id: row.id,
    kind: row.kind,
    ticker: row.ticker,
    name: row.name,
    quantity: row.quantity,
    currency: row.currency,
    buyPrice: row.buy_price,
    currentPrice: row.current_price,
  };
}

export function positionToDb(position: Omit<Position, 'id'>, userId: string) {
  return {
    user_id: userId,
    kind: position.kind,
    ticker: position.ticker,
    name: position.name,
    quantity: position.quantity,
    currency: position.currency,
    buy_price: position.buyPrice,
    current_price: position.currentPrice,
  };
}

export interface PropertyRow {
  id: string;
  name: string;
  monthly_rent: number;
  rent_currency: Currency;
  monthly_expenses: number;
  expenses_currency: Currency;
  estimated_value: number;
  value_currency: Currency;
}

export function propertyFromDb(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    monthlyRent: row.monthly_rent,
    rentCurrency: row.rent_currency,
    monthlyExpenses: row.monthly_expenses,
    expensesCurrency: row.expenses_currency,
    estimatedValue: row.estimated_value,
    valueCurrency: row.value_currency,
  };
}

export function propertyToDb(property: Omit<Property, 'id'>, userId: string) {
  return {
    user_id: userId,
    name: property.name,
    monthly_rent: property.monthlyRent,
    rent_currency: property.rentCurrency,
    monthly_expenses: property.monthlyExpenses,
    expenses_currency: property.expensesCurrency,
    estimated_value: property.estimatedValue,
    value_currency: property.valueCurrency,
  };
}

export interface RecurringRow {
  id: string;
  description: string;
  category: string;
  type: MovementType;
  account_id: string;
  currency: Currency;
  amount: number;
  day_of_month: number;
  active: boolean;
}

export function recurringFromDb(row: RecurringRow): RecurringMovement {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    type: row.type,
    accountId: row.account_id,
    currency: row.currency,
    amount: row.amount,
    dayOfMonth: row.day_of_month,
    active: row.active,
  };
}

export function recurringToDb(recurring: Omit<RecurringMovement, 'id'>, userId: string) {
  return {
    user_id: userId,
    description: recurring.description,
    category: recurring.category,
    type: recurring.type,
    account_id: recurring.accountId,
    currency: recurring.currency,
    amount: recurring.amount,
    day_of_month: recurring.dayOfMonth,
    active: recurring.active,
  };
}

export interface BudgetRow {
  category: string;
  amount: number;
}

export function budgetFromDb(row: BudgetRow): Budget {
  return { category: row.category, amount: row.amount };
}

export interface SavingsGoalRow {
  currency: Currency;
  amount: number;
}

export function savingsGoalFromDb(row: SavingsGoalRow | null): SavingsGoal {
  return row ? { currency: row.currency, amount: row.amount } : { currency: 'ARS', amount: 0 };
}
