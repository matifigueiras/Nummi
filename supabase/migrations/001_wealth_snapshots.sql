-- Migración incremental: agrega wealth_snapshots a una base que ya tiene
-- el resto de supabase/schema.sql corrido. Pegar en Dashboard de Supabase →
-- SQL Editor → Run. (El contenido también está en schema.sql, que ahora
-- documenta el esquema completo — este archivo es sólo lo nuevo, para no
-- tener que volver a correr todo desde cero.)

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
