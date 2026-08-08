# Nummi

App de finanzas personales para Argentina — ARS/USD con el blue como referencia.
React Native + Expo, primero web y después mobile. Spec completa en [CONTEXT.md](CONTEXT.md).

## Correr en local

```bash
npm install
npm run web
```

Abre en `http://localhost:8081`. Para mobile: `npm run ios` / `npm run android`,
o `npm start` y escanear el QR con Expo Go.

Tests de la lógica de cálculo (montos, conversiones, yield, fechas):

```bash
npm test
```

## Estructura

```
src/
  theme.ts            Design tokens (colores, espaciado, radios, sombras)
  types.ts            Tipos del dominio
  data/
    mock.ts           Datos simulados (se reemplaza por la API real)
    repository.ts     Interfaz DataRepository + implementación en memoria
  services/dolar.ts   Cotización blue (dolarapi.com, refresh 5 min + focus)
  store/AppContext.tsx Estado global de la app
  components/         UI reutilizable (Card, Donut, TabBar, modal FAB, …)
  screens/            Home · Cuentas · Patrimonio · Más
  utils/
    calc.ts           Cálculos puros (stats del mes, saldos, yield) + tests
    format.ts         Formato de plata y fechas + tests
```

Los datos viven en memoria: al recargar vuelven al mock. La persistencia real
se conecta después implementando `DataRepository` contra una API o base de datos.
