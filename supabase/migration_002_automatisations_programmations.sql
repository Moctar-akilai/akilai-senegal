-- ============================================================
-- Migration 002 — Automatisations & Programmation
-- AkilAI Sénégal
--
-- À jouer après supabase/schema_akilai.sql (dépend de public.profils et
-- public.parametres_compte).
-- ============================================================

-- ------------------------------------------------------------
-- Automatisations : une ligne par automatisation configurée pour un
-- gestionnaire. Pour l'instant une seule automatisation possible
-- ("Assistant WhatsApp", créée automatiquement — voir le trigger plus
-- bas), mais la table est prête pour en accueillir plusieurs.
-- ------------------------------------------------------------
create table public.automatisations (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null references public.profils(id) on delete cascade,
  nom text not null,
  type text not null default 'whatsapp',
  statut text not null default 'actif' check (statut in ('actif', 'inactif', 'erreur')),
  description text,
  created_at timestamptz not null default now()
);

create index idx_automatisations_gestionnaire on public.automatisations(gestionnaire_id);

alter table public.automatisations enable row level security;

create policy "automatisations du gestionnaire" on public.automatisations
  for all using (auth.uid() = gestionnaire_id) with check (auth.uid() = gestionnaire_id);

-- ------------------------------------------------------------
-- Programmations : plage horaire d'activité d'une automatisation.
-- Une programmation par automatisation (actif=false => aucune
-- restriction, l'automatisation tourne 24h/7j).
-- ------------------------------------------------------------
create table public.programmations (
  id uuid primary key default gen_random_uuid(),
  automatisation_id uuid not null references public.automatisations(id) on delete cascade,
  jours_actifs integer[] not null default '{1,2,3,4,5,6,7}', -- 1=lundi ... 7=dimanche
  heure_debut time not null default '08:00',
  heure_fin time not null default '20:00',
  actif boolean not null default false, -- si false : aucune restriction horaire
  updated_at timestamptz not null default now()
);

-- Une seule programmation par automatisation.
create unique index idx_programmations_automatisation on public.programmations(automatisation_id);

alter table public.programmations enable row level security;

create policy "programmations via automatisation du gestionnaire" on public.programmations
  for all using (
    exists (
      select 1 from public.automatisations a
      where a.id = automatisation_id and a.gestionnaire_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.automatisations a
      where a.id = automatisation_id and a.gestionnaire_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- parametres_compte : ajout de la langue de l'assistant
-- ------------------------------------------------------------
alter table public.parametres_compte
  add column if not exists langue text not null default 'Français';

-- ============================================================
-- Synchronisation automatique — Automatisation "Assistant WhatsApp"
-- ============================================================

-- Crée automatiquement l'automatisation "Assistant WhatsApp" dès qu'un
-- profil est créé (un gestionnaire a toujours au moins cette automatisation).
create or replace function public.creer_automatisation_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.automatisations (gestionnaire_id, nom, type, statut, description)
  values (
    new.id,
    'Assistant WhatsApp',
    'whatsapp',
    'inactif',
    'Répond automatiquement aux messages WhatsApp entrants selon la configuration de l''assistant.'
  );
  return new;
end;
$$;

drop trigger if exists trg_creer_automatisation_whatsapp on public.profils;
create trigger trg_creer_automatisation_whatsapp
  after insert on public.profils
  for each row execute function public.creer_automatisation_whatsapp();

-- Synchronise automatisations.statut ('actif'/'inactif') avec
-- parametres_compte.assistant_whatsapp_actif quand celui-ci change. Ne
-- touche jamais une automatisation en statut 'erreur'. Le WHERE ne modifie
-- que les lignes qui en ont réellement besoin, ce qui empêche la boucle
-- avec le trigger inverse ci-dessous (une fois les deux valeurs alignées,
-- plus aucune des deux UPDATE ne touche de ligne).
create or replace function public.synchroniser_automatisation_depuis_parametres()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.automatisations
  set statut = case when new.assistant_whatsapp_actif then 'actif' else 'inactif' end
  where gestionnaire_id = new.gestionnaire_id
    and type = 'whatsapp'
    and statut <> 'erreur'
    and statut <> (case when new.assistant_whatsapp_actif then 'actif' else 'inactif' end);
  return new;
end;
$$;

drop trigger if exists trg_synchroniser_automatisation_depuis_parametres on public.parametres_compte;
create trigger trg_synchroniser_automatisation_depuis_parametres
  after insert or update of assistant_whatsapp_actif on public.parametres_compte
  for each row execute function public.synchroniser_automatisation_depuis_parametres();

-- Sens inverse : bascule parametres_compte.assistant_whatsapp_actif quand
-- le statut de l'automatisation "Assistant WhatsApp" change (ex: toggle
-- actif/inactif depuis la page Automatisations). Ignore le statut 'erreur'
-- (n'affecte pas le booléen). Même garde anti-boucle que ci-dessus.
create or replace function public.synchroniser_parametres_depuis_automatisation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'whatsapp' and new.statut in ('actif', 'inactif') then
    update public.parametres_compte
    set assistant_whatsapp_actif = (new.statut = 'actif')
    where gestionnaire_id = new.gestionnaire_id
      and assistant_whatsapp_actif <> (new.statut = 'actif');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_synchroniser_parametres_depuis_automatisation on public.automatisations;
create trigger trg_synchroniser_parametres_depuis_automatisation
  after update of statut on public.automatisations
  for each row execute function public.synchroniser_parametres_depuis_automatisation();

-- Ces fonctions ne doivent être invoquées que par les triggers ci-dessus
-- (SECURITY DEFINER les exécute avec les droits du propriétaire quel que
-- soit le rôle qui déclenche le trigger) — pas directement via l'API REST
-- (PostgREST expose par défaut toute fonction du schéma public en RPC, et
-- EXECUTE y est accordé à PUBLIC — donc à anon/authenticated — par défaut
-- à la création : il faut le révoquer sur PUBLIC, pas seulement sur ces
-- deux rôles, sans quoi le grant implicite via PUBLIC reste actif).
revoke execute on function public.creer_automatisation_whatsapp() from public;
revoke execute on function public.synchroniser_automatisation_depuis_parametres() from public;
revoke execute on function public.synchroniser_parametres_depuis_automatisation() from public;

-- ------------------------------------------------------------
-- Backfill : crée l'automatisation "Assistant WhatsApp" pour tout profil
-- déjà existant qui n'en aurait pas encore une (le trigger ci-dessus ne
-- couvre que les nouveaux profils). Idempotent.
-- ------------------------------------------------------------
insert into public.automatisations (gestionnaire_id, nom, type, statut, description)
select
  p.id,
  'Assistant WhatsApp',
  'whatsapp',
  case when pc.assistant_whatsapp_actif then 'actif' else 'inactif' end,
  'Répond automatiquement aux messages WhatsApp entrants selon la configuration de l''assistant.'
from public.profils p
left join public.parametres_compte pc on pc.gestionnaire_id = p.id
where not exists (
  select 1 from public.automatisations a
  where a.gestionnaire_id = p.id and a.type = 'whatsapp'
);
