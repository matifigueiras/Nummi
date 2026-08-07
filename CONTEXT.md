# App de Finanzas Personales — Spec para Claude Code

## 1. Contexto y objetivo

App de finanzas personales pensada para gestionar plata en Argentina (entorno dual ARS/USD, con dólar blue como tipo de cambio de referencia). Inspirada funcionalmente en Guitafix, Revolut y Mercado Pago.

El proyecto viene de un workflow anterior en Google Sheets + Google Apps Script (`Code.gs`, con `leerMovimientos()` y lectores dinámicos sobre 4 pestañas: CAJA ARS, CAJA USD, TOTALES, INVERSIONES). Esa dependencia se está dejando atrás: el objetivo es una app 100% autocontenida.

Objetivo de esta etapa: definir bien el diseño y el funcionamiento de la app. El almacenamiento de datos queda para una etapa posterior — por ahora no es parte del alcance.

## 2. Stack técnico

- Framework: React Native + Expo
- Orden de desarrollo: primero pensada y probada para navegador (Expo for Web), después adaptada/pulida para mobile (iOS/Android vía Expo)
- Gráficos: librería de charts compatible con Expo/React Native (elegida: `react-native-svg` con componentes propios — más simple que una librería de charts completa)
- Datos en vivo: dolarapi.com (cotización blue), auto-refresh cada 5 min y al volver a la pestaña/app

## 3. Estructura de navegación (ya definida, no tocar)

```
Home · Cuentas · (●) FAB · Patrimonio · Más
```

## 4. Dirección de diseño

- Diseño moderno, limpio y premium — que se sienta a la altura de las mejores apps de finanzas del mercado
- Interfaz simple y elegante, sin recargar de elementos
- Tarjetas con bordes redondeados
- Botones grandes, fáciles de tocar
- Iconos simples y consistentes (set único: Feather, vía `@expo/vector-icons`)
- Buena separación visual entre secciones (espaciado generoso, jerarquía clara)

## 5. Especificación por tab

### Home
- Navegador de mes (← →)
- Saludo contextual
- Cotización del dólar blue, inline y compacta
- Grid 2×2 de stats: Ingresos / Gastos / Ahorro del mes / Meta de ahorro
- Gráfico donut Ingresos vs. Gastos

### Cuentas
- Caja ARS y Caja USD fusionadas en un solo tab
- Toggle ARS/USD
- Widgets del mes en curso: resumen Ingresos/Gastos/Balance y gastos por categoría (barras)

### Patrimonio
- Tracking de posiciones individuales:
  - Acciones y Cripto: ticker, cantidad, precio de compra, precio actual, **moneda de los precios** (CEDEARs/acciones locales cotizan en ARS)
  - Propiedades: alquiler mensual, gastos, valor estimado — **cada monto con su propia moneda** (caso típico: valor en USD, alquiler en ARS), yield anual calculado automáticamente convirtiendo todo a USD al blue

### Más
- (a definir en próximas iteraciones)

## 6. Principios de trabajo

- Simpleza ante todo: si hay dos formas de resolver algo funcionalmente, elegir la más simple
- Primero web, después mobile: cada feature se arma y prueba en Expo for Web antes de portarse/ajustarse para iOS/Android
- Iteración incremental: cambios chicos, con feedback inmediato, no reescrituras grandes
- Lectura dinámica de datos: evitar rangos hardcodeados; escanear y filtrar nulls en vez de asumir estructuras fijas
- No romper lo ya definido: navegación y estructura de tabs son decisiones cerradas, no se renegocian salvo pedido explícito

## 7. Estado actual

- Etapa 1 completa: app funcional con datos simulados en memoria (`src/data/mock.ts`)
- Tema claro/oscuro/sistema: selector en "Más", paletas en `src/theme.ts`, contexto en `src/store/ThemeContext.tsx` (la elección vive en memoria hasta que exista almacenamiento)
- Alta de patrimonio: botón "+" por sección en Patrimonio (acciones, cripto y propiedades) con formularios en sheet
- Transferencias entre cajas: dos patas vinculadas por `transferId`; cuentan para los saldos pero se excluyen de ingresos/gastos del mes. No se editan: se eliminan (ambas patas) y se recargan
- Edición y borrado: tap en cualquier movimiento, posición o propiedad abre su formulario precargado, con botón de eliminar en dos pasos
- Fecha del movimiento elegible (stepper de días, sin futuro)
- Meta de ahorro editable (tile de Home o desde Más) con % real sin recortar
- Indicador de cotización desactualizada cuando falla dolarapi (ícono + "último valor hace X")
- Toda la app habla con la interfaz `DataRepository` (`src/data/repository.ts`) — para conectar una API/base de datos real alcanza con escribir otra implementación y cambiar un export
- Persistencia local implementada como puente: `LocalStorageRepository` guarda todo en el dispositivo (AsyncStorage / localStorage en web), incluido el tema elegido. "Restablecer datos de ejemplo" disponible en Más
- Backend real (API/base de datos propia): pendiente, etapa aparte. **Google Sheets queda descartado explícitamente como backend** — cuando llegue, se escribe otra implementación de `DataRepository` y se cambia un export
