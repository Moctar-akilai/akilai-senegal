-- ============================================================
-- Schéma MVP — Rentila Sénégal
-- Modèle prêt pour agences (proprietaire_id) mais utilisé
-- en v1 uniquement en mode "particulier" (proprietaire_id = null)
-- ============================================================

-- Profils utilisateurs (liés à auth.users de Supabase)
create table public.profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  telephone text not null, -- format WhatsApp, ex: +221771234567
  role text not null default 'proprietaire' check (role in ('proprietaire', 'agence')),
  created_at timestamptz not null default now()
);

-- Biens immobiliers
create table public.biens (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null references public.profils(id) on delete cascade,
  proprietaire_id uuid references public.profils(id) on delete set null, -- null en v1 (particulier = son propre bien)
  adresse text not null,
  ville text not null default 'Dakar',
  loyer_mensuel numeric not null,
  charges numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Locataires
create table public.locataires (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid not null references public.biens(id) on delete cascade,
  nom text not null,
  telephone text not null, -- WhatsApp
  email text,
  created_at timestamptz not null default now()
);

-- Baux
create table public.baux (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid not null references public.biens(id) on delete cascade,
  locataire_id uuid not null references public.locataires(id) on delete cascade,
  date_debut date not null,
  date_fin date,
  montant_loyer numeric not null,
  depot_garantie numeric not null default 0,
  statut text not null default 'actif' check (statut in ('actif', 'termine', 'resilie')),
  created_at timestamptz not null default now()
);

-- Paiements (un enregistrement par échéance mensuelle)
create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  bail_id uuid not null references public.baux(id) on delete cascade,
  mois date not null, -- premier jour du mois concerné, ex: 2026-09-01
  montant numeric not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'paye', 'retard')),
  date_encaissement date,
  moyen_paiement text check (moyen_paiement in ('orange_money', 'wave', 'especes', 'virement', 'autre')),
  quittance_envoyee boolean not null default false,
  relance_envoyee boolean not null default false,
  derniere_relance_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bail_id, mois)
);

-- Index utiles
create index idx_biens_gestionnaire on public.biens(gestionnaire_id);
create index idx_locataires_bien on public.locataires(bien_id);
create index idx_baux_bien on public.baux(bien_id);
create index idx_paiements_bail on public.paiements(bail_id);
create index idx_paiements_statut on public.paiements(statut);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profils enable row level security;
alter table public.biens enable row level security;
alter table public.locataires enable row level security;
alter table public.baux enable row level security;
alter table public.paiements enable row level security;

create policy "profil visible par son propriétaire" on public.profils
  for select using (auth.uid() = id);
create policy "profil modifiable par son propriétaire" on public.profils
  for update using (auth.uid() = id);

create policy "biens du gestionnaire" on public.biens
  for all using (auth.uid() = gestionnaire_id);

create policy "locataires via bien du gestionnaire" on public.locataires
  for all using (
    exists (select 1 from public.biens b where b.id = bien_id and b.gestionnaire_id = auth.uid())
  );

create policy "baux via bien du gestionnaire" on public.baux
  for all using (
    exists (select 1 from public.biens b where b.id = bien_id and b.gestionnaire_id = auth.uid())
  );

create policy "paiements via bail du gestionnaire" on public.paiements
  for all using (
    exists (
      select 1 from public.baux ba
      join public.biens b on b.id = ba.bien_id
      where ba.id = bail_id and b.gestionnaire_id = auth.uid()
    )
  );
