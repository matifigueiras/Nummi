import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  mockAccounts,
  mockCategories,
  mockMovements,
  mockPositions,
  mockProperties,
  mockSavingsGoal,
} from './mock';

// Capa de acceso a datos. La app entera habla con esta interfaz — cuando haya
// una API/base de datos real alcanza con escribir otra implementación de
// DataRepository y cambiar el export de abajo.
//
// La implementación actual persiste en el dispositivo (AsyncStorage; en web,
// localStorage). Es el puente hasta la API real: los datos sobreviven al
// recargar, pero viven solo en este dispositivo.

export interface NewTransfer {
  date: string;
  /** Cuenta de origen */
  fromAccountId: string;
  /** Cuenta de destino (puede ser de otra moneda) */
  toAccountId: string;
  amountFrom: number;
  amountTo: number;
  description?: string;
}

export interface DataRepository {
  getAccounts(): Promise<Account[]>;
  addAccount(account: Omit<Account, 'id'>): Promise<Account>;
  updateAccount(account: Account): Promise<Account>;
  /** Elimina la cuenta y todos sus movimientos */
  deleteAccount(id: string): Promise<void>;
  getMovements(): Promise<Movement[]>;
  addMovement(movement: Omit<Movement, 'id'>): Promise<Movement>;
  updateMovement(movement: Movement): Promise<Movement>;
  /** Si el movimiento es pata de una transferencia, elimina las dos patas */
  deleteMovement(id: string): Promise<void>;
  addTransfer(transfer: NewTransfer): Promise<Movement[]>;
  getPositions(): Promise<Position[]>;
  addPosition(position: Omit<Position, 'id'>): Promise<Position>;
  updatePosition(position: Position): Promise<Position>;
  deletePosition(id: string): Promise<void>;
  getProperties(): Promise<Property[]>;
  addProperty(property: Omit<Property, 'id'>): Promise<Property>;
  updateProperty(property: Property): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  getCategories(): Promise<Category[]>;
  addCategory(category: Omit<Category, 'id'>): Promise<Category>;
  /** Renombrar arrastra los movimientos y presupuestos que la usaban */
  updateCategory(category: Category, previousName: string): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getBudgets(): Promise<Budget[]>;
  setBudget(category: string, amount: number): Promise<void>;
  getRecurrings(): Promise<RecurringMovement[]>;
  addRecurring(recurring: Omit<RecurringMovement, 'id'>): Promise<RecurringMovement>;
  updateRecurring(recurring: RecurringMovement): Promise<RecurringMovement>;
  deleteRecurring(id: string): Promise<void>;
  /** Meses ya procesados por cada fijo, para no regenerar lo que se borró */
  getAppliedMonths(): Promise<Record<string, string[]>>;
  markRecurringApplied(recurringId: string, monthKey: string): Promise<void>;
  getSavingsGoal(): Promise<SavingsGoal>;
  setSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal>;
  /** Borra todo y vuelve a los datos de ejemplo */
  resetData(): Promise<void>;
}

interface StoredData {
  version: 4;
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  recurrings: RecurringMovement[];
  /** recurringId -> meses "yyyy-mm" ya generados */
  appliedMonths: Record<string, string[]>;
  movements: Movement[];
  positions: Position[];
  properties: Property[];
  savingsGoal: SavingsGoal;
}

const STORAGE_KEY = 'nummi:data:v1';

function seed(): StoredData {
  return {
    version: 4,
    accounts: [...mockAccounts],
    categories: [...mockCategories],
    budgets: [],
    recurrings: [],
    appliedMonths: {},
    movements: [...mockMovements],
    positions: [...mockPositions],
    properties: [...mockProperties],
    savingsGoal: { ...mockSavingsGoal },
  };
}

/**
 * v1 no tenía cuentas propias: había exactamente una caja por moneda y los
 * movimientos se ligaban a ella sólo por su `currency`. Se guardan las dos
 * cajas y cada movimiento queda apuntando a la de su moneda.
 */
function migrateV1toV2(data: any): StoredData {
  const accounts: Account[] = [...mockAccounts];
  const byCurrency: Record<string, string> = { ARS: 'caja-ars', USD: 'caja-usd' };
  const movements: Movement[] = (data.movements ?? []).map((m: Movement) => ({
    ...m,
    accountId: m.accountId ?? byCurrency[m.currency] ?? 'caja-ars',
  }));
  return {
    version: 4,
    accounts,
    categories: [...mockCategories],
    budgets: [],
    recurrings: [],
    appliedMonths: {},
    movements,
    positions: data.positions ?? [...mockPositions],
    properties: data.properties ?? [...mockProperties],
    savingsGoal: data.savingsGoal ?? { ...mockSavingsGoal },
  };
}

