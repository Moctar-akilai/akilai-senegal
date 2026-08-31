import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { AgendaView } from "./AgendaView";

export default async function AgendaPage() {
  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
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
