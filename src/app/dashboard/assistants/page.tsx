import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { AssistantsListe } from "./AssistantsListe";

export default async function AssistantsPage() {
  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const [{ data: automatisations }, { data: parametresCompte }] = await Promise.all([
    supabase
      .from("automatisations")
      .select("id, nom, numero_whatsapp, statut")
      .eq("gestionnaire_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("parametres_compte")
      .select("limite_assistants")
      .eq("gestionnaire_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-encre">Assistants WhatsApp</h1>

      <AssistantsListe
        assistants={(automatisations ?? []).map((a) => ({
          id: a.id,
          nom: a.nom,
          numeroWhatsapp: a.numero_whatsapp,
          statut: a.statut as "actif" | "inactif" | "erreur",
        }))}
        limiteAssistants={parametresCompte?.limite_assistants ?? 1}
      />
    </div>
  );
}
