-- ============================================================
-- Migration 006 — Notifications & Factures
-- AkilAI Sénégal
--
-- À jouer après migration_005_tickets_support.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null references public.profils(id) on delete cascade,
  type text not null check (type in ('reponse_ticket', 'ticket_resolu', 'rappel_paiement', 'automatisation_activee')),
  titre text not null,
  message text,
  lien text, -- chemin relatif vers la section concernée, ex: /dashboard/tickets/<id>
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_gestionnaire on public.notifications(gestionnaire_id);
create index idx_notifications_gestionnaire_lu on public.notifications(gestionnaire_id, lu);
create index idx_notifications_created_at on public.notifications(created_at desc);

alter table public.notifications enable row level security;

create policy "notifications du gestionnaire" on public.notifications
  for all using (auth.uid() = gestionnaire_id) with check (auth.uid() = gestionnaire_id);

-- ------------------------------------------------------------
-- Factures : lecture seule côté client. L'écriture (création,
-- changement de statut) est réservée au futur backoffice / à une
-- intervention manuelle via la clé service_role, qui contourne le RLS —
-- aucune policy insert/update/delete n'est créée ici.
-- ------------------------------------------------------------
create table public.factures (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null references public.profils(id) on delete cascade,
  numero text not null,
  montant numeric not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'payee', 'en_retard')),
  date_emission date not null default current_date,
  date_echeance date not null,
  pdf_chemin text, -- chemin dans le bucket Storage "factures"
  created_at timestamptz not null default now()
);

create index idx_factures_gestionnaire on public.factures(gestionnaire_id);

alter table public.factures enable row level security;

create policy "factures visibles par leur gestionnaire" on public.factures
  for select using (auth.uid() = gestionnaire_id);

-- ============================================================
-- Storage : bucket pour les PDF de factures
-- ============================================================
insert into storage.buckets (id, name, public)
values ('factures', 'factures', false)
on conflict (id) do nothing;

-- Même logique que le bucket audios-whatsapp : le premier segment du
-- chemin est le gestionnaire_id, la lecture est réservée à son
-- propriétaire. Pas de policy d'écriture côté client (upload réservé au
-- service_role / backoffice).
create policy "lecture des factures par leur propriétaire"
  on storage.objects for select
  using (
    bucket_id = 'factures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Triggers de notification
-- ============================================================

-- Nouvelle réponse 'support' sur un ticket -> notifie le gestionnaire
-- propriétaire du ticket.
create or replace function public.notifier_reponse_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gestionnaire_id uuid;
  v_titre_ticket text;
begin
  if new.auteur = 'support' then
    select gestionnaire_id, titre into v_gestionnaire_id, v_titre_ticket
    from public.tickets
    where id = new.ticket_id;

    if v_gestionnaire_id is not null then
      insert into public.notifications (gestionnaire_id, type, titre, message, lien)
      values (
        v_gestionnaire_id,
        'reponse_ticket',
        'Nouvelle réponse à votre ticket',
        v_titre_ticket,
        '/dashboard/tickets/' || new.ticket_id
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_reponse_ticket on public.ticket_messages;
create trigger trg_notifier_reponse_ticket
  after insert on public.ticket_messages
  for each row execute function public.notifier_reponse_ticket();

-- Ticket qui passe à 'resolu' -> notifie le gestionnaire.
create or replace function public.notifier_ticket_resolu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'resolu' and (old.statut is distinct from 'resolu') then
    insert into public.notifications (gestionnaire_id, type, titre, message, lien)
    values (
      new.gestionnaire_id,
      'ticket_resolu',
      'Ticket résolu',
      new.titre,
      '/dashboard/tickets/' || new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_ticket_resolu on public.tickets;
create trigger trg_notifier_ticket_resolu
  after update of statut on public.tickets
  for each row execute function public.notifier_ticket_resolu();

-- Automatisation qui passe à 'actif' (et qui ne l'était pas déjà) ->
-- notifie le gestionnaire.
create or replace function public.notifier_automatisation_activee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'actif' and (old.statut is distinct from 'actif') then
    insert into public.notifications (gestionnaire_id, type, titre, message, lien)
    values (
      new.gestionnaire_id,
      'automatisation_activee',
      'Automatisation activée',
      new.nom,
      '/dashboard/automatisations'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_automatisation_activee on public.automatisations;
create trigger trg_notifier_automatisation_activee
  after update of statut on public.automatisations
  for each row execute function public.notifier_automatisation_activee();

-- Ces fonctions ne doivent être invoquées que par les triggers ci-dessus
-- (voir migration_002 pour le même raisonnement) : EXECUTE est révoqué
-- pour empêcher leur appel direct via l'API REST/RPC. Supabase accorde
-- EXECUTE directement à anon/authenticated à la création d'une fonction
-- (privilèges par défaut), en plus de PUBLIC : il faut donc révoquer les
-- deux explicitement, PUBLIC seul ne suffit pas.
revoke execute on function public.notifier_reponse_ticket() from public, anon, authenticated;
revoke execute on function public.notifier_ticket_resolu() from public, anon, authenticated;
revoke execute on function public.notifier_automatisation_activee() from public, anon, authenticated;

-- Pas de trigger pour 'rappel_paiement' : dépend d'un cron à ajouter plus
-- tard (le type est déjà prévu dans le check ci-dessus).
