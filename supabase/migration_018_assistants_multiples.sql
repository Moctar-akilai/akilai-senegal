-- ============================================================
-- Migration 018 — Assistants WhatsApp multiples
-- AkilAI Sénégal
--
-- Permet à un gestionnaire d'avoir plusieurs assistants WhatsApp
-- (plusieurs lignes automatisations de type 'whatsapp'), chacun avec son
-- propre prompt/ton/langue/numéro/outils. La limite du nombre
-- d'assistants autorisés reste contrôlée par l'admin (parametres_compte.
-- limite_assistants), jamais autoréglable par le gestionnaire lui-même.
--
-- Les colonnes équivalentes sur parametres_compte (assistant_prompt,
-- assistant_ton, langue, numero_whatsapp, les 4 outil_*_actif) sont
-- volontairement conservées après cette migration, en lecture seule /
-- dépréciées : elles seront supprimées plus tard une fois la bascule
-- validée en conditions réelles.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nouvelles colonnes sur automatisations — mêmes noms, mêmes valeurs
--    par défaut et mêmes contraintes que sur parametres_compte.
-- ------------------------------------------------------------
alter table public.automatisations
  add column if not exists prompt text not null default '',
  add column if not exists ton text not null default 'professionnel',
  add column if not exists langue text not null default 'Français',
  add column if not exists numero_whatsapp text,
  add column if not exists outil_faq_actif boolean not null default true,
  add column if not exists outil_prise_rdv_actif boolean not null default false,
  add column if not exists outil_transfert_humain_actif boolean not null default true,
  add column if not exists outil_infos_pratiques_actif boolean not null default true;

alter table public.automatisations
  add constraint automatisations_ton_check check (ton in ('professionnel', 'amical', 'decontracte'));

alter table public.automatisations
  add constraint automatisations_numero_whatsapp_key unique (numero_whatsapp);

-- ------------------------------------------------------------
-- 2. Limite d'assistants autorisés — sur parametres_compte plutôt que
--    profils : c'est déjà là que vivent les autres réglages de compte
--    contrôlés par l'admin et affectant les capacités du gestionnaire
--    (plan, crm_actif...), alors que profils reste réservé à
--    l'identité (nom, téléphone). Débloquée uniquement depuis le
--    backoffice admin (§4) — jamais éditable par le gestionnaire.
-- ------------------------------------------------------------
alter table public.parametres_compte
  add column if not exists limite_assistants integer not null default 1;

-- ------------------------------------------------------------
-- 3. Migration des données existantes : copie les valeurs actuelles de
--    parametres_compte vers la ligne automatisations "Assistant
--    WhatsApp" déjà créée automatiquement à l'inscription de chaque
--    gestionnaire. Idempotent (peut être rejoué sans dupliquer/écraser
--    incorrectement, tant que les valeurs source n'ont pas changé).
-- ------------------------------------------------------------
update public.automatisations a
set
  nom = pc.assistant_nom,
  prompt = pc.assistant_prompt,
  ton = pc.assistant_ton,
  langue = pc.langue,
  numero_whatsapp = pc.numero_whatsapp,
  outil_faq_actif = pc.outil_faq_actif,
  outil_prise_rdv_actif = pc.outil_prise_rdv_actif,
  outil_transfert_humain_actif = pc.outil_transfert_humain_actif,
  outil_infos_pratiques_actif = pc.outil_infos_pratiques_actif
from public.parametres_compte pc
where pc.gestionnaire_id = a.gestionnaire_id
  and a.type = 'whatsapp';

-- ------------------------------------------------------------
-- 4. Découplage de la synchronisation bidirectionnelle héritée de la
--    migration_002 (parametres_compte.assistant_whatsapp_actif <->
--    automatisations.statut). Elle supposait un seul assistant
--    'whatsapp' par gestionnaire : avec plusieurs assistants possibles,
--    basculer le statut d'UN SEUL assistant basculerait par rebond TOUS
--    les autres assistants 'whatsapp' du même gestionnaire (via
--    l'aller-retour par parametres_compte). automatisations.statut est
--    désormais la seule source de vérité pour l'état actif/inactif de
--    chaque assistant (le webhook le lit directement) ;
--    assistant_whatsapp_actif reste sur parametres_compte, figé à sa
--    dernière valeur, purement déprécié.
-- ------------------------------------------------------------
drop trigger if exists trg_synchroniser_automatisation_depuis_parametres on public.parametres_compte;
drop trigger if exists trg_synchroniser_parametres_depuis_automatisation on public.automatisations;
drop function if exists public.synchroniser_automatisation_depuis_parametres();
drop function if exists public.synchroniser_parametres_depuis_automatisation();
