import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState } from 'react-native';
import { NewTransfer, repository } from '../data/repository';
import { DolarBlue, useDolarBlue } from '../services/dolar';
import { DolarHistory, useDolarHistory } from '../services/dolarHistory';
import { fetchLivePrices } from '../services/prices';
import {
  Account,
  Budget,
  Category,
  Movement,
  Position,
  Property,
  RecurringMovement,
  SavingsGoal,
  WealthSnapshot,
} from '../types';
import { wealthBreakdown } from '../utils/calc';
import { pendingRecurrings, toMovement } from '../utils/recurring';
import { monthKeyOf } from '../utils/format';

const PRICES_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface LivePricesState {
  /** Momento de la última actualización exitosa */
  updatedAt: Date | null;
  /** Ids de posiciones cuyo precio viene de una fuente en vivo */
  liveIds: string[];
}

interface AppState {
  loading: boolean;
  accounts: Account[];
  movements: Movement[];
  positions: Position[];
  properties: Property[];
  savingsGoal: SavingsGoal;
  recurrings: RecurringMovement[];
  categories: Category[];
  budgets: Budget[];
  dolar: DolarBlue;
  dolarHistory: DolarHistory;
  livePrices: LivePricesState;
  /** Fotos mensuales de patrimonio, para graficar la evolución en el tiempo */
  wealthSnapshots: WealthSnapshot[];
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
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
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category, previousName: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setBudget: (category: string, amount: number) => Promise<void>;
  addRecurring: (recurring: Omit<RecurringMovement, 'id'>) => Promise<void>;
  updateRecurring: (recurring: RecurringMovement) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  updateSavingsGoal: (goal: SavingsGoal) => Promise<void>;
  /** Borra todo lo guardado y vuelve a los datos de ejemplo */
  resetData: () => Promise<void>;
  /** Recarga todo desde el repositorio + cotización + precios en vivo (pull-to-refresh) */
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal>({ currency: 'ARS', amount: 0 });
  const [recurrings, setRecurrings] = useState<RecurringMovement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [livePrices, setLivePrices] = useState<LivePricesState>({ updatedAt: null, liveIds: [] });
  const [wealthSnapshots, setWealthSnapshots] = useState<WealthSnapshot[]>([]);
  const dolar = useDolarBlue();
  const dolarHistory = useDolarHistory();

  // Ref para que el ciclo de precios lea siempre las posiciones actuales sin
  // re-suscribir el intervalo en cada cambio.
  const positionsRef = useRef<Position[]>([]);
  // Mismo motivo: la foto de patrimonio necesita la cotización más nueva sin
  // que captureWealthSnapshot tenga que cambiar de identidad en cada tick.
  const dolarRef = useRef<DolarBlue | undefined>(undefined);

  positionsRef.current = positions;
  dolarRef.current = dolar;

  const loadAll = useCallback(async () => {
    const [acc, movs, pos, props, goal, recs, cats, buds] = await Promise.all([
      repository.getAccounts(),
      repository.getMovements(),
      repository.getPositions(),
      repository.getProperties(),
      repository.getSavingsGoal(),
      repository.getRecurrings(),
      repository.getCategories(),
      repository.getBudgets(),
    ]);
    setCategories(cats);
    setBudgets(buds);
    setAccounts(acc);
    setMovements(movs);
    setRecurrings(recs);
    setPositions(pos);
    // El ref se puebla acá mismo porque refreshPrices puede correr antes del
    // próximo render (ej: apenas termina la carga inicial)
    positionsRef.current = pos;
    setProperties(props);
    setSavingsGoal(goal);
  }, []);

  const refreshPrices = useCallback(async () => {
    const positions = positionsRef.current;
    if (positions.length === 0) return;
    let prices: Map<string, number>;
    try {
      prices = await fetchLivePrices(positions);
    } catch {
      return;
    }
    if (prices.size === 0) return;
    let changed = false;
    for (const position of positions) {
      const price = prices.get(position.id);
      if (price !== undefined && price !== position.currentPrice) {
        await repository.updatePosition({ ...position, currentPrice: price });
        changed = true;
      }
    }
    if (changed) setPositions(await repository.getPositions());
    setLivePrices({ updatedAt: new Date(), liveIds: [...prices.keys()] });
  }, []);

  // Genera los movimientos fijos que ya vencieron este mes y todavía no están
  const applyRecurrings = useCallback(async () => {
    const [recs, movs, applied] = await Promise.all([
      repository.getRecurrings(),
      repository.getMovements(),
      repository.getAppliedMonths(),
    ]);
    const pending = pendingRecurrings(recs, movs, new Date(), applied);
    if (pending.length === 0) return;
    const key = monthKeyOf(new Date());
    for (const item of pending) {
      await repository.addMovement(toMovement(item));
      await repository.markRecurringApplied(item.recurring.id, key);
    }
    setMovements(await repository.getMovements());
  }, []);

