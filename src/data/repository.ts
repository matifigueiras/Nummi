import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Currency, Movement, Position, Property, SavingsGoal } from '../types';
import {
  mockAccounts,
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
  /** Caja de origen; el destino es la otra */
  from: Currency;
  amountFrom: number;
  amountTo: number;
  description?: string;
}

export interface DataRepository {
  getAccounts(): Promise<Account[]>;
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
  getSavingsGoal(): Promise<SavingsGoal>;
  setSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal>;
  /** Borra todo y vuelve a los datos de ejemplo */
  resetData(): Promise<void>;
}

interface StoredData {
  version: 1;
  movements: Movement[];
  positions: Position[];
  properties: Property[];
  savingsGoal: SavingsGoal;
}

const STORAGE_KEY = 'nummi:data:v1';

function seed(): StoredData {
  return {
    version: 1,
    movements: [...mockMovements],
    positions: [...mockPositions],
    properties: [...mockProperties],
    savingsGoal: { ...mockSavingsGoal },
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
        if (parsed?.version === 1) {
          this.state = parsed as StoredData;
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
    return [...mockAccounts];
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
    const transferId = newId('t');
    const to: Currency = transfer.from === 'ARS' ? 'USD' : 'ARS';
    const description =
      transfer.description?.trim() || (transfer.from === 'ARS' ? 'Compra USD' : 'Venta USD');
    const base = { date: transfer.date, description, category: 'Transferencia', transferId };
    const out = await this.addMovement({
      ...base,
      type: 'gasto',
      currency: transfer.from,
      amount: transfer.amountFrom,
    });
    const inn = await this.addMovement({
      ...base,
      type: 'ingreso',
      currency: to,
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
