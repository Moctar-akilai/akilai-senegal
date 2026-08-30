-- ============================================================
-- Schéma minimal — AkilAI Sénégal
-- Plateforme d'assistant WhatsApp configurable pour TPE/PME.
--
-- À jouer sur un NOUVEAU projet Supabase (base neuve). Ce fichier ne
-- contient volontairement PAS les tables biens/locataires/baux/paiements
-- de l'ancien produit (Rentila/Iziloc) : voir supabase/schema.sql, laissé
-- tel quel dans le repo pour référence, et non rejoué ici.
-- ============================================================

-- ------------------------------------------------------------
-- Profils utilisateurs (liés à auth.users de Supabase)
-- ------------------------------------------------------------
create table public.profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  telephone text not null, -- format international, ex: +221771234567
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Paramètres de compte : configuration de l'assistant WhatsApp
-- ------------------------------------------------------------
create table public.parametres_compte (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null unique references public.profils(id) on delete cascade,

  -- Activation générale
  assistant_whatsapp_actif boolean not null default false,

  -- Numéro WhatsApp Twilio assigné à ce compte (format "whatsapp:+221...").
  -- Sert à router un message entrant vers le bon compte dans le webhook.
  numero_whatsapp text unique,

  -- Identité et comportement de l'assistant (entièrement libre, défini
  -- par chaque gestionnaire — on ne touche jamais à ce contenu)
  assistant_nom text not null default 'Assistant',
  assistant_prompt text not null default '',
  assistant_ton text not null default 'professionnel'
    check (assistant_ton in ('professionnel', 'amical', 'decontracte')),

  -- Outils activables pour l'assistant (4 toggles)
  outil_faq_actif boolean not null default true,
  outil_prise_rdv_actif boolean not null default false,
  outil_transfert_humain_actif boolean not null default true,
  outil_infos_pratiques_actif boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Contacts : tout numéro WhatsApp ayant écrit à un compte, connu
-- ou non. Créé automatiquement par le webhook au premier message.
-- ------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null references public.profils(id) on delete cascade,
  telephone text not null, -- format WhatsApp, ex: +221771234567
  nom text, -- nullable : rempli plus tard si le contact se présente
  premiere_interaction timestamptz not null default now(),
  derniere_interaction timestamptz not null default now(),
  unique (gestionnaire_id, telephone)
);

-- ------------------------------------------------------------
-- Conversations WhatsApp : historique des messages échangés
-- ------------------------------------------------------------
create table public.conversations_whatsapp (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null references public.profils(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  direction text not null check (direction in ('entrant', 'sortant')),
  type_message text not null default 'texte' check (type_message in ('texte', 'audio')),
  contenu text, -- texte du message (ou transcription si audio)
  audio_url text, -- chemin dans le bucket Storage "audios-whatsapp"
  created_at timestamptz not null default now()
);

-- Index utiles
create index idx_parametres_compte_numero on public.parametres_compte(numero_whatsapp);
create index idx_contacts_gestionnaire on public.contacts(gestionnaire_id);
create index idx_contacts_derniere_interaction on public.contacts(derniere_interaction desc);
create index idx_conversations_contact on public.conversations_whatsapp(contact_id);
create index idx_conversations_gestionnaire on public.conversations_whatsapp(gestionnaire_id);
create index idx_conversations_created_at on public.conversations_whatsapp(created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profils enable row level security;
alter table public.parametres_compte enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations_whatsapp enable row level security;

create policy "profil visible par son propriétaire" on public.profils
  for select using (auth.uid() = id);
create policy "profil modifiable par son propriétaire" on public.profils
  for update using (auth.uid() = id);
create policy "profil insérable par son propriétaire" on public.profils
  for insert with check (auth.uid() = id);

create policy "parametres du gestionnaire" on public.parametres_compte
  for all using (auth.uid() = gestionnaire_id) with check (auth.uid() = gestionnaire_id);

create policy "contacts du gestionnaire" on public.contacts
  for all using (auth.uid() = gestionnaire_id) with check (auth.uid() = gestionnaire_id);

create policy "conversations du gestionnaire" on public.conversations_whatsapp
  for all using (auth.uid() = gestionnaire_id) with check (auth.uid() = gestionnaire_id);

-- Le webhook WhatsApp (route serveur, non authentifiée côté Supabase) écrit
-- via la clé service_role, qui contourne le RLS — ces policies protègent
-- uniquement l'accès depuis le dashboard authentifié.

-- ============================================================
-- Storage : bucket pour les messages vocaux WhatsApp
-- ============================================================
insert into storage.buckets (id, name, public)
values ('audios-whatsapp', 'audios-whatsapp', false)
on conflict (id) do nothing;

-- Le webhook (service_role) écrit dans ce bucket ; le dashboard lit via
-- des URLs signées générées côté serveur. Un gestionnaire authentifié peut
-- aussi lire directement les fichiers rangés sous son propre uid/.
create policy "lecture des audios par leur propriétaire"
  on storage.objects for select
  using (
    bucket_id = 'audios-whatsapp'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
