import { Account, Movement, Position, Property, SavingsGoal } from '../types';
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

export interface DataRepository {
  getAccounts(): Promise<Account[]>;
  getMovements(): Promise<Movement[]>;
  addMovement(movement: Omit<Movement, 'id'>): Promise<Movement>;
  getPositions(): Promise<Position[]>;
  addPosition(position: Omit<Position, 'id'>): Promise<Position>;
  getProperties(): Promise<Property[]>;
  addProperty(property: Omit<Property, 'id'>): Promise<Property>;
  getSavingsGoal(): Promise<SavingsGoal>;
}

class InMemoryRepository implements DataRepository {
  private movements: Movement[] = [...mockMovements];
  private positions: Position[] = [...mockPositions];
  private properties: Property[] = [...mockProperties];
  private nextId = mockMovements.length + 1;
  private nextPositionId = mockPositions.length + 1;
  private nextPropertyId = mockProperties.length + 1;

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

  async getPositions(): Promise<Position[]> {
    return [...this.positions];
  }

  async addPosition(position: Omit<Position, 'id'>): Promise<Position> {
    const created: Position = { ...position, id: `p${this.nextPositionId++}` };
    this.positions.push(created);
    return created;
  }

  async getProperties(): Promise<Property[]> {
    return [...this.properties];
  }

  async addProperty(property: Omit<Property, 'id'>): Promise<Property> {
    const created: Property = { ...property, id: `r${this.nextPropertyId++}` };
    this.properties.push(created);
    return created;
  }

  async getSavingsGoal(): Promise<SavingsGoal> {
    return { ...mockSavingsGoal };
  }
}

export const repository: DataRepository = new InMemoryRepository();
