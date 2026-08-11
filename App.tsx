import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NewMovementModal } from './src/components/NewMovementModal';
import { TabBar } from './src/components/TabBar';
import { migrateLocalDataToSupabase } from './src/data/migrateLocalData';
import { CuentasScreen } from './src/screens/CuentasScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MasScreen } from './src/screens/MasScreen';
import { PatrimonioScreen } from './src/screens/PatrimonioScreen';
import { AppProvider } from './src/store/AppContext';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { PrivacyProvider } from './src/store/PrivacyContext';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';

const Tab = createBottomTabNavigator();

// La app entera (los tabs de siempre) sólo se monta con sesión activa: el
// día que AppProvider hable con Supabase va a necesitar saber quién sos.
function AuthedApp({ userId }: { userId: string }) {
  const { scheme, colors } = useTheme();
  const [showNewMovement, setShowNewMovement] = useState(false);
  // Antes de mostrar la app, se intenta subir lo que haya quedado en este
  // dispositivo de la época pre-Supabase (ver migrateLocalData.ts). Si falla,
  // no bloquea el login — el usuario sigue viendo la app (con los datos que
  // ya tenga en la nube), sólo que sin haberse migrado nada de este aparato.
  const [migrating, setMigrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    migrateLocalDataToSupabase(userId)
      .catch((err) => console.error('Migración de datos locales a Supabase falló:', err))
      .finally(() => {
        if (!cancelled) setMigrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.card,
      primary: colors.accent,
    },
  };

  if (migrating) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <AppProvider>
      <PrivacyProvider>
        <NavigationContainer theme={navigationTheme}>
          <Tab.Navigator
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <TabBar {...props} onFabPress={() => setShowNewMovement(true)} />}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Cuentas" component={CuentasScreen} />
            <Tab.Screen name="Patrimonio" component={PatrimonioScreen} />
            <Tab.Screen name="Más" component={MasScreen} />
          </Tab.Navigator>
        </NavigationContainer>
        <NewMovementModal visible={showNewMovement} onClose={() => setShowNewMovement(false)} />
      </PrivacyProvider>
    </AppProvider>
  );
}

function Gate() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return session ? <AuthedApp userId={session.user.id} /> : <LoginScreen />;
}

function Root() {
  const { scheme } = useTheme();
  return (
    <>
      <AuthProvider>
        <Gate />
      </AuthProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
