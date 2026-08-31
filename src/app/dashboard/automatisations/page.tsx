import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { AutomatisationCard, type LogMessage } from "./AutomatisationCard";

const NB_LOGS = 10;

export default async function AutomatisationsPage() {
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const { data: automatisations } = await supabase
    .from("automatisations")
    .select("id, nom, type, statut, description")
    .eq("gestionnaire_id", user.id)
    .order("created_at", { ascending: true });

  // Les logs proviennent de conversations_whatsapp, qui n'est pas liée à
  // une automatisation précise (pas de colonne automatisation_id) : on ne
  // peut les rattacher qu'aux automatisations de type "whatsapp", seule
  // source de messages disponible pour l'instant.
  const logsParAutomatisation = new Map<string, LogMessage[]>();
  for (const auto of automatisations ?? []) {
    if (auto.type !== "whatsapp") continue;
    const { data: messages } = await supabase
      .from("conversations_whatsapp")
      .select("id, direction, contenu, created_at, contacts(nom, telephone)")
      .eq("gestionnaire_id", user.id)
      .order("created_at", { ascending: false })
      .limit(NB_LOGS);

    logsParAutomatisation.set(
      auto.id,
      (messages ?? []).map((m) => {
        const contact = Array.isArray(m.contacts) ? m.contacts[0] : m.contacts;
        return {
          id: m.id,
          direction: m.direction,
          contenu: m.contenu,
          created_at: m.created_at,
          contactNom: contact?.nom ?? null,
          contactTelephone: contact?.telephone ?? "",
        };
      })
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Automatisations</h1>

      {(!automatisations || automatisations.length === 0) && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Aucune automatisation pour l&apos;instant.
        </div>
      )}

      <div className="space-y-4">
        {(automatisations ?? []).map((auto) => (
          <AutomatisationCard
            key={auto.id}
            id={auto.id}
            nom={auto.nom}
            description={auto.description}
            statutInitial={auto.statut as "actif" | "inactif" | "erreur"}
            logs={logsParAutomatisation.get(auto.id) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
