import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { AgendaView } from "./AgendaView";

export default async function AgendaPage() {
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const { data: integrations } = await supabase
    .from("integrations")
    .select("fournisseur, statut")
    .eq("gestionnaire_id", user.id)
    .in("fournisseur", ["google_calendar", "calendly"])
    .eq("statut", "connecte");

  const integrationConnectee = (integrations ?? []).length > 0;

  return <AgendaView integrationConnectee={integrationConnectee} />;
}
