-- ============================================================
-- Migration 016 — CRM commercial (pipeline de prospects)
-- AkilAI Sénégal
--
-- À jouer après migration_015_facturation_abonnements.sql.
-- Distinct du CRM client (table contacts, gère les contacts WhatsApp de
-- chaque gestionnaire) : ce CRM gère les prospects AkilAI elle-même, avant
-- qu'ils deviennent clients de la plateforme.
-- ============================================================

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  entreprise text,
  telephone text,
  email text,
  statut text not null default 'prospect' check (statut in (
    'prospect', 'contacte', 'demo_planifiee', 'proposition_envoyee', 'gagne', 'perdu'
  )),
  source text,
  notes text,
  raison_perte text,
  plan_estime text check (plan_estime in ('Essentiel', 'Croissance', 'Pro')),
  gestionnaire_id_converti uuid references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_statut on public.leads(statut);

comment on table public.leads is
  'CRM commercial interne (pipeline de prospects AkilAI, /admin/crm) — distinct du CRM client (table contacts) qui gère les contacts WhatsApp de chaque gestionnaire.';
comment on column public.leads.source is
  'Origine libre du lead (ex: closer, entrant, recommandation) — pas de liste fermée.';
comment on column public.leads.gestionnaire_id_converti is
  'Renseigné une fois le lead converti en client réel via "Convertir en client" (/api/admin/write, action lead.convertir). Null tant que non converti.';

-- RLS activé sans aucune policy : accessible uniquement via la clé
-- service_role (backoffice admin), jamais depuis le dashboard client.
alter table public.leads enable row level security;
