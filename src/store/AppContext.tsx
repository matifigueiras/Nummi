import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NewTransfer, repository } from '../data/repository';
import { DolarBlue, useDolarBlue } from '../services/dolar';
import { Account, Movement, Position, Property, SavingsGoal } from '../types';

interface AppState {
  loading: boolean;
  accounts: Account[];
  movements: Movement[];
  positions: Position[];
  properties: Property[];
  savingsGoal: SavingsGoal;
  dolar: DolarBlue;
  addMovement: (movement: Omit<Movement, 'id'>) => Promise<void>;
  updateMovement: (movement: Movement) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  addTransfer: (transfer: NewTransfer) => Promise<void>;
  addPosition: (position: Omit<Position, 'id'>) => Promise<void>;
  updatePosition: (position: Position) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  addProperty: (property: Omit<Property, 'id'>) => Promise<void>;
  updateProperty: (property: Property) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  updateSavingsGoal: (goal: SavingsGoal) => Promise<void>;
  /** Borra todo lo guardado y vuelve a los datos de ejemplo */
  resetData: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal>({ currency: 'ARS', amount: 0 });
  const dolar = useDolarBlue();

  const loadAll = useCallback(async () => {
    const [acc, movs, pos, props, goal] = await Promise.all([
      repository.getAccounts(),
      repository.getMovements(),
      repository.getPositions(),
      repository.getProperties(),
      repository.getSavingsGoal(),
    ]);
    setAccounts(acc);
    setMovements(movs);
    setPositions(pos);
    setProperties(props);
    setSavingsGoal(goal);
  }, []);

  useEffect(() => {
    loadAll().then(() => setLoading(false));
  }, [loadAll]);

  // Después de cada mutación se relee todo del repositorio: una sola fuente de
  // verdad y cero riesgo de que el estado local se desincronice.
  const refreshMovements = useCallback(async () => {
    setMovements(await repository.getMovements());
  }, []);

  const addMovement = useCallback(
    async (movement: Omit<Movement, 'id'>) => {
      await repository.addMovement(movement);
      await refreshMovements();
    },
    [refreshMovements],
  );

  const updateMovement = useCallback(
    async (movement: Movement) => {
      await repository.updateMovement(movement);
      await refreshMovements();
    },
    [refreshMovements],
  );

  const deleteMovement = useCallback(
    async (id: string) => {
      await repository.deleteMovement(id);
      await refreshMovements();
    },
    [refreshMovements],
  );

  const addTransfer = useCallback(
    async (transfer: NewTransfer) => {
      await repository.addTransfer(transfer);
      await refreshMovements();
    },
    [refreshMovements],
  );

  const addPosition = useCallback(async (position: Omit<Position, 'id'>) => {
    await repository.addPosition(position);
    setPositions(await repository.getPositions());
  }, []);

  const updatePosition = useCallback(async (position: Position) => {
    await repository.updatePosition(position);
    setPositions(await repository.getPositions());
  }, []);

  const deletePosition = useCallback(async (id: string) => {
    await repository.deletePosition(id);
    setPositions(await repository.getPositions());
  }, []);

  const addProperty = useCallback(async (property: Omit<Property, 'id'>) => {
    await repository.addProperty(property);
    setProperties(await repository.getProperties());
  }, []);

  const updateProperty = useCallback(async (property: Property) => {
    await repository.updateProperty(property);
    setProperties(await repository.getProperties());
  }, []);

  const deleteProperty = useCallback(async (id: string) => {
    await repository.deleteProperty(id);
    setProperties(await repository.getProperties());
  }, []);

  const updateSavingsGoal = useCallback(async (goal: SavingsGoal) => {
    setSavingsGoal(await repository.setSavingsGoal(goal));
  }, []);

  const resetData = useCallback(async () => {
    await repository.resetData();
    await loadAll();
  }, [loadAll]);

  const value = useMemo(
    () => ({
      loading,
      accounts,
      movements,
      positions,
      properties,
      savingsGoal,
      dolar,
      addMovement,
      updateMovement,
      deleteMovement,
      addTransfer,
      addPosition,
      updatePosition,
      deletePosition,
      addProperty,
      updateProperty,
      deleteProperty,
      updateSavingsGoal,
      resetData,
    }),
    [
      loading,
      accounts,
      movements,
      positions,
      properties,
      savingsGoal,
      dolar,
      addMovement,
      updateMovement,
      deleteMovement,
      addTransfer,
      addPosition,
      updatePosition,
      deletePosition,
      addProperty,
      updateProperty,
      deleteProperty,
      updateSavingsGoal,
      resetData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
