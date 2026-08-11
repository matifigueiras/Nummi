-- Esquema de Nummi para Supabase (Postgres).
--
-- Cómo correrlo: Dashboard de Supabase → SQL Editor → New query → pegar todo
-- este archivo → Run. Es idempotente-friendly la primera vez; si necesitás
-- volver a correrlo sobre una base ya creada, borrá las tablas primero.
--
-- Multi-usuario: cada tabla tiene user_id (referencia a auth.users, el
-- sistema de auth de Supabase) y Row Level Security activado, así cada
-- usuario sólo puede leer/escribir sus propias filas aunque compartan el
-- mismo proyecto. auth.uid() es el id del usuario autenticado en la sesión
-- actual — lo resuelve Supabase automáticamente a partir del JWT.
--
-- Los ids son uuid (generados por Postgres), a diferencia de los ids tipo
-- "caja-ars" o "m01" que usa hoy LocalStorageRepository — eso se resuelve
-- en el paso de migración de datos, no acá.

-- ── Cuentas ──────────────────────────────────────────────────────────────

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null check (currency in ('ARS', 'USD')),
  initial_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "accounts select own" on public.accounts
  for select using (auth.uid() = user_id);
create policy "accounts insert own" on public.accounts
  for insert with check (auth.uid() = user_id);
create policy "accounts update own" on public.accounts
  for update using (auth.uid() = user_id);
create policy "accounts delete own" on public.accounts
  for delete using (auth.uid() = user_id);

-- ── Categorías ───────────────────────────────────────────────────────────

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('ingreso', 'gasto')),
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

alter table public.categories enable row level security;

create policy "categories select own" on public.categories
  for select using (auth.uid() = user_id);
create policy "categories insert own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories update own" on public.categories
  for update using (auth.uid() = user_id);
create policy "categories delete own" on public.categories
  for delete using (auth.uid() = user_id);

-- ── Movimientos fijos ────────────────────────────────────────────────────
-- (antes de "movements" porque movements.recurring_id la referencia)

create table public.recurring_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  category text not null,
  type text not null check (type in ('ingreso', 'gasto')),
  account_id uuid not null references public.accounts(id) on delete cascade,
  currency text not null check (currency in ('ARS', 'USD')),
  amount numeric not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.recurring_movements enable row level security;

create policy "recurring select own" on public.recurring_movements
  for select using (auth.uid() = user_id);
create policy "recurring insert own" on public.recurring_movements
  for insert with check (auth.uid() = user_id);
create policy "recurring update own" on public.recurring_movements
  for update using (auth.uid() = user_id);
create policy "recurring delete own" on public.recurring_movements
  for delete using (auth.uid() = user_id);

-- Meses ya procesados por cada fijo (evita duplicar o regenerar lo que el
-- usuario borró a mano). Reemplaza al mapa appliedMonths en memoria/local.
create table public.recurring_applied_months (
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_id uuid not null references public.recurring_movements(id) on delete cascade,
  month_key text not null, -- "yyyy-mm"
  primary key (recurring_id, month_key)
);

alter table public.recurring_applied_months enable row level security;

create policy "applied select own" on public.recurring_applied_months
  for select using (auth.uid() = user_id);
create policy "applied insert own" on public.recurring_applied_months
  for insert with check (auth.uid() = user_id);
create policy "applied delete own" on public.recurring_applied_months
  for delete using (auth.uid() = user_id);

-- ── Movimientos ──────────────────────────────────────────────────────────

create table public.movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  description text not null,
  category text not null, -- nombre, no id: un movimiento viejo conserva la categoría aunque se borre
  type text not null check (type in ('ingreso', 'gasto')),
  account_id uuid not null references public.accounts(id) on delete cascade,
  currency text not null check (currency in ('ARS', 'USD')),
  amount numeric not null check (amount > 0),
  recurring_id uuid references public.recurring_movements(id) on delete set null,
  transfer_id uuid, -- agrupa las dos patas de una transferencia; no es FK, es sólo una etiqueta compartida
  created_at timestamptz not null default now()
);

alter table public.movements enable row level security;

create policy "movements select own" on public.movements
  for select using (auth.uid() = user_id);
create policy "movements insert own" on public.movements
  for insert with check (auth.uid() = user_id);
create policy "movements update own" on public.movements
  for update using (auth.uid() = user_id);
create policy "movements delete own" on public.movements
  for delete using (auth.uid() = user_id);

