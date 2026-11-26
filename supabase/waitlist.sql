-- Liste d'attente de la landing page.
-- À exécuter une fois dans Supabase : SQL Editor > New query > Run.

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

-- Un email ne s'inscrit qu'une fois, sans tenir compte de la casse.
create unique index if not exists waitlist_email_lower_idx on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Les visiteurs (rôle anon) peuvent seulement ajouter une ligne.
-- Aucune règle de lecture, modification ou suppression : la liste n'est lisible
-- que depuis le tableau de bord Supabase ou avec la clé service.
drop policy if exists "waitlist_insert_anon" on public.waitlist;
create policy "waitlist_insert_anon" on public.waitlist
  for insert to anon
  with check (true);

revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon;
