import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { repository } from '../data/repository';
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
  addPosition: (position: Omit<Position, 'id'>) => Promise<void>;
  addProperty: (property: Omit<Property, 'id'>) => Promise<void>;
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

  useEffect(() => {
    (async () => {
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
      setLoading(false);
    })();
  }, []);

  const addMovement = useCallback(async (movement: Omit<Movement, 'id'>) => {
    const created = await repository.addMovement(movement);
    setMovements((prev) => [...prev, created]);
  }, []);

  const addPosition = useCallback(async (position: Omit<Position, 'id'>) => {
    const created = await repository.addPosition(position);
    setPositions((prev) => [...prev, created]);
  }, []);

  const addProperty = useCallback(async (property: Omit<Property, 'id'>) => {
    const created = await repository.addProperty(property);
    setProperties((prev) => [...prev, created]);
  }, []);

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
      addPosition,
      addProperty,
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
      addPosition,
      addProperty,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
