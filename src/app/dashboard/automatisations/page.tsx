import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { AutomatisationCard } from "./AutomatisationCard";

export default async function AutomatisationsPage() {
  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const [{ data: automatisations }, { data: parametresCompte }] = await Promise.all([
    supabase
      .from("automatisations")
      .select("id, nom, type, statut")
      .eq("gestionnaire_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("parametres_compte")
      .select("assistant_nom")
      .eq("gestionnaire_id", user.id)
      .maybeSingle(),
  ]);

  // L'automatisation "Assistant WhatsApp" affiche le nom configuré par le
  // gestionnaire (parametres_compte.assistant_nom) plutôt que son nom
  // générique en base, avec "Assistant" en repli si non renseigné.
  const nomAssistant = parametresCompte?.assistant_nom?.trim() || "Assistant";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-encre">Automatisations</h1>

      {(!automatisations || automatisations.length === 0) && (
        <div className="rounded-lg border border-dashed border-bordure p-8 text-center text-sm text-texte-secondaire">
          Aucune automatisation pour l&apos;instant.
        </div>
      )}

      <div className="space-y-4">
        {(automatisations ?? []).map((auto) => (
          <AutomatisationCard
            key={auto.id}
            id={auto.id}
            nom={auto.type === "whatsapp" ? nomAssistant : auto.nom}
            statutInitial={auto.statut as "actif" | "inactif" | "erreur"}
          />
        ))}
      </div>
    </div>
  );
}
