import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { ProgrammationForm } from "./ProgrammationForm";

export default async function ProgrammationPage() {
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const { data: automatisations } = await supabase
    .from("automatisations")
    .select("id, nom")
    .eq("gestionnaire_id", user.id)
    .order("created_at", { ascending: true });

  const ids = (automatisations ?? []).map((a) => a.id);
  const { data: programmations } =
    ids.length > 0
      ? await supabase
          .from("programmations")
          .select("automatisation_id, jours_actifs, heure_debut, heure_fin, actif")
          .in("automatisation_id", ids)
      : { data: [] };

  const programmationsParAutomatisation = Object.fromEntries(
    (programmations ?? []).map((p) => [
      p.automatisation_id,
      {
        jours_actifs: p.jours_actifs,
        heure_debut: p.heure_debut,
        heure_fin: p.heure_fin,
        actif: p.actif,
      },
    ])
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Programmation</h1>
      <ProgrammationForm
        automatisations={automatisations ?? []}
        programmationsParAutomatisation={programmationsParAutomatisation}
      />
    </div>
  );
}
