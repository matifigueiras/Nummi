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
}

class InMemoryRepository implements DataRepository {
  private movements: Movement[] = [...mockMovements];
  private positions: Position[] = [...mockPositions];
  private properties: Property[] = [...mockProperties];
  private savingsGoal: SavingsGoal = { ...mockSavingsGoal };
  private nextId = mockMovements.length + 1;
  private nextPositionId = mockPositions.length + 1;
  private nextPropertyId = mockProperties.length + 1;
  private nextTransferId = 4; // el mock usa t1..t3

  async getAccounts(): Promise<Account[]> {
    return [...mockAccounts];
  }

  async getMovements(): Promise<Movement[]> {
    return [...this.movements];
  }

  async addMovement(movement: Omit<Movement, 'id'>): Promise<Movement> {
    const created: Movement = { ...movement, id: `m${String(this.nextId++).padStart(2, '0')}` };
    this.movements.push(created);
    return created;
  }

  async updateMovement(movement: Movement): Promise<Movement> {
    this.movements = this.movements.map((m) => (m.id === movement.id ? movement : m));
    return movement;
  }

  async deleteMovement(id: string): Promise<void> {
    const target = this.movements.find((m) => m.id === id);
    if (!target) return;
    this.movements = target.transferId
      ? this.movements.filter((m) => m.transferId !== target.transferId)
      : this.movements.filter((m) => m.id !== id);
  }

  async addTransfer(transfer: NewTransfer): Promise<Movement[]> {
    const transferId = `t${this.nextTransferId++}`;
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
    return [...this.positions];
  }

  async addPosition(position: Omit<Position, 'id'>): Promise<Position> {
    const created: Position = { ...position, id: `p${this.nextPositionId++}` };
    this.positions.push(created);
    return created;
  }

  async updatePosition(position: Position): Promise<Position> {
    this.positions = this.positions.map((p) => (p.id === position.id ? position : p));
    return position;
  }

  async deletePosition(id: string): Promise<void> {
    this.positions = this.positions.filter((p) => p.id !== id);
  }

  async getProperties(): Promise<Property[]> {
    return [...this.properties];
  }

  async addProperty(property: Omit<Property, 'id'>): Promise<Property> {
    const created: Property = { ...property, id: `r${this.nextPropertyId++}` };
    this.properties.push(created);
    return created;
  }

  async updateProperty(property: Property): Promise<Property> {
    this.properties = this.properties.map((p) => (p.id === property.id ? property : p));
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    this.properties = this.properties.filter((p) => p.id !== id);
  }

  async getSavingsGoal(): Promise<SavingsGoal> {
    return { ...this.savingsGoal };
  }

  async setSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal> {
    this.savingsGoal = { ...goal };
    return { ...this.savingsGoal };
  }
}

export const repository: DataRepository = new InMemoryRepository();
