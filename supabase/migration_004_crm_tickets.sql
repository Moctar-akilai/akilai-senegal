-- ============================================================
-- Migration 004 — CRM & Tickets
-- AkilAI Sénégal
--
-- À jouer après migration_003_integrations.sql.
-- ============================================================

-- ------------------------------------------------------------
-- contacts : extension pour le CRM
-- ------------------------------------------------------------
alter table public.contacts
  add column if not exists statut text not null default 'prospect'
    check (statut in ('prospect', 'contacte', 'client', 'inactif')),
  add column if not exists notes text,
  add column if not exists email text;

-- ------------------------------------------------------------
-- Tickets
-- ------------------------------------------------------------
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  gestionnaire_id uuid not null references public.profils(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  automatisation_id uuid references public.automatisations(id) on delete set null,
  titre text not null,
  description text,
  priorite text not null default 'normale' check (priorite in ('basse', 'normale', 'haute', 'urgente')),
  statut text not null default 'ouvert' check (statut in ('ouvert', 'en_cours', 'resolu', 'ferme')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tickets_gestionnaire on public.tickets(gestionnaire_id);
create index idx_tickets_contact on public.tickets(contact_id);
create index idx_tickets_statut on public.tickets(statut);

alter table public.tickets enable row level security;

create policy "tickets du gestionnaire" on public.tickets
  for all using (auth.uid() = gestionnaire_id) with check (auth.uid() = gestionnaire_id);

-- ------------------------------------------------------------
-- Messages internes d'un ticket
-- ------------------------------------------------------------
create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  auteur text not null check (auteur in ('gestionnaire', 'contact')),
  contenu text not null,
  created_at timestamptz not null default now()
);

create index idx_ticket_messages_ticket on public.ticket_messages(ticket_id);

alter table public.ticket_messages enable row level security;

create policy "messages via ticket du gestionnaire" on public.ticket_messages
  for all using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.gestionnaire_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.gestionnaire_id = auth.uid()
    )
  );
