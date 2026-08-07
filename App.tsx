import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NewMovementModal } from './src/components/NewMovementModal';
import { TabBar } from './src/components/TabBar';
import { CuentasScreen } from './src/screens/CuentasScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MasScreen } from './src/screens/MasScreen';
import { PatrimonioScreen } from './src/screens/PatrimonioScreen';
import { AppProvider } from './src/store/AppContext';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';

const Tab = createBottomTabNavigator();

function AppInner() {
  const { scheme, colors } = useTheme();
  const [showNewMovement, setShowNewMovement] = useState(false);

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

  return (
    <>
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
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppInner />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
