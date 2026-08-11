import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ocultar montos (Home, Cuentas, Patrimonio) es una preferencia del
// dispositivo, no un dato de la cuenta — se persiste local, no en Supabase.

const HIDE_KEY = 'nummi:hideBalances';

interface PrivacyState {
  hidden: boolean;
  toggleHidden: () => void;
}

const PrivacyContext = createContext<PrivacyState | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HIDE_KEY).then((saved) => {
      if (saved === 'true') setHidden(true);
    });
  }, []);

  const value = useMemo(
    () => ({
      hidden,
      toggleHidden: () => {
        setHidden((prev) => {
          const next = !prev;
          AsyncStorage.setItem(HIDE_KEY, String(next));
          return next;
        });
      },
    }),
    [hidden],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyState {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy debe usarse dentro de <PrivacyProvider>');
  return ctx;
}
