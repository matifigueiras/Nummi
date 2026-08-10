import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { LocalStorageRepository, STORAGE_KEY } from './repository';
import {
  accountToDb,
  categoryToDb,
  movementToDb,
  positionToDb,
  propertyToDb,
  recurringToDb,
} from './supabaseMappers';

// Corre una única vez por usuario, apenas hay sesión: si este dispositivo
// tiene datos de la época pre-Supabase (AsyncStorage), los sube a la cuenta
// recién logueada para no perderlos. Los ids viejos ("caja-ars", "m01") no
// sirven en Postgres, así que se remapean a los uuid que genera cada insert.
//
// Dos guardas para no migrar de más:
// - Si el usuario ya tiene cuentas en Supabase, se asume que este hilo ya
//   corrió (en este u otro dispositivo) y no se toca nada.
// - Si en este dispositivo nunca hubo datos reales (AsyncStorage vacío), no
//   se llama a ningún método de LocalStorageRepository: hacerlo sembraría
//   datos de ejemplo (ver `seed()` en repository.ts) y esos NO son datos del
//   usuario — subirlos ensuciaría la cuenta recién creada con movimientos
//   falsos ("Supermercado", etc.) en cualquier dispositivo nuevo.
export async function migrateLocalDataToSupabase(userId: string): Promise<void> {
  const { count, error: countErr } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (countErr) throw countErr;
  if (count && count > 0) return;

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const local = new LocalStorageRepository();
  const [accounts, categories, recurrings, movements, positions, properties, budgets, appliedMonths, savingsGoal] =
    await Promise.all([
      local.getAccounts(),
      local.getCategories(),
      local.getRecurrings(),
      local.getMovements(),
      local.getPositions(),
      local.getProperties(),
      local.getBudgets(),
      local.getAppliedMonths(),
      local.getSavingsGoal(),
    ]);

  // 1. Cuentas — todo lo demás referencia sus ids nuevos
  const accountIdMap = new Map<string, string>();
  for (const account of accounts) {
    const { id, ...rest } = account;
    const { data, error } = await supabase
      .from('accounts')
      .insert(accountToDb(rest, userId))
      .select('id')
      .single();
    if (error) throw error;
    accountIdMap.set(id, data.id);
  }

  // 2. Categorías — no las referencia nadie por id (los movimientos guardan
  // el nombre), no hace falta mapear nada
  for (const category of categories) {
    const { id, ...rest } = category;
    const { error } = await supabase.from('categories').insert(categoryToDb(rest, userId));
    if (error) throw error;
  }

  // 3. Movimientos fijos — antes que los movimientos porque éstos pueden
  // referenciar su id nuevo
  const recurringIdMap = new Map<string, string>();
  for (const recurring of recurrings) {
    const accountId = accountIdMap.get(recurring.accountId);
    if (!accountId) continue; // cuenta huérfana: no debería pasar, se descarta
    const { id, ...rest } = recurring;
    const { data, error } = await supabase
      .from('recurring_movements')
      .insert(recurringToDb({ ...rest, accountId }, userId))
      .select('id')
      .single();
    if (error) throw error;
    recurringIdMap.set(id, data.id);
  }

  // 4. Movimientos — transferId es sólo una etiqueta compartida (no FK), así
  // que se insertan sin ella y después se agrupan bajo un id nuevo común
  const transferGroups = new Map<string, string[]>();
  for (const movement of movements) {
    const accountId = accountIdMap.get(movement.accountId);
    if (!accountId) continue; // cuenta huérfana: no debería pasar, se descarta
    const recurringId = movement.recurringId ? recurringIdMap.get(movement.recurringId) : undefined;
    const { id, transferId, ...rest } = movement;
    const { data, error } = await supabase
      .from('movements')
      .insert(movementToDb({ ...rest, accountId, recurringId }, userId))
      .select('id')
      .single();
    if (error) throw error;
    if (transferId) {
      const group = transferGroups.get(transferId) ?? [];
      group.push(data.id);
      transferGroups.set(transferId, group);
    }
  }
  for (const ids of transferGroups.values()) {
    if (ids.length < 2) continue; // pata huérfana sin su par: se deja suelta
    const { error } = await supabase.from('movements').update({ transfer_id: ids[0] }).in('id', ids);
    if (error) throw error;
  }

  // 5. Posiciones
  for (const position of positions) {
    const { id, ...rest } = position;
    const { error } = await supabase.from('positions').insert(positionToDb(rest, userId));
    if (error) throw error;
  }

  // 6. Propiedades
  for (const property of properties) {
    const { id, ...rest } = property;
    const { error } = await supabase.from('properties').insert(propertyToDb(rest, userId));
    if (error) throw error;
  }

  // 7. Presupuestos
  if (budgets.length > 0) {
    const { error } = await supabase
      .from('budgets')
      .insert(budgets.map((b) => ({ user_id: userId, category: b.category, amount: b.amount })));
    if (error) throw error;
  }

  // 8. Meta de ahorro — una sola fila por usuario
  const { error: goalErr } = await supabase
    .from('savings_goal')
    .insert({ user_id: userId, currency: savingsGoal.currency, amount: savingsGoal.amount });
  if (goalErr) throw goalErr;

  // 9. Meses ya aplicados de cada fijo, con el id nuevo del fijo
  const appliedRows: { user_id: string; recurring_id: string; month_key: string }[] = [];
  for (const [oldRecurringId, months] of Object.entries(appliedMonths)) {
    const newRecurringId = recurringIdMap.get(oldRecurringId);
    if (!newRecurringId) continue;
    for (const monthKey of months) {
      appliedRows.push({ user_id: userId, recurring_id: newRecurringId, month_key: monthKey });
    }
  }
  if (appliedRows.length > 0) {
    const { error } = await supabase.from('recurring_applied_months').insert(appliedRows);
    if (error) throw error;
  }
}
