# Estado del proyecto Nummi

> Empezó como snapshot de la sesión del 2026-08-09 (commit `132ba45`, 116
> tests, working tree limpio). Desde ahí Mati pidió actualizarlo **en el
> momento** cada vez que algo queda confirmado, no sólo al cierre de sesión
> — así que las secciones 1-5 son la foto de ese día y la sección 0 es el
> registro vivo de lo que se está construyendo ahora. Ver [CONTEXT.md](CONTEXT.md)
> para la spec funcional completa.

## 0. Migración a Supabase — COMPLETA Y VERIFICADA

Arrancó el 2026-08-09 en la misma sesión, a pedido de Mati ("quiero conectar
la base de datos, me recomendaron supabase"). Eligió **multi-dispositivo con
login por magic link** (no single-user sin auth) cuando se le preguntó.
**Terminó ese mismo día**: login, migración de datos y CRUD contra la base
real, todo verificado en el navegador (ver "Verificación end-to-end" más
abajo). Nummi ya no usa AsyncStorage/localStorage como fuente de verdad —
`repository` (`src/data/repository.ts`) es `SupabaseRepository`.

### Verificación end-to-end (2026-08-09, en el navegador real)
- **Login con código funcionó de punta a punta**: mandé el código, Mati lo
  pegó (`96189311` — 8 dígitos, no 6, ver nota de OTP length abajo), la app
  entró a Home con sesión real. **Persiste**: refresh completo de página
  (`navigate` a la misma URL) mantuvo la sesión y los datos sin volver al
  login.
- **Datos reales migrados**: al loguearse, `migrateLocalDataToSupabase` subió
  los datos que Mati ya había cargado en el device (Sueldo $2.900.000,
  Alquiler depto $650.000, Supermercado Jumbo $172.000, Carga SUBE $20.000,
  Café de especialidad $9.500, cuentas Caja ARS/Caja USD, categorías, meta de
  ahorro $900k) — se vieron con esos montos exactos en Home/Cuentas después
  del login, no datos de ejemplo.
- **Escritura real confirmada**: cargué un movimiento de prueba ($1, "TEST
  supabase (borrar)") desde el modal de Nuevo Movimiento → Gastos pasó de
  $885.710 a $885.711 en Home, apareció en la lista de Cuentas con la
  categoría "Ahorro" nueva. Lo borré después (`deleteMovement`, con el botón
  de confirmación en dos pasos) → los números volvieron a los reales y
  "Ahorro" desapareció de "Gastos por categoría". Confirma `addMovement` y
  `deleteMovement` funcionando contra Postgres real, con RLS.
- **Sin errores de consola** en ningún paso de esto.

### Dos problemas reales encontrados y resueltos en el camino
1. **Gmail invalida los magic links por prefetch**: Mati usa Gmail, que
   escanea/prefetchea los links de los mails por seguridad — eso consume el
   token de un solo uso antes del click real (`otp_expired` en dos intentos
   seguidos). Es un problema conocido de Supabase + Gmail, no un bug de acá.
   **Fix**: se cambió el login a pedir el código de la OTP en vez de
   depender del link (`AuthContext.verifyCode` → `supabase.auth.verifyOtp({
   email, token, type: 'email' })`; `LoginScreen` tiene un segundo paso con
   input de código). El link se sigue mandando como alternativa.
2. **El servicio de mail default de Supabase no deja editar plantillas ni
   manda más que un puñado de mails por hora** (`email rate limit
   exceeded`) — es sólo para pruebas rápidas, no service real. **Fix**: se
   conectó **Resend** como SMTP propio (Authentication → Emails → SMTP
   Settings: host `smtp.resend.com`, puerto 465, user `resend`, password =
   API key de Resend, sender `onboarding@resend.dev`). Con eso se desbloqueó
   editar la plantilla de "Magic link or OTP" y se sacó el rate limit.
   **Nota**: el largo de la OTP en este proyecto resultó ser de **8
   dígitos**, no 6 como asume la config default de Supabase que yo tenía en
   la cabeza — el input de código en `LoginScreen` se ajustó para aceptar
   cualquier largo ≥6 en vez de exactamente 6.

### Bug encontrado y arreglado antes de dar por cerrado el cutover
`SupabaseRepository.resetData()` borraba **cuentas y categorías** además de
lo transaccional — a diferencia de la versión local, que reseedeaba
cuentas/categorías demo después de "resetear". Eso habría dejado al usuario
sin nada para elegir al cargar el próximo movimiento (bug real, no sólo
copy). Se corrigió para conservar cuentas y categorías, sólo borra
movimientos/fijos/posiciones/propiedades/presupuestos/meta. El copy del
modal en `MasScreen` ("Restablecer datos", antes "Restablecer datos de
ejemplo") y el footer ("Sincronizado con tu cuenta", antes "Datos guardados
en este dispositivo") se actualizaron para reflejar esto con precisión. Se
sacó también el item "Conectar almacenamiento (Pronto)" de la lista, porque
ya está conectado.

### Detalle técnico (para referencia futura)
- **Esquema SQL completo** en [supabase/schema.sql](supabase/schema.sql): 8
  tablas (`accounts`, `categories`, `recurring_movements`,
  `recurring_applied_months`, `movements`, `positions`, `properties`,
  `budgets`, `savings_goal`), cada una con `user_id` + Row Level Security.
  Corrido por Mati en el SQL Editor y confirmado funcionando (las escrituras
  de la verificación end-to-end de arriba pasaron por estas tablas y sus
  policies de RLS).
- **Cliente de Supabase** (`src/services/supabase.ts`): instalado
  `@supabase/supabase-js` + `react-native-url-polyfill` + `expo-linking`,
  cliente configurado con AsyncStorage para persistir sesión,
  `detectSessionInUrl` sólo en web, auto-refresh de token pausado/reanudado
  con AppState en nativo. Probado: la app arranca sin errores de consola con
  las env vars reales (confirma que lee `.env` bien).
- **`AuthContext`** (`src/store/AuthContext.tsx`) + **`LoginScreen`**
  (`src/screens/LoginScreen.tsx`): pantalla de email → código de acceso, sin
  contraseña (ver nota sobre por qué código y no sólo link, arriba). Expone
  `signInWithEmail` (manda el código) y `verifyCode` (lo confirma vía
  `supabase.auth.verifyOtp`). **Probado de punta a punta con sesión real**:
  ver "Verificación end-to-end" arriba.
- **Gate de autenticación en `App.tsx`**: sin sesión → `LoginScreen`; con
  sesión → los tabs de siempre (`AppProvider` sólo se monta autenticado, para
  cuando dependa de saber qué usuario es). Estado de carga inicial con
  spinner mientras se resuelve si había sesión guardada. Probado: sin sesión
  se ve el login, no los tabs.
- **`MasScreen`** actualizado: el email real de la sesión reemplaza el
  "Mati" / mail hardcodeado de antes; nuevo botón de cerrar sesión (ícono
  `log-out`) junto al perfil.
- **Mapeo DB↔app** (`src/data/supabaseMappers.ts`): funciones puras
  `xFromDb`/`xToDb` para las 8 entidades (snake_case de Postgres ↔ camelCase
  de `src/types.ts`), incluyendo el caso `null`↔`undefined` de
  `recurringId`/`transferId` en movimientos y el default `{currency:'ARS',
  amount:0}` cuando todavía no hay fila de meta de ahorro. **Testeado**: 12
  tests nuevos en `src/data/__tests__/supabaseMappers.test.ts`, todos
  pasando (`npx jest` → 128/128 tests, 7 suites, sobre el total del
  proyecto).
- **`SupabaseRepository`** (`src/data/SupabaseRepository.ts`): implementación
  completa de `DataRepository` contra Supabase — es el export activo de
  `src/data/repository.ts` (cutover hecho). Cubre las 25 operaciones de la
  interfaz, con las mismas reglas de negocio que `LocalStorageRepository`:
  `deleteAccount`/`deleteMovement` limpian la pata hermana de una
  transferencia buscando por `transfer_id` (el `ON DELETE CASCADE` de
  `account_id` no la alcanza si vive en otra cuenta), `addTransfer` inserta
  la pata "out" primero y reusa su `id` de Postgres como `transfer_id`
  compartido (sin sumar una lib de uuids), `deleteRecurring` confía en el
  `ON DELETE CASCADE` de `recurring_applied_months`, `updateCategory`
  arrastra el rename a movimientos/fijos/presupuestos, y `resetData`
  conserva cuentas y categorías (ver "Bug encontrado y arreglado" arriba).
  Typecheck limpio. **No tiene tests directos** (mismo criterio que
  `dolar.ts`/`prices.ts`: es una capa fina que sólo hace red, la lógica que
  vale la pena testear ya está cubierta en `supabaseMappers.test.ts`) — la
  verificación real fue end-to-end en el navegador contra la base real (ver
  arriba): `addMovement` y `deleteMovement` confirmados con un movimiento de
  prueba, lecturas de las 8 tablas confirmadas al mostrar los datos
  migrados.
- **`migrateLocalData.ts`** (`migrateLocalDataToSupabase`): sube lo que haya
  en el AsyncStorage de este dispositivo (de la época pre-Supabase) a la
  cuenta recién logueada, remapeando ids string viejos a los `uuid` nuevos
  (cuentas primero, después fijos y movimientos que las referencian,
  agrupando las patas de transferencia bajo el `id` nuevo de una de ellas).
  Dos guardas: si el usuario ya tiene cuentas en Supabase no hace nada (evita
  duplicar en logins siguientes o en un dispositivo nuevo), y si este
  dispositivo nunca tuvo AsyncStorage con datos reales, tampoco toca nada
  (evita subir los datos de ejemplo que `LocalStorageRepository` sembraría
  solo, al leerlos). Se llama una vez por sesión desde `App.tsx`
  (`AuthedApp`), con un spinner mientras corre y sin bloquear el login si
  falla (sólo loguea el error en consola). **Verificado con datos reales**:
  ver "Verificación end-to-end" arriba — subió el sueldo, alquiler,
  supermercado, etc. que ya estaban cargados localmente.
- **Cutover hecho y verificado**: `src/data/repository.ts` exporta
  `new SupabaseRepository()` en vez de `new LocalStorageRepository()` — la
  app entera (todas las pantallas, vía `DataRepository`) habla con Supabase.
  `LocalStorageRepository` sigue existiendo (exportada) porque
  `migrateLocalData.ts` la usa para leer los datos viejos.

### Decisión de seguridad tomada en esta sesión — RESUELTA
Mati pegó por error la **secret key** (`sb_secret_...`, equivalente al
`service_role key` — acceso total a la base, saltea RLS) en el chat, además
de la publishable key que sí correspondía. **No se guardó en ningún archivo
del proyecto ni se usó** — esta arquitectura (cliente + anon key + RLS) no la
necesita. Mati la **eliminó del dashboard** (Settings → API → Secret keys →
Delete, no sólo regenerar) el mismo día. Confirmado cerrado, no queda nada
pendiente acá.

### Verificación exhaustiva de pantallas (2026-08-09, mismo día)
Se ejercitó cada operación de escritura contra la base real (crear con datos
de prueba, confirmar en pantalla, y borrar/revertir para no ensuciar los
datos reales de Mati):
- **Transferencias** (`addTransfer`): Caja ARS → Caja USD, las dos patas
  aparecieron con el mismo `transfer_id`; `deleteMovement` sobre una pata
  borró las dos.
- **Posiciones** (`addPosition`/`updatePosition`/`deletePosition`): cripto de
  prueba creada, editada (confirma lectura) y borrada.
- **Propiedades** (`addProperty`/`updateProperty`/`deleteProperty`): mismo
  ciclo, ok. Se encontró y arregló un bug de UI (no de Supabase, preexistente):
  `NewPropertyModal.tsx` bloqueaba "Agregar" si "Alquiler mensual" quedaba
  vacío, porque `parsedRent` no tenía el mismo fallback a 0 que
  `parsedExpenses`. Corregido (`rent.trim() === '' ? 0 : parseAmount(rent)`)
  y reverificado: ahora se puede guardar una propiedad sin tocar ese campo.
- **Movimientos fijos** (`addRecurring`/`updateRecurring`/`deleteRecurring`):
  mismo ciclo, ok.
- **Presupuestos** (`setBudget`): crear con monto y borrar con monto 0, ok.
- **Categorías** (`addCategory`/`deleteCategory`): mismo ciclo, ok.
- **Meta de ahorro** (`setSavingsGoal`/`getSavingsGoal`): cambiada y
  revertida, con lectura de vuelta confirmando el valor guardado.
Con esto las 25 operaciones de `DataRepository` quedaron probadas contra la
base real al menos una vez. Sin errores de consola en ningún paso.

**Nota de testing (no producto)**: el `Sheet` (modal genérico de
`src/components/Sheet.tsx`) tiene una animación de fade que a veces hace que
una captura de pantalla tomada inmediatamente después de un click muestre el
estado previo un instante — no es un bug de la app, sólo hay que esperar
~1s antes de asumir que un modal no abrió. Igual con `ConfirmDeleteButton`:
si pasan varios segundos entre el primer y el segundo tap (por hacer otras
llamadas de por medio) el estado "armado" se resetea solo — hacer los dos
taps seguidos.

### Pendiente / a medio hacer
- **Deep link en nativo**: `detectSessionInUrl` está desactivado en nativo a
  propósito (no aplica) pero el manejo del deep link del magic link en
  iOS/Android (esquema de URL, listener de `Linking`) no está armado — y no
  se puede probar igual, dado el bloqueo de Xcode (ver sección 2).

### Trackeo de tareas
Las 5 tasks de este hilo (`#1`-`#5`) están todas **completed**: instalar
cliente, login, `SupabaseRepository`, migración de datos, cutover +
verificación end-to-end. La migración a Supabase está terminada.

## 0.5. Pulido visual post-migración — COMPLETO (2026-08-11)

Con Supabase ya cerrado, en la misma sesión se sumó una tanda de UI. Todo
verificado en el navegador, typecheck limpio y tests en verde en cada paso
(136 tests al cierre, arrancó en 128).

- **Donut de composición del patrimonio** (`WealthDonut.tsx`): Efectivo /
  Inversiones / Propiedades en Patrimonio, reemplazó el listado de íconos.
  Paleta de 3 colores validada con el script de accesibilidad del skill de
  dataviz (nuevo token `investment` en `theme.ts`).
- **Animaciones draw-in** en: el donut de Patrimonio, las barras de
  presupuesto de Home, las barras de "Gastos por categoría" en Cuentas, y las
  columnas de "Ahorro por mes" en Home (que además ganó una transición suave
  de opacidad al elegir mes, antes saltaba). Todas con `Animated.timing` +
  `strokeDashoffset`/`width` interpolado, sin dependencias nuevas.
- **Fix de bug real** (no cosmético): `NewPropertyModal.tsx` bloqueaba
  guardar si "Alquiler mensual" quedaba vacío (`parsedRent` no trataba
  vacío como 0, a diferencia de `parsedExpenses`) — corregido.
- **Ocultar montos / variación % / insight automático**: Mati pasó un zip
  con 4 componentes + 1 hook de referencia (revisados por seguridad antes de
  tocar nada — sin código sospechoso, pero con colores/fuentes/`Ionicons`
  hardcodeados y datos mock). Se integraron 3 de las 4 piezas, reescritas
  para usar el tema real y datos reales:
  - `PrivacyContext.tsx`: botón de ojo compartido y persistido (mismo patrón
    que `ThemeContext`) que tapa el saldo/patrimonio/stats principales en
    Home, Cuentas y Patrimonio (no los charts ni las listas, a propósito).
  - `PercentageDelta.tsx`: variación % vs. mes anterior debajo de Ingresos y
    Gastos en Home (Ahorro quedó afuera: el signo puede cruzar cero y ahí
    un % no tiene sentido — ver `percentDelta` en `calc.ts`).
  - `InsightCard.tsx` + `monthlyInsight` (`calc.ts`): compara gasto por
    categoría del mes actual contra el anterior, sin IA.
  - **No se integró** `StreakBadge` (racha tipo Duolingo) — decisión de
    Mati: es un cambio de tono (gamificación) para una app que venía siendo
    seria/directa, y hoy no hay tracking diario de presupuesto para
    sostener la lógica de "racha".

## 0.6. Evolución del patrimonio + deploy web — EN CURSO (2026-08-11)

Dos pedidos de Mati en la misma sesión: (a) un gráfico de patrimonio en el
tiempo, y (b) usar Nummi como página web (no como app) para acceder desde
cualquier dispositivo sin instalar nada — esto último también resuelve de
paso el problema de Expo Go/SDK 57 en iPhone (sección 5).

### Código escrito y commiteado (`29c2d4d`) — typecheck limpio, 140 tests
- **`wealth_snapshots`** (tabla nueva): una fila por usuario y mes
  (`month_key`, `cash_usd`, `investments_usd`, `properties_usd`), RLS por
  dueño. La del mes en curso se pisa (upsert) cada vez que se abre la app;
  las de meses cerrados quedan fijas. **No hay forma de reconstruir meses
  anteriores a que esto exista** — `positions`/`properties` no tienen
  historial de precio propio, así que el gráfico arranca vacío y crece con
  el uso, no con el pasado.
- **`wealthBreakdown`** (`calc.ts`): extrae a una función pura y testeada el
  cálculo de efectivo/inversiones/propiedades que antes vivía sólo en
  `PatrimonioScreen` — ahora lo usan tanto la pantalla como la captura de
  la foto mensual, sin lógica duplicada.
- **`captureWealthSnapshot`** (`AppContext.tsx`): corre una vez por sesión,
  mismo patrón que `applyRecurrings` (lee fresco del repositorio, no del
  estado de React), pero espera a que la cotización del dólar termine de
  cargar antes de disparar.
- **`WealthTrend.tsx`**: línea de evolución en SVG (con área) + variación %
  desde el primer mes guardado, en una card nueva en Patrimonio. Estado
  vacío mientras haya menos de 2 fotos ("Todavía no hay suficientes meses
  guardados...").
- **`supabase/migrations/`**: carpeta nueva para migraciones incrementales
  (antes sólo existía `schema.sql` completo). `001_wealth_snapshots.sql` es
  la primera.

### Bloqueado: la escritura real contra Supabase no se pudo confirmar
Mati corrió la migración en el SQL Editor (confirmado: el segundo intento
tiró `relation "wealth_snapshots" already exists`, o sea que la tabla se
creó bien la primera vez). Pero la app seguía recibiendo
`PGRST205: Could not find the table 'public.wealth_snapshots' in the schema
cache'` incluso después de:
- Esperar ~10s.
- Correr `NOTIFY pgrst, 'reload schema';` en el SQL Editor.
- Recargar la página varias veces, incluso con cache-busting (`?cb=...`).

Lo raro: un `curl` directo a `/rest/v1/wealth_snapshots` y un `fetch()` crudo
ejecutado *desde el propio navegador* (bypaseando el cliente de Supabase de
la app) **sí funcionaron** (devolvieron `[]`, no error) — pero la app,
cargando fresca inmediatamente después, seguía viendo el error. Da la
sensación de que el schema cache de PostgREST no había terminado de
propagarse a todas las réplicas/pooler de Supabase en simultáneo (`NOTIFY`
no siempre llega a todas). **Próximo paso sugerido y no confirmado
todavía**: reiniciar el proyecto entero desde Settings → General → "Restart
project" en el dashboard (fix más contundente que `NOTIFY`, con costo de
~1-2 min de downtime). Se le preguntó a Mati si quería hacerlo y la sesión
se cortó ahí — **retomar por acá**.

### Deploy web (Vercel) — no arrancado todavía
Mati eligió **Vercel** (recomendada) sobre Netlify cuando se le preguntó.
Nada hecho todavía: falta armar el build estático de Expo Web, la config de
Vercel, que Mati cree su cuenta y conecte el proyecto, cargar las env vars
(`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`) en el dashboard
de Vercel, y agregar la URL pública resultante a la lista de Redirect URLs
permitidas en Supabase (Authentication → URL Configuration) — mismo paso que
se hizo para `http://localhost:8081` en la migración original (sección 0).

## 1. Funcionalidades confirmadas y funcionando

Todo lo de abajo fue **verificado a mano en el navegador** (Expo Web,
`npm run web`), no solo por tests. Cuando dice "probado: X" es porque se
hicieron las acciones concretas descriptas, no una inferencia.

### Home
- Navegador de mes, saludo contextual, cotización blue con indicador de
  actualizado/desactualizado.
- Grid de stats (Ingresos/Gastos/Ahorro/Meta) + donut Ingresos vs. Gastos.
- **Presupuestos**: tarjeta con avance por categoría (ok/cerca/excedido).
  Probado: cargué 3 presupuestos (Vivienda $600k, Comida $200k, Transporte
  $100k) y vi los tres estados a la vez con ícono+texto+color.
- **Gráfico de ahorro por mes** (últimos 6): columnas verde/naranja sobre
  línea de cero, tap por mes. Probado con un mes negativo inyectado a mano.
- Meta de ahorro editable desde el tile (% real, sin recortar a 100%).

### Cuentas
- **Varias cuentas** (no solo ARS/USD fijas): alta/edición/borrado. Probado:
  creé "Mercado Pago" (ARS, saldo inicial $340.000), apareció el total
  combinado por moneda, y lo volví a borrar verificando que sus movimientos
  se fueran con ella sin dejar huérfanos.
- **Transferencias entre cualquier par de cuentas**: mismo monto si son la
  misma moneda, tipo de cambio implícito si no. Probado: transferí $100.000
  de Caja ARS a Mercado Pago y el total en pesos no se movió (correcto).
- Navegador de mes que gobierna TODA la pantalla (saldo, widgets, lista) —
  ya no hay dos alcances mezclados como al principio.
- Saldo al cierre del mes elegido (no siempre "hoy"). Equivalente en la otra
  moneda usa el blue **de esa fecha**, no el de hoy (ver sección de cotización
  histórica abajo).
- **Buscador de movimientos**: por descripción o categoría, sin distinguir
  mayúsculas ni acentos. Mientras hay texto, busca en TODOS los meses de la
  cuenta (los widgets de arriba se quedan en el mes elegido). Probado:
  "alquiler" devolvió los 4 meses donde aparece; "cafe" (sin tilde) encontró
  "Café de especialidad"; "gimnasio" dio 0 resultados con el mensaje correcto.

### Patrimonio
- Acciones/cripto con ticker, cantidad, moneda de los precios (ARS o USD —
  para CEDEARs/acciones locales), precio compra/actual, P&L%.
- **Precios en vivo**: CoinGecko (cripto) y data912 (acciones US y
  argentinas), refresh cada 5 min. Probado: los precios del mock cambiaron
  a valores reales de mercado al cargar; confirmé que SPY (ETF, no está en
  data912) se queda con el precio cargado a mano sin punto verde.
- Propiedades con cada monto en su propia moneda (valor USD, alquiler ARS
  es el caso típico), yield anual automático.

### Más
- Tema claro/oscuro/sistema, persistido.
- **Movimientos fijos** (sueldo, alquiler, suscripciones): se generan solos
  al abrir la app cuando llega el día. Probado el ciclo completo: creé un
  gasto "Gimnasio" día 4 (ya pasado), se registró solo al instante; recargué
  varias veces sin que se duplicara; lo borré a mano, recargué, y no
  reapareció ese mes (pero el fijo sigue definido para el mes siguiente).
- **Categorías propias**: alta/renombrado/borrado. Renombrar arrastra
  movimientos+fijos+presupuestos; borrar solo deja de ofrecerla (el
  histórico conserva el nombre). Probado: creé "Mascota", apareció al
  instante en el selector de categorías del formulario de movimiento.
- **Exportar a CSV** (movimientos/posiciones/propiedades): separador `;`,
  coma decimal, gastos en negativo, BOM UTF-8. Probado: intercepté la
  descarga real en el navegador y confirmé 39 filas, orden por fecha, y los
  primeros 3 bytes del archivo (`EF BB BF`) confirmando el BOM.
- Meta de ahorro, restablecer datos de ejemplo.

### Transversal
- **Persistencia local** (AsyncStorage/localStorage) con 4 migraciones de
  formato (v1→v2→v3→v4) probadas sin pérdida de datos en cada salto.
- **Cotización histórica del blue**: cada movimiento en USD de un mes
  cerrado se convierte al tipo de cambio de SU fecha, no al de hoy. Fuente:
  `api.argentinadatos.com` (histórico diario desde 2011, 5695 registros).
  Probado: el equivalente de julio pasó de "US$3.541 al blue de hoy" a
  "US$3.462 al blue del 31 jul" (blue real de esa fecha: $1.560, confirmado
  leyendo el caché en localStorage).
- **Separador de miles en vivo** en todos los campos de monto (no en
  cantidad de posición). Probado tipeo normal, coma decimal, y un backspace
  simulado a nivel nativo (ver limitación conocida en sección 4).
- **Accesibilidad**: todos los botones de solo ícono tienen
  `accessibilityRole="button"` + `accessibilityLabel`. Verificado leyendo
  los atributos `aria-label`/`role` reales en el DOM.
- Edición y borrado (con confirmación en dos pasos) en movimientos,
  posiciones, propiedades, cuentas, categorías y fijos.
- 116 tests unitarios sobre toda la lógica de cálculo pura (`src/utils/`),
  0 fallando.

## 2. Pendiente de probar o a medio hacer

- **Nada a medio hacer**: el working tree está limpio, todo commiteado
  (último commit `db1ed1a`). Cada feature de las secciones 0 / 0.5 está
  completa end-to-end.
- **iOS/Android real: sigue sin probarse.** Esta Mac no tiene Xcode
  instalado (solo Command Line Tools), así que nunca se pudo abrir el
  simulador de iPhone. Además, Expo Go de App Store todavía no tiene
  aprobada la versión para SDK 57 (el que usa Nummi) — es un problema
  actual de Expo, no de acá; ver detalle en sección 5. **Sigue siendo el
  hueco de verificación más grande**: nadie tocó la app en un dispositivo o
  simulador real todavía, todo fue Expo Web.
- **Backend real (Supabase)**: hecho y verificado — migración completa el
  2026-08-09, ver sección 0. `repository` ya no es `LocalStorageRepository`.
  Google Sheets sigue descartado como opción.
- **Racha de presupuesto** (`StreakBadge`, sección 0.5): descartada por
  ahora, no por falta de tiempo — es una decisión de producto (tono
  gamificado) que Mati puede retomar si en algún momento quiere trackear
  cumplimiento de presupuesto día a día.

## 3. En qué se estaba trabajando ahora mismo

**Nada activo.** La migración a Supabase (sección 0) y la tanda de pulido
visual post-migración (sección 0.5) se completaron y commitearon en su
totalidad en la misma sesión que arrancaron (2026-08-09 a 2026-08-11).

Si algo quedó "caliente" de la tanda anterior (la del commit `132ba45`) es
el conocimiento fresco de estos archivos (por si hay que iterar sobre ellos):

- `src/services/dolarHistory.ts` + `src/utils/dolarHistoryLookup.ts`
  (búsqueda del historial separada del hook para poder testearla)
- `src/utils/calc.ts` (monthStats/savingsByMonth/budgetProgress ahora
  reciben un `RateResolver`, no un número fijo — `constantRate()` cubre
  los casos que no necesitan variar por fecha)
- `src/utils/search.ts` (`searchMovements`, normaliza con NFD para
  ignorar acentos — **ver limitación de encoding en sección 4**)
- `src/screens/CuentasScreen.tsx` (el archivo más grande y con más lógica
  mezclada: mes, cuenta, saldo histórico, búsqueda, todo junto)
- `src/utils/format.ts` (`formatThousandsLive`/`stripThousands`, son
  funciones inversas entre sí, hay un test que lo verifica como propiedad)
- Pasada de accesibilidad tocó ~10 archivos de componentes agregando
  `accessibilityLabel`/`accessibilityRole`/`accessibilityState`

## 4. Bugs conocidos y limitaciones detectadas

- **El simulador de teclado del panel de pruebas (Browser pane) no dispara
  un backspace real.** Al probar el formateo en vivo de montos, presionar
  Backspace vía la herramienta de automatización no modificaba el valor del
  input (verificado leyendo `selectionStart`/`selectionEnd`/`value` del DOM
  antes y después: no cambiaban). Tuve que simular un backspace nativo real
  inyectando el evento `input` a mano por JS para confirmar que el código
  SÍ funciona correctamente. **Esto es una limitación de la herramienta de
  testing, no un bug de la app** — pero significa que cualquier interacción
  de teclado que dependa de Backspace/Delete debería re-verificarse con
  cuidado si se prueba de nuevo por este camino (typing hacia adelante con
  `type` sí funciona bien).
- **Encoding de caracteres Unicode en `src/utils/search.ts`**: al escribir
  ese archivo, el regex de diacríticos (`/[̀-ͯ]/g`) terminó en el
  código fuente como los caracteres Unicode combinados literales en vez de
  la forma escapada `̀`-`ͯ`. Es **funcionalmente idéntico**
  (verificado a nivel de bytes UTF-8 y con 7 tests que pasan, incluida
  búsqueda con y sin tilde), pero si se abre ese archivo en un editor y se
  ve raro/con caracteres invisibles pegados al `[` y al `-`, es por esto,
  no es corrupción. Si molesta, se puede reescribir a mano con
  `̀`/`ͯ` explícito — no es urgente.
- **Sin probar en mobile nativo** (ver sección 2) — todo el trabajo de esta
  sesión fue verificado en Expo Web. Layout, gestos, teclado nativo y
  rendimiento en iOS/Android son terreno no verificado.
- El equivalente en dólares de un saldo (Cuentas) usa el blue de **cierre
  de mes** como aproximación — no hay conversión movimiento-por-movimiento
  para el saldo acumulado en sí (sí la hay para ingresos/gastos/presupuestos
  del mes, que si convierten cada movimiento a su propia fecha). Es una
  simplificación consciente, no un bug, pero vale tenerla presente si se
  pide más precisión ahí.

## 5. Próximos pasos sugeridos

Con Supabase y el pulido visual cerrados (secciones 0 y 0.5), lo único que
queda es el hueco de siempre — probar en un dispositivo real — más ideas
sueltas sin decidir todavía:

1. **Probar en un dispositivo/simulador real.** Tres caminos, ninguno
   trivial hoy:
   - **`eas go`**: arma una versión propia de Expo Go instalable por
     TestFlight — es el único camino para iPhone físico con SDK 57 ahora
     mismo (Expo Go de App Store está trabado en revisión de Apple para esa
     versión). Requiere Apple Developer Program (pago, USD 99/año).
   - **Xcode + simulador de iOS**: no depende de Apple Developer Program ni
     de la aprobación de Expo Go, pero requiere instalar Xcode (pesado,
     necesita la clave de admin de la Mac). Sigue sin hacerse.
   - **Android**: no debería tener el problema de SDK que tiene iOS —
     `npm start` + Expo Go de Play Store tendría que andar directo. No
     probado porque no hay un Android a mano en esta sesión.
   - Mientras tanto, la app funciona igual desde el navegador del celu
     (Safari/Chrome a la IP local de la compu) sin instalar nada.
2. Ejercitar más pantallas de Supabase con uso real y sostenido (más allá
   de la verificación puntual ya hecha en la sección 0).
3. Si se retoma edición de `src/utils/search.ts`, considerar limpiar el
   encoding del regex de diacríticos (cosmético, ver sección 4).
4. Ideas sueltas mencionadas pero no decididas: gráfico de evolución del
   patrimonio en el tiempo (necesita empezar a guardar un snapshot mensual,
   hoy no existe) y la racha de presupuesto (`StreakBadge`, descartada por
   tono — ver sección 0.5).
5. Antes de cualquier commit nuevo: correr `npx tsc --noEmit && npx jest`.

## Referencia rápida

- **Correr la app**: `npm run web` (o vía el panel de preview con el
  launch config `nummi-web` en `.claude/launch.json`).
- **Tests**: `npx jest`.
- **Spec funcional completa**: [CONTEXT.md](CONTEXT.md).
- **Historial de decisiones de UX/copy**: revisar los mensajes de commit
  (`git log`), son descriptivos y explican el "por qué", no solo el "qué".
