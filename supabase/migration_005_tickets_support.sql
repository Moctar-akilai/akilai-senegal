-- ============================================================
-- Migration 005 — Correction du modèle Tickets (support plateforme,
-- pas lié aux contacts WhatsApp)
-- AkilAI Sénégal
--
-- À jouer après migration_004_crm_tickets.sql. Ajuste les tables
-- tickets / ticket_messages créées par cette migration : les tickets sont
-- un système de support entre le gestionnaire (client de la plateforme
-- AkilAI) et l'équipe support AkilAI (futur backoffice, pas encore
-- construit) — ils n'ont jamais eu de sens liés aux contacts WhatsApp du
-- gestionnaire.
-- ============================================================

-- contact_id n'a pas de sens pour un ticket de support plateforme.
alter table public.tickets
  drop column if exists contact_id;

-- auteur devient 'client' (le gestionnaire qui a ouvert le ticket) /
-- 'support' (l'équipe AkilAI, via le futur backoffice — aucun message
-- 'support' n'est créé automatiquement pour l'instant).
alter table public.ticket_messages
  drop constraint if exists ticket_messages_auteur_check;

alter table public.ticket_messages
  add constraint ticket_messages_auteur_check
    check (auteur in ('client', 'support'));