create index movements_user_date_idx on public.movements (user_id, date);
create index movements_account_idx on public.movements (account_id);
create index movements_transfer_idx on public.movements (transfer_id) where transfer_id is not null;
create index movements_recurring_idx on public.movements (recurring_id) where recurring_id is not null;

-- ── Acciones y cripto ────────────────────────────────────────────────────

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('accion', 'cripto')),
  ticker text not null,
  name text not null,
  quantity numeric not null check (quantity > 0),
  currency text not null check (currency in ('ARS', 'USD')),
  buy_price numeric not null check (buy_price > 0),
  current_price numeric not null check (current_price > 0),
  created_at timestamptz not null default now()
);

alter table public.positions enable row level security;

create policy "positions select own" on public.positions
  for select using (auth.uid() = user_id);
create policy "positions insert own" on public.positions
  for insert with check (auth.uid() = user_id);
create policy "positions update own" on public.positions
  for update using (auth.uid() = user_id);
create policy "positions delete own" on public.positions
  for delete using (auth.uid() = user_id);

-- ── Propiedades ──────────────────────────────────────────────────────────
-- Cada monto tiene su propia moneda (valor en USD con alquiler en ARS es
-- el caso típico), por eso currency va repetida por campo.

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monthly_rent numeric not null default 0 check (monthly_rent >= 0),
  rent_currency text not null check (rent_currency in ('ARS', 'USD')),
  monthly_expenses numeric not null default 0 check (monthly_expenses >= 0),
  expenses_currency text not null check (expenses_currency in ('ARS', 'USD')),
  estimated_value numeric not null check (estimated_value > 0),
  value_currency text not null check (value_currency in ('ARS', 'USD')),
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

create policy "properties select own" on public.properties
  for select using (auth.uid() = user_id);
create policy "properties insert own" on public.properties
  for insert with check (auth.uid() = user_id);
create policy "properties update own" on public.properties
  for update using (auth.uid() = user_id);
create policy "properties delete own" on public.properties
  for delete using (auth.uid() = user_id);

-- ── Presupuestos ─────────────────────────────────────────────────────────
-- Un límite mensual por categoría de gasto, en ARS. Guardar amount <= 0
-- equivale a "sin presupuesto" en la app, así que directamente se borra la
-- fila (ver setBudget en el repositorio) en vez de guardar un cero.

create table public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null check (amount > 0),
  primary key (user_id, category)
);

alter table public.budgets enable row level security;

create policy "budgets select own" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets insert own" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets update own" on public.budgets
  for update using (auth.uid() = user_id);
create policy "budgets delete own" on public.budgets
  for delete using (auth.uid() = user_id);

-- ── Meta de ahorro ───────────────────────────────────────────────────────
-- Una sola fila por usuario (no una lista), por eso user_id es la PK.

create table public.savings_goal (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null check (currency in ('ARS', 'USD')),
  amount numeric not null default 0 check (amount >= 0)
);

alter table public.savings_goal enable row level security;

create policy "savings_goal select own" on public.savings_goal
  for select using (auth.uid() = user_id);
create policy "savings_goal insert own" on public.savings_goal
  for insert with check (auth.uid() = user_id);
create policy "savings_goal update own" on public.savings_goal
  for update using (auth.uid() = user_id);

-- ── Foto mensual de patrimonio ───────────────────────────────────────────
-- Una fila por usuario y mes. La del mes en curso se pisa (upsert) cada vez
-- que se abre la app; las de meses cerrados quedan fijas. Sirve para
-- graficar la evolución del patrimonio en el tiempo — sin esto no hay forma
-- de saber cuánto valían las inversiones/propiedades en un mes pasado (el
-- efectivo sí se puede reconstruir desde movements, pero current_price de
-- positions y estimated_value de properties no tienen historial propio).

create table public.wealth_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null, -- "yyyy-mm"
  cash_usd numeric not null,
  investments_usd numeric not null,
  properties_usd numeric not null,
  created_at timestamptz not null default now(),
  primary key (user_id, month_key)
);

alter table public.wealth_snapshots enable row level security;

create policy "wealth_snapshots select own" on public.wealth_snapshots
  for select using (auth.uid() = user_id);
create policy "wealth_snapshots insert own" on public.wealth_snapshots
  for insert with check (auth.uid() = user_id);
create policy "wealth_snapshots update own" on public.wealth_snapshots
  for update using (auth.uid() = user_id);
create policy "wealth_snapshots delete own" on public.wealth_snapshots
  for delete using (auth.uid() = user_id);
