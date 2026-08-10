import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { supabase, useSupabaseAutoRefresh } from '../services/supabase';

// Sesión de Supabase (magic link, sin contraseñas). El resto de la app no
// sabe nada de esto: sólo le importa si hay `session` o no.

interface AuthState {
  session: Session | null;
  /** true mientras se resuelve si ya había una sesión guardada */
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  /**
   * Confirma el código de 6 dígitos que llega en el mismo mail del magic
   * link. Existe porque Gmail (y otros) prefetchean el link por seguridad,
   * lo que consume el token de un solo uso antes de que el usuario llegue a
   * tocarlo — el código de texto no tiene ese problema.
   */
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useSupabaseAutoRefresh();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    // En web vuelve a la misma URL con la sesión en el hash; en nativo
    // queda armado para el deep link cuando se pruebe en simulador/dispositivo.
    const redirectTo = Linking.createURL('/');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return { error: error?.message ?? null };
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ session, loading, signInWithEmail, verifyCode, signOut }),
    [session, loading, signInWithEmail, verifyCode, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
