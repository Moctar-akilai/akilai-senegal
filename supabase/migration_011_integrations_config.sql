-- ============================================================
-- Migration 011 — Config des intégrations (Notion, etc.)
-- AkilAI Sénégal
--
-- À jouer après migration_010_parametres_compte_defaut.sql.
-- Stocke la configuration spécifique à un fournisseur qui en a besoin au
-- delà de la clé API elle-même — pour Notion : { database_id, mapping }
-- où mapping associe nos champs internes (nom, telephone, email, statut)
-- aux noms des propriétés réelles de la base Notion du gestionnaire.
-- Structure volontairement libre (jsonb) pour être réutilisable par
-- d'autres fournisseurs similaires (Airtable) sans nouvelle migration.
-- ============================================================

alter table public.integrations
  add column config jsonb;

comment on column public.integrations.config is
  'Configuration spécifique au fournisseur, ex. Notion : {"database_id": "...", "mapping": {"nom": "...", "telephone": "...", "email": "...", "statut": "..."}}. Null si non applicable/non configurée.';
