-- ============================================================
-- Migration 015 — Facturation & Paiements (backoffice admin)
-- AkilAI Sénégal
--
-- À jouer après migration_014_renommer_plans_grille_reelle.sql.
-- Réutilise la table factures existante (migration_006) pour enregistrer
-- chaque paiement encaissé (statut='payee') — pas de table paiements
-- séparée.
-- ============================================================

create table public.abonnements (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null unique references public.profils(id) on delete cascade,
  montant_mensuel numeric not null,
  date_signature date not null default current_date,
  date_prochain_paiement date not null,
  statut_paiement text not null default 'a_jour'
    check (statut_paiement in ('a_jour', 'relance_j7', 'relance_j3', 'en_retard', 'resilie')),
  sante_paiement text not null default 'A' check (sante_paiement in ('A', 'B', 'C', 'D')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_abonnements_gestionnaire on public.abonnements(gestionnaire_id);

comment on table public.abonnements is
  'Suivi des abonnements clients (backoffice admin uniquement, /admin/facturation). Chaque paiement encaissé est enregistré comme une ligne dans factures (statut=''payee'') plutôt que dans une table séparée.';
comment on column public.abonnements.statut_paiement is
  'Recalculé (et réécrit) à chaque chargement de /admin/facturation à partir de date_prochain_paiement, sauf ''resilie'' qui est un état terminal manuel jamais recalculé automatiquement.';
comment on column public.abonnements.sante_paiement is
  'Indicateur qualitatif A/B/C/D, purement informatif pour l''instant : aucune action de ce chantier ne le modifie (toujours ''A'' à la création).';

-- RLS activé sans aucune policy : accessible uniquement via la clé
-- service_role (backoffice admin), jamais depuis le dashboard client.
alter table public.abonnements enable row level security;
