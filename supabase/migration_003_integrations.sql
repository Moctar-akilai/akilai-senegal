-- ============================================================
-- Migration 003 — Intégrations
-- AkilAI Sénégal
--
-- À jouer après migration_002_automatisations_programmations.sql.
-- Interface complète (page /dashboard/integrations), sans connexion OAuth
-- réelle pour l'instant : cette table sert uniquement à retenir le statut
-- affiché (non_connecte par défaut) pour chaque fournisseur, prête à être
-- branchée sur de vrais flux OAuth plus tard.
-- ============================================================

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null references public.profils(id) on delete cascade,
  fournisseur text not null check (fournisseur in (
    'google_calendar', 'calendly', 'crm_akilai', 'hubspot', 'shopify',
    'notion', 'airtable', 'google_sheets', 'excel', 'slack', 'teams',
    'outlook', 'brevo', 'resend'
  )),
  statut text not null default 'non_connecte' check (statut in ('non_connecte', 'connecte', 'erreur')),
  connecte_le timestamptz,
  created_at timestamptz not null default now(),
  unique (gestionnaire_id, fournisseur)
);

create index idx_integrations_gestionnaire on public.integrations(gestionnaire_id);

alter table public.integrations enable row level security;

create policy "integrations du gestionnaire" on public.integrations
  for all using (auth.uid() = gestionnaire_id) with check (auth.uid() = gestionnaire_id);

-- Aucune ligne n'est créée par défaut pour chaque fournisseur : la page
-- /dashboard/integrations affiche 'non_connecte' pour tout fournisseur
-- sans ligne correspondante (voir src/app/dashboard/integrations/page.tsx).
-- Une ligne n'est écrite que par le bascule de statut réservé au dev tant
-- qu'il n'y a pas de vrai flux OAuth.
