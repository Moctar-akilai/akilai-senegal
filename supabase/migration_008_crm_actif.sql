-- ============================================================
-- Migration 008 — CRM actif
-- AkilAI Sénégal
--
-- À jouer après migration_007_integrations_cles_api.sql.
-- CRM AkilAI (natif, /dashboard/crm) est le CRM actif par défaut ; le
-- gestionnaire peut le remplacer par un CRM externe compatible clé API une
-- fois connecté (HubSpot, Notion, Airtable — catégorie "Données & CRM" de
-- /dashboard/integrations). Pour l'instant, crm_actif ne fait que
-- déterminer quel badge/statut s'affiche sur les cartes Intégrations : ça
-- ne bascule aucune donnée réelle (pas de sync/import), voir
-- src/app/dashboard/integrations/page.tsx.
-- ============================================================

alter table public.parametres_compte
  add column crm_actif text not null default 'crm_akilai'
    check (crm_actif in ('crm_akilai', 'hubspot', 'notion', 'airtable'));

comment on column public.parametres_compte.crm_actif is
  'CRM actif pour ce compte : crm_akilai (natif, par défaut) ou un fournisseur externe connecté (hubspot/notion/airtable). Détermine uniquement l''affichage des cartes Intégrations pour l''instant, pas de bascule fonctionnelle réelle.';
