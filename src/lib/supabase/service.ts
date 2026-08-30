import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client avec la clé service_role : contourne le RLS.
// Réservé aux tâches serveur qui doivent traiter les données de tous les
// gestionnaires (ex : cron de relances). Ne jamais exposer côté client.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