/** Id único sin contador persistido: timestamp + sufijo aleatorio */
function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

class LocalStorageRepository implements DataRepository {
  private state: StoredData | null = null;

  private async load(): Promise<StoredData> {
    if (this.state) return this.state;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.version === 4) {
          this.state = parsed as StoredData;
          return this.state;
        }
        // v3 no tenía categorías configurables ni presupuestos
        if (parsed?.version === 3) {
          const migrated: StoredData = {
            ...(parsed as StoredData),
            version: 4,
            categories: [...mockCategories],
            budgets: [],
          };
          this.state = migrated;
          await this.persist();
          return migrated;
        }
        // v2 no tenía movimientos fijos: se agregan vacíos
        if (parsed?.version === 2) {
          const migrated: StoredData = {
            ...(parsed as StoredData),
            version: 4,
            categories: [...mockCategories],
            budgets: [],
            recurrings: [],
            appliedMonths: {},
          };
          this.state = migrated;
          await this.persist();
          return migrated;
        }
        if (parsed?.version === 1) {
          this.state = migrateV1toV2(parsed);
          await this.persist();
          return this.state;
        }
      }
    } catch {
      // Datos corruptos o ilegibles: se vuelve al seed
    }
    this.state = seed();
    await this.persist();
    return this.state;
  }

  private async persist(): Promise<void> {
    if (this.state) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  async getAccounts(): Promise<Account[]> {
    return [...(await this.load()).accounts];
  }

  async addAccount(account: Omit<Account, 'id'>): Promise<Account> {
    const state = await this.load();
    const created: Account = { ...account, id: newId('a') };
    state.accounts.push(created);
    await this.persist();
    return created;
  }

  async updateAccount(account: Account): Promise<Account> {
    const state = await this.load();
    state.accounts = state.accounts.map((a) => (a.id === account.id ? account : a));
    await this.persist();
    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    const state = await this.load();
    // Un movimiento sin cuenta no tendría sentido: se van con ella. Si alguno
    // era pata de una transferencia, se elimina también la otra pata.
    const orphanTransfers = new Set(
      state.movements.filter((m) => m.accountId === id && m.transferId).map((m) => m.transferId),
    );
    state.accounts = state.accounts.filter((a) => a.id !== id);
    state.movements = state.movements.filter(
      (m) => m.accountId !== id && !(m.transferId && orphanTransfers.has(m.transferId)),
    );
    await this.persist();
  }

  async getMovements(): Promise<Movement[]> {
    return [...(await this.load()).movements];
  }

  async addMovement(movement: Omit<Movement, 'id'>): Promise<Movement> {
    const state = await this.load();
    const created: Movement = { ...movement, id: newId('m') };
    state.movements.push(created);
    await this.persist();
    return created;
  }

  async updateMovement(movement: Movement): Promise<Movement> {
    const state = await this.load();
    state.movements = state.movements.map((m) => (m.id === movement.id ? movement : m));
    await this.persist();
    return movement;
  }

  async deleteMovement(id: string): Promise<void> {
    const state = await this.load();
    const target = state.movements.find((m) => m.id === id);
    if (!target) return;
    state.movements = target.transferId
      ? state.movements.filter((m) => m.transferId !== target.transferId)
      : state.movements.filter((m) => m.id !== id);
    await this.persist();
  }

  async addTransfer(transfer: NewTransfer): Promise<Movement[]> {
    const state = await this.load();
    const from = state.accounts.find((a) => a.id === transfer.fromAccountId);
    const to = state.accounts.find((a) => a.id === transfer.toAccountId);
    if (!from || !to) throw new Error('Cuenta de transferencia inexistente');

    const transferId = newId('t');
    const description = transfer.description?.trim() || `${from.name} → ${to.name}`;
    const base = { date: transfer.date, description, category: 'Transferencia', transferId };
    const out = await this.addMovement({
      ...base,
      type: 'gasto',
      accountId: from.id,
      currency: from.currency,
      amount: transfer.amountFrom,
    });
    const inn = await this.addMovement({
      ...base,
      type: 'ingreso',
      accountId: to.id,
      currency: to.currency,
      amount: transfer.amountTo,
    });
    return [out, inn];
  }

  async getPositions(): Promise<Position[]> {
    return [...(await this.load()).positions];
  }

  async addPosition(position: Omit<Position, 'id'>): Promise<Position> {
    const state = await this.load();
    const created: Position = { ...position, id: newId('p') };
    state.positions.push(created);
    await this.persist();
    return created;
  }

  async updatePosition(position: Position): Promise<Position> {
    const state = await this.load();
    state.positions = state.positions.map((p) => (p.id === position.id ? position : p));
    await this.persist();
    return position;
  }

  async deletePosition(id: string): Promise<void> {
    const state = await this.load();
    state.positions = state.positions.filter((p) => p.id !== id);
    await this.persist();
  }

  async getProperties(): Promise<Property[]> {
    return [...(await this.load()).properties];
  }

  async addProperty(property: Omit<Property, 'id'>): Promise<Property> {
    const state = await this.load();
    const created: Property = { ...property, id: newId('r') };
    state.properties.push(created);
    await this.persist();
    return created;
  }

  async updateProperty(property: Property): Promise<Property> {
    const state = await this.load();
    state.properties = state.properties.map((p) => (p.id === property.id ? property : p));
    await this.persist();
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    const state = await this.load();
    state.properties = state.properties.filter((p) => p.id !== id);
    await this.persist();
  }

  async getCategories(): Promise<Category[]> {
    return [...(await this.load()).categories];
  }

  async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const state = await this.load();
    const created: Category = { ...category, id: newId('c') };
    state.categories.push(created);
    await this.persist();
    return created;
  }

  async updateCategory(category: Category, previousName: string): Promise<Category> {
    const state = await this.load();
    state.categories = state.categories.map((c) => (c.id === category.id ? category : c));
    if (previousName !== category.name) {
      // Los movimientos guardan el nombre: hay que arrastrarlos al renombrar
      state.movements = state.movements.map((m) =>
        m.category === previousName && m.type === category.type
          ? { ...m, category: category.name }
          : m,
      );
      state.recurrings = state.recurrings.map((r) =>
        r.category === previousName && r.type === category.type
          ? { ...r, category: category.name }
          : r,
      );
      state.budgets = state.budgets.map((b) =>
        b.category === previousName ? { ...b, category: category.name } : b,
      );
    }
    await this.persist();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const state = await this.load();
    const target = state.categories.find((c) => c.id === id);
    state.categories = state.categories.filter((c) => c.id !== id);
    // Los movimientos históricos conservan el nombre: la categoría deja de
    // ofrecerse, pero lo que ya se gastó no se reescribe ni se pierde.
    if (target) state.budgets = state.budgets.filter((b) => b.category !== target.name);
    await this.persist();
  }

  async getBudgets(): Promise<Budget[]> {
    return [...(await this.load()).budgets];
  }

  async setBudget(category: string, amount: number): Promise<void> {
    const state = await this.load();
    const rest = state.budgets.filter((b) => b.category !== category);
    // Monto 0 o negativo = sin presupuesto
    state.budgets = amount > 0 ? [...rest, { category, amount }] : rest;
    await this.persist();
  }

  async getRecurrings(): Promise<RecurringMovement[]> {
    return [...(await this.load()).recurrings];
  }

  async addRecurring(recurring: Omit<RecurringMovement, 'id'>): Promise<RecurringMovement> {
    const state = await this.load();
    const created: RecurringMovement = { ...recurring, id: newId('f') };
    state.recurrings.push(created);
    await this.persist();
    return created;
  }

  async updateRecurring(recurring: RecurringMovement): Promise<RecurringMovement> {
    const state = await this.load();
    state.recurrings = state.recurrings.map((r) => (r.id === recurring.id ? recurring : r));
    await this.persist();
    return recurring;
  }

  async deleteRecurring(id: string): Promise<void> {
    const state = await this.load();
    state.recurrings = state.recurrings.filter((r) => r.id !== id);
    delete state.appliedMonths[id];
    // Los movimientos ya generados quedan: son plata que efectivamente se movió
    await this.persist();
  }

  async getAppliedMonths(): Promise<Record<string, string[]>> {
    return { ...(await this.load()).appliedMonths };
  }

  async markRecurringApplied(recurringId: string, monthKey: string): Promise<void> {
    const state = await this.load();
    const months = state.appliedMonths[recurringId] ?? [];
    if (!months.includes(monthKey)) {
      state.appliedMonths[recurringId] = [...months, monthKey];
      await this.persist();
    }
  }

  async getSavingsGoal(): Promise<SavingsGoal> {
    return { ...(await this.load()).savingsGoal };
  }

  async setSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal> {
    const state = await this.load();
    state.savingsGoal = { ...goal };
    await this.persist();
    return { ...goal };
  }

  async resetData(): Promise<void> {
    this.state = seed();
    await this.persist();
  }
}

export const repository: DataRepository = new LocalStorageRepository();
