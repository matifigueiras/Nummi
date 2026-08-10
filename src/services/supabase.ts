import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Cliente único de Supabase. La URL y la anon key son públicas por diseño
// (la seguridad real la dan las políticas de RLS en supabase/schema.sql),
// pero igual viven en variables de entorno y no hardcodeadas.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Revisá el archivo .env (ver .env.example).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // En web, el magic link vuelve con la sesión en el hash de la URL y
    // supabase-js la detecta sola. En nativo no hay URL de navegador: el
    // link se maneja como deep link (queda para cuando se pruebe en
    // simulador/dispositivo real).
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * En nativo, el refresh automático del token debe pausarse cuando la app
 * pasa a segundo plano (si no, sigue corriendo el timer sin sentido) y
 * reanudarse al volver. En web no hace falta: la pestaña ya maneja esto.
 */
export function useSupabaseAutoRefresh(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);
}
