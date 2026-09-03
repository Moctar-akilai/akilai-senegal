-- ============================================================
-- Migration 017 — Finances : coûts d'infrastructure & dépense d'acquisition
-- AkilAI Sénégal
--
-- À jouer après migration_016_crm_commercial_leads.sql.
-- Vue analytique /admin/finances : aucune nouvelle donnée métier à saisir
-- manuellement à part ces coûts, tout le reste est calculé à partir de
-- l'existant (abonnements, factures).
-- ============================================================

create table public.couts_infrastructure (
  id uuid primary key default gen_random_uuid(),
  mois date not null,
  poste text not null check (poste in ('vercel', 'supabase', 'claude', 'openai', 'twilio', 'autres')),
  montant numeric not null,
  created_at timestamptz not null default now(),
  unique (mois, poste)
);

comment on table public.couts_infrastructure is
  'Coûts d''infrastructure mensuels par poste (backoffice admin, /admin/finances). mois est toujours le premier jour du mois (ex: 2026-09-01).';

alter table public.couts_infrastructure enable row level security;

-- Pré-remplissage des 12 derniers mois avec les coûts fixes connus (FCFA) :
-- Vercel 12000, Supabase 15000, Claude 13750. openai/twilio/autres à 0,
-- variables mois par mois, à saisir manuellement depuis /admin/finances.
insert into public.couts_infrastructure (mois, poste, montant)
select mois_serie.mois, postes.poste, postes.montant
from (
  select date_trunc('month', current_date - (n || ' months')::interval)::date as mois
  from generate_series(0, 11) as n
) mois_serie
cross join (
  values
    ('vercel', 12000),
    ('supabase', 15000),
    ('claude', 13750),
    ('openai', 0),
    ('twilio', 0),
    ('autres', 0)
) as postes(poste, montant)
on conflict (mois, poste) do nothing;

-- Dépense d'acquisition mensuelle (saisie manuelle, sert au calcul du CAC) —
-- pas de suivi marketing en base, distincte de couts_infrastructure pour ne
-- pas fausser le calcul des coûts d'infra / marge brute avec du marketing.
create table public.depenses_acquisition (
  mois date primary key,
  montant numeric not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.depenses_acquisition is
  'Dépense d''acquisition (marketing/commercial) saisie manuellement par mois — sert uniquement au calcul du CAC sur /admin/finances, distincte de couts_infrastructure.';

alter table public.depenses_acquisition enable row level security;

-- RLS activé sans aucune policy sur les deux tables : accessible uniquement
-- via la clé service_role (backoffice admin), jamais depuis le dashboard
-- client — même logique que abonnements/leads.
