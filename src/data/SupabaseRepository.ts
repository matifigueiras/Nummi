import { supabase } from '../services/supabase';
import {
  Account,
  Budget,
  Category,
  Movement,
  Position,
  Property,
  RecurringMovement,
  SavingsGoal,
} from '../types';
import { DataRepository, NewTransfer } from './repository';
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
} from './supabaseMappers';

// Implementación de DataRepository sobre Supabase (ver supabase/schema.sql).
// El filtrado por usuario lo hace Row Level Security, no filtros manuales acá
// adentro: los selects/updates/deletes ya vienen scopeados por auth.uid().

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('No hay sesión activa');
  return userId;
}

export class SupabaseRepository implements DataRepository {
  async getAccounts(): Promise<Account[]> {
    const { data, error } = await supabase.from('accounts').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map(accountFromDb);
  }

  async addAccount(account: Omit<Account, 'id'>): Promise<Account> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('accounts')
      .insert(accountToDb(account, userId))
      .select()
      .single();
    if (error) throw error;
    return accountFromDb(data);
  }

  async updateAccount(account: Account): Promise<Account> {
    const userId = await requireUserId();
    const { id, ...rest } = account;
    const { error } = await supabase.from('accounts').update(accountToDb(rest, userId)).eq('id', id);
    if (error) throw error;
    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    // Si alguna pata de una transferencia vivía en esta cuenta, la otra pata
    // quedó en otra cuenta: el ON DELETE CASCADE de account_id no la
    // alcanza, así que se borra a mano antes de borrar la cuenta.
    const { data: movs, error: selErr } = await supabase
      .from('movements')
      .select('transfer_id')
      .eq('account_id', id)
      .not('transfer_id', 'is', null);
    if (selErr) throw selErr;
    const transferIds = Array.from(new Set((movs ?? []).map((m) => m.transfer_id)));
    if (transferIds.length > 0) {
      const { error: delErr } = await supabase.from('movements').delete().in('transfer_id', transferIds);
      if (delErr) throw delErr;
    }
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
  }

  async getMovements(): Promise<Movement[]> {
    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(movementFromDb);
  }

  async addMovement(movement: Omit<Movement, 'id'>): Promise<Movement> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('movements')
      .insert(movementToDb(movement, userId))
      .select()
      .single();
    if (error) throw error;
    return movementFromDb(data);
  }

  async updateMovement(movement: Movement): Promise<Movement> {
    const userId = await requireUserId();
    const { id, ...rest } = movement;
    const { error } = await supabase.from('movements').update(movementToDb(rest, userId)).eq('id', id);
    if (error) throw error;
    return movement;
  }

  async deleteMovement(id: string): Promise<void> {
    const { data, error } = await supabase
      .from('movements')
      .select('transfer_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    const { error: delErr } = data.transfer_id
      ? await supabase.from('movements').delete().eq('transfer_id', data.transfer_id)
      : await supabase.from('movements').delete().eq('id', id);
    if (delErr) throw delErr;
  }

  async addTransfer(transfer: NewTransfer): Promise<Movement[]> {
    const userId = await requireUserId();
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .in('id', [transfer.fromAccountId, transfer.toAccountId]);
    if (accErr) throw accErr;
    const from = accounts?.find((a) => a.id === transfer.fromAccountId);
    const to = accounts?.find((a) => a.id === transfer.toAccountId);
    if (!from || !to) throw new Error('Cuenta de transferencia inexistente');

    const description = transfer.description?.trim() || `${from.name} → ${to.name}`;
    const base = { date: transfer.date, description, category: 'Transferencia' };

    // Se inserta la pata "out" primero para conseguir el id que Postgres le
    // genera, y ese mismo id se usa como transfer_id compartido de las dos
    // patas (evita sumar una dependencia sólo para generar uuids en el
    // cliente).
    const { data: outRow, error: outErr } = await supabase
      .from('movements')
      .insert(
        movementToDb(
          { ...base, type: 'gasto', accountId: from.id, currency: from.currency, amount: transfer.amountFrom },
          userId,
        ),
      )
      .select()
      .single();
    if (outErr) throw outErr;

    const { error: tagErr } = await supabase
      .from('movements')
      .update({ transfer_id: outRow.id })
      .eq('id', outRow.id);
    if (tagErr) throw tagErr;

    const { data: inRow, error: inErr } = await supabase
      .from('movements')
      .insert(
        movementToDb(
          {
            ...base,
            type: 'ingreso',
            accountId: to.id,
            currency: to.currency,
            amount: transfer.amountTo,
            transferId: outRow.id,
          },
          userId,
        ),
      )
      .select()
      .single();
    if (inErr) throw inErr;

    return [movementFromDb({ ...outRow, transfer_id: outRow.id }), movementFromDb(inRow)];
  }

  async getPositions(): Promise<Position[]> {
    const { data, error } = await supabase.from('positions').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map(positionFromDb);
  }

  async addPosition(position: Omit<Position, 'id'>): Promise<Position> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('positions')
      .insert(positionToDb(position, userId))
      .select()
      .single();
    if (error) throw error;
    return positionFromDb(data);
  }

  async updatePosition(position: Position): Promise<Position> {
    const userId = await requireUserId();
    const { id, ...rest } = position;
    const { error } = await supabase.from('positions').update(positionToDb(rest, userId)).eq('id', id);
    if (error) throw error;
    return position;
  }

  async deletePosition(id: string): Promise<void> {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) throw error;
  }

  async getProperties(): Promise<Property[]> {
    const { data, error } = await supabase.from('properties').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map(propertyFromDb);
  }

  async addProperty(property: Omit<Property, 'id'>): Promise<Property> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('properties')
      .insert(propertyToDb(property, userId))
      .select()
      .single();
    if (error) throw error;
    return propertyFromDb(data);
  }

  async updateProperty(property: Property): Promise<Property> {
    const userId = await requireUserId();
    const { id, ...rest } = property;
    const { error } = await supabase.from('properties').update(propertyToDb(rest, userId)).eq('id', id);
    if (error) throw error;
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
  }

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map(categoryFromDb);
  }

  async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('categories')
      .insert(categoryToDb(category, userId))
      .select()
      .single();
    if (error) throw error;
    return categoryFromDb(data);
  }

  async updateCategory(category: Category, previousName: string): Promise<Category> {
    const userId = await requireUserId();
    const { id, ...rest } = category;
    const { error } = await supabase.from('categories').update(categoryToDb(rest, userId)).eq('id', id);
    if (error) throw error;

    if (previousName !== category.name) {
      // Los movimientos guardan el nombre: hay que arrastrarlos al renombrar
      const { error: mErr } = await supabase
        .from('movements')
        .update({ category: category.name })
        .eq('category', previousName)
        .eq('type', category.type);
      if (mErr) throw mErr;
      const { error: rErr } = await supabase
        .from('recurring_movements')
        .update({ category: category.name })
        .eq('category', previousName)
        .eq('type', category.type);
      if (rErr) throw rErr;
      const { error: bErr } = await supabase
        .from('budgets')
        .update({ category: category.name })
        .eq('category', previousName);
      if (bErr) throw bErr;
    }
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const { data: cat, error: selErr } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .maybeSingle();
    if (selErr) throw selErr;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    // Los movimientos históricos conservan el nombre: la categoría deja de
    // ofrecerse, pero lo que ya se gastó no se reescribe ni se pierde.
    if (cat) {
      const { error: bErr } = await supabase.from('budgets').delete().eq('category', cat.name);
      if (bErr) throw bErr;
    }
  }

  async getBudgets(): Promise<Budget[]> {
    const { data, error } = await supabase.from('budgets').select('*');
    if (error) throw error;
    return (data ?? []).map(budgetFromDb);
  }

  async setBudget(category: string, amount: number): Promise<void> {
    // Monto 0 o negativo = sin presupuesto
    if (amount > 0) {
      const userId = await requireUserId();
      const { error } = await supabase
        .from('budgets')
        .upsert({ user_id: userId, category, amount }, { onConflict: 'user_id,category' });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('budgets').delete().eq('category', category);
      if (error) throw error;
    }
  }

  async getRecurrings(): Promise<RecurringMovement[]> {
    const { data, error } = await supabase.from('recurring_movements').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map(recurringFromDb);
  }

  async addRecurring(recurring: Omit<RecurringMovement, 'id'>): Promise<RecurringMovement> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('recurring_movements')
      .insert(recurringToDb(recurring, userId))
      .select()
      .single();
    if (error) throw error;
    return recurringFromDb(data);
  }

  async updateRecurring(recurring: RecurringMovement): Promise<RecurringMovement> {
    const userId = await requireUserId();
    const { id, ...rest } = recurring;
    const { error } = await supabase
      .from('recurring_movements')
      .update(recurringToDb(rest, userId))
      .eq('id', id);
    if (error) throw error;
    return recurring;
  }

  async deleteRecurring(id: string): Promise<void> {
    // recurring_applied_months tiene ON DELETE CASCADE sobre recurring_id:
    // se limpia solo. Los movimientos ya generados quedan (es plata que
    // efectivamente se movió).
    const { error } = await supabase.from('recurring_movements').delete().eq('id', id);
    if (error) throw error;
  }

  async getAppliedMonths(): Promise<Record<string, string[]>> {
    const { data, error } = await supabase.from('recurring_applied_months').select('recurring_id, month_key');
    if (error) throw error;
    const result: Record<string, string[]> = {};
    for (const row of data ?? []) {
      if (!result[row.recurring_id]) result[row.recurring_id] = [];
      result[row.recurring_id].push(row.month_key);
    }
    return result;
  }

  async markRecurringApplied(recurringId: string, monthKey: string): Promise<void> {
    const userId = await requireUserId();
    const { error } = await supabase
      .from('recurring_applied_months')
      .upsert(
        { user_id: userId, recurring_id: recurringId, month_key: monthKey },
        { onConflict: 'recurring_id,month_key' },
      );
    if (error) throw error;
  }

  async getSavingsGoal(): Promise<SavingsGoal> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('savings_goal')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return savingsGoalFromDb(data);
  }

  async setSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal> {
    const userId = await requireUserId();
    const { error } = await supabase
      .from('savings_goal')
      .upsert({ user_id: userId, currency: goal.currency, amount: goal.amount }, { onConflict: 'user_id' });
    if (error) throw error;
    return goal;
  }

  async resetData(): Promise<void> {
    // No hay un "seed" de ejemplo compartido en un backend multiusuario, así
    // que acá "resetear" borra lo transaccional pero conserva cuentas y
    // categorías: borrarlas también dejaría al usuario sin nada para elegir
    // al cargar el próximo movimiento (la versión local evitaba esto
    // resembrando cuentas/categorías demo, que no aplica acá).
    const userId = await requireUserId();
    const tables = [
      'movements',
      'recurring_applied_months',
      'recurring_movements',
      'budgets',
      'positions',
      'properties',
      'savings_goal',
    ] as const;
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) throw error;
    }
  }
}
