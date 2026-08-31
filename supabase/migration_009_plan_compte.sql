-- ============================================================
-- Migration 009 — Plan du compte
-- AkilAI Sénégal
--
-- À jouer après migration_008_crm_actif.sql.
-- Ajoute le plan choisi par le gestionnaire, affiché en badge dans la
-- sidebar (voir src/app/dashboard/layout.tsx). Aucune logique de
-- facturation/limites associée pour l'instant, purement informatif.
-- ============================================================

alter table public.parametres_compte
  add column plan text not null default 'Starter'
    check (plan in ('Starter', 'Business', 'Premium'));

comment on column public.parametres_compte.plan is
  'Plan tarifaire choisi par le gestionnaire, affiché en badge dans la sidebar. Purement informatif pour l''instant (pas de logique de limites/facturation associée).';
