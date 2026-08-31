import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { CATEGORIES_INTEGRATIONS, type StatutIntegration } from "@/lib/integrations/fournisseurs";
import { IntegrationCard } from "./IntegrationCard";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const { data: integrations } = await supabase
    .from("integrations")
    .select("fournisseur, statut")
    .eq("gestionnaire_id", user.id);

  const statutParFournisseur = new Map<string, StatutIntegration>(
    (integrations ?? []).map((i) => [i.fournisseur, i.statut as StatutIntegration])
  );

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-neutral-900">Intégrations</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Inclus
        </h2>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
              WA
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">WhatsApp</p>
              <p className="text-xs text-neutral-500">Canal natif de la plateforme</p>
            </div>
          </div>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Actif
          </span>
        </div>
      </section>

      {CATEGORIES_INTEGRATIONS.map((categorie) => (
        <section key={categorie.titre}>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
            {categorie.titre}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {categorie.fournisseurs.map((f) => (
              <IntegrationCard
                key={f.id}
                gestionnaireId={user.id}
                fournisseur={f.id}
                nom={f.nom}
                initiales={f.initiales}
                statutInitial={statutParFournisseur.get(f.id) ?? "non_connecte"}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
