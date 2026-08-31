-- ============================================================
-- Migration 007 — Connexion des intégrations par clé API
-- AkilAI Sénégal
--
-- À jouer après migration_006_notifications_factures.sql.
-- Ajoute le stockage (chiffré côté application, jamais en clair) de la clé
-- API pour les fournisseurs compatibles clé API, plus le résultat de la
-- dernière tentative de vérification. Voir src/lib/integrations/chiffrement.ts
-- (AES-256-GCM, clé maîtresse dans ENCRYPTION_KEY) et
-- src/app/api/integrations/connecter/route.ts.
-- ============================================================

alter table public.integrations
  add column cle_api_chiffree text,
  add column derniere_verification timestamptz,
  add column message_erreur text;

comment on column public.integrations.cle_api_chiffree is
  'Clé API chiffrée (AES-256-GCM, voir src/lib/integrations/chiffrement.ts). Jamais stockée ni renvoyée en clair.';
comment on column public.integrations.derniere_verification is
  'Horodatage de la dernière tentative de vérification de la clé API (appel whoami/infos de compte côté fournisseur), quand ce fournisseur en propose une.';
comment on column public.integrations.message_erreur is
  'Message d''erreur de la dernière vérification échouée. La clé reste stockée (statut=''erreur'') pour permettre une correction.';
