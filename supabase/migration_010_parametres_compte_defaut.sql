-- ============================================================
-- Migration 010 — parametres_compte créé automatiquement
-- AkilAI Sénégal
--
-- À jouer après migration_009_plan_compte.sql.
-- Comme pour l'automatisation "Assistant WhatsApp" (migration_002), crée
-- automatiquement une ligne parametres_compte (valeurs par défaut du
-- schéma) à l'insertion d'un profil, pour éviter d'avoir à l'insérer
-- manuellement à chaque nouveau client. numero_whatsapp reste null et
-- doit toujours être renseigné manuellement ensuite pour ce client.
-- ============================================================

create or replace function public.creer_parametres_compte_par_defaut()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.parametres_compte (gestionnaire_id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists trg_creer_parametres_compte_par_defaut on public.profils;
create trigger trg_creer_parametres_compte_par_defaut
  after insert on public.profils
  for each row execute function public.creer_parametres_compte_par_defaut();

-- Même piège de permissions que les fonctions trigger de migration_002/007 :
-- EXECUTE est accordé à PUBLIC ET DIRECTEMENT à anon/authenticated par
-- défaut à la création (confirmé via has_function_privilege() après coup,
-- pas seulement via l'advisor Supabase) — revoke from public seul ne
-- suffit pas, il faut aussi révoquer explicitement sur les deux rôles.
revoke execute on function public.creer_parametres_compte_par_defaut() from public;
revoke execute on function public.creer_parametres_compte_par_defaut() from anon, authenticated;

-- Backfill : crée parametres_compte pour tout profil existant qui n'en a
-- pas encore une. Idempotent.
insert into public.parametres_compte (gestionnaire_id)
select p.id
from public.profils p
where not exists (
  select 1 from public.parametres_compte pc where pc.gestionnaire_id = p.id
);