  // Guarda (pisa) la foto de patrimonio del mes en curso. Lee todo fresco del
  // repositorio, no del estado de React, por el mismo motivo que
  // applyRecurrings: puede correr apenas termina loadAll, antes de que el
  // próximo render haya "visto" ese estado todavía.
  const captureWealthSnapshot = useCallback(async () => {
    const [accs, movs, pos, props] = await Promise.all([
      repository.getAccounts(),
      repository.getMovements(),
      repository.getPositions(),
      repository.getProperties(),
    ]);
    const ventaRate = dolarRef.current?.rate.venta ?? 1;
    const breakdown = wealthBreakdown(accs, movs, pos, props, ventaRate);
    await repository.saveWealthSnapshot({ monthKey: monthKeyOf(new Date()), ...breakdown });
    setWealthSnapshots(await repository.getWealthSnapshots());
  }, []);

  useEffect(() => {
    loadAll().then(() => {
      setLoading(false);
      applyRecurrings();
      refreshPrices();
    });
    const interval = setInterval(refreshPrices, PRICES_REFRESH_INTERVAL_MS);
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPrices();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [loadAll, refreshPrices, applyRecurrings]);

  // La foto de patrimonio necesita la cotización real (no el fallback previo
  // a la primera carga), así que espera a que el dólar termine de cargar —
  // a diferencia de applyRecurrings/refreshPrices, que no dependen de eso.
  // Se guarda una sola vez por sesión (no en cada refresco de precios).
  const snapshotCapturedRef = useRef(false);
  useEffect(() => {
    if (loading || dolar.loading || snapshotCapturedRef.current) return;
    snapshotCapturedRef.current = true;
    captureWealthSnapshot();
  }, [loading, dolar.loading, captureWealthSnapshot]);

  // Después de cada mutación se relee todo del repositorio: una sola fuente de
  // verdad y cero riesgo de que el estado local se desincronice.
  const refreshMovements = useCallback(async () => {
    setMovements(await repository.getMovements());
  }, []);

  const addAccount = useCallback(async (account: Omit<Account, 'id'>) => {
    await repository.addAccount(account);
    setAccounts(await repository.getAccounts());
  }, []);

  const updateAccount = useCallback(async (account: Account) => {
    await repository.updateAccount(account);
    setAccounts(await repository.getAccounts());
  }, []);

  // Al borrar una cuenta se van también sus movimientos
  const deleteAccount = useCallback(
    async (id: string) => {
      await repository.deleteAccount(id);
      setAccounts(await repository.getAccounts());
      await refreshMovements();
    },
    [refreshMovements],
  );

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

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    await repository.addCategory(category);
    setCategories(await repository.getCategories());
  }, []);

  // Renombrar arrastra movimientos, fijos y presupuestos: hay que releer todo
  const updateCategory = useCallback(async (category: Category, previousName: string) => {
    await repository.updateCategory(category, previousName);
    const [cats, movs, recs, buds] = await Promise.all([
      repository.getCategories(),
      repository.getMovements(),
      repository.getRecurrings(),
      repository.getBudgets(),
    ]);
    setCategories(cats);
    setMovements(movs);
    setRecurrings(recs);
    setBudgets(buds);
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await repository.deleteCategory(id);
    setCategories(await repository.getCategories());
    setBudgets(await repository.getBudgets());
  }, []);

  const setBudget = useCallback(async (category: string, amount: number) => {
    await repository.setBudget(category, amount);
    setBudgets(await repository.getBudgets());
  }, []);

  const addRecurring = useCallback(
    async (recurring: Omit<RecurringMovement, 'id'>) => {
      await repository.addRecurring(recurring);
      setRecurrings(await repository.getRecurrings());
      // Si el día del mes ya pasó, se carga en el acto
      await applyRecurrings();
    },
    [applyRecurrings],
  );

  const updateRecurring = useCallback(async (recurring: RecurringMovement) => {
    await repository.updateRecurring(recurring);
    setRecurrings(await repository.getRecurrings());
  }, []);

  const deleteRecurring = useCallback(async (id: string) => {
    await repository.deleteRecurring(id);
    setRecurrings(await repository.getRecurrings());
  }, []);

  const updateSavingsGoal = useCallback(async (goal: SavingsGoal) => {
    setSavingsGoal(await repository.setSavingsGoal(goal));
  }, []);

  const resetData = useCallback(async () => {
    await repository.resetData();
    await loadAll();
  }, [loadAll]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadAll(), refreshPrices(), dolar.refresh()]);
  }, [loadAll, refreshPrices, dolar]);

  const value = useMemo(
    () => ({
      loading,
      accounts,
      movements,
      positions,
      properties,
      savingsGoal,
      recurrings,
      categories,
      budgets,
      dolar,
      dolarHistory,
      livePrices,
      wealthSnapshots,
      addAccount,
      updateAccount,
      deleteAccount,
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
      addCategory,
      updateCategory,
      deleteCategory,
      setBudget,
      addRecurring,
      updateRecurring,
      deleteRecurring,
      updateSavingsGoal,
      resetData,
      refreshAll,
    }),
    [
      loading,
      accounts,
      movements,
      positions,
      properties,
      savingsGoal,
      recurrings,
      categories,
      budgets,
      dolar,
      dolarHistory,
      livePrices,
      wealthSnapshots,
      addAccount,
      updateAccount,
      deleteAccount,
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
      addCategory,
      updateCategory,
      deleteCategory,
      setBudget,
      addRecurring,
      updateRecurring,
      deleteRecurring,
      updateSavingsGoal,
      resetData,
      refreshAll,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
