import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import {
  CATEGORIES_INTEGRATIONS,
  FOURNISSEURS_CRM_EXTERNES,
  type CrmActif,
  type StatutIntegration,
} from "@/lib/integrations/fournisseurs";
import { dechiffrerCleApi, apercuMasqueCleApi } from "@/lib/integrations/chiffrement";
import { IntegrationCard } from "./IntegrationCard";
import { CrmAkilaiCard } from "./CrmAkilaiCard";
import { LogoAvecRepli } from "./LogoAvecRepli";

type LigneIntegration = {
  statut: StatutIntegration;
  apercu: string | null;
  messageErreur: string | null;
};

export default async function IntegrationsPage() {
  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const [{ data: integrations }, { data: parametresCompte }] = await Promise.all([
    supabase
      .from("integrations")
      .select("fournisseur, statut, cle_api_chiffree, message_erreur")
      .eq("gestionnaire_id", user.id),
    supabase.from("parametres_compte").select("crm_actif").eq("gestionnaire_id", user.id).maybeSingle(),
  ]);

  const crmActif = (parametresCompte?.crm_actif ?? "crm_akilai") as CrmActif;

  // L'aperçu masqué est calculé ici, côté serveur (Server Component) : la
  // clé n'est déchiffrée que le temps de produire un aperçu tronqué, jamais
  // envoyée en clair au navigateur. Les lignes sans cle_api_chiffree
  // (ex. celles créées par le bascule "dev") n'ont simplement pas d'aperçu.
  const donneesParFournisseur = new Map<string, LigneIntegration>();
  for (const i of integrations ?? []) {
    let apercu: string | null = null;
    if (i.cle_api_chiffree) {
      try {
        apercu = apercuMasqueCleApi(dechiffrerCleApi(i.cle_api_chiffree));
      } catch (erreur) {
        console.error(
          "[integrations] Échec du déchiffrement pour fournisseur=",
          i.fournisseur,
          ":",
          erreur
        );
      }
    }
    donneesParFournisseur.set(i.fournisseur, {
      statut: i.statut as StatutIntegration,
      apercu,
      messageErreur: i.message_erreur,
    });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-neutral-900">Intégrations</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Inclus
        </h2>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex min-w-0 items-center gap-3">
            <LogoAvecRepli
              src="/logos/whatsapp.png"
              initiales="WA"
              repliClassName="bg-green-100 text-green-700"
            />
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
            {categorie.fournisseurs.map((f) => {
              if (f.id === "crm_akilai") {
                return <CrmAkilaiCard key={f.id} estActifInitial={crmActif === "crm_akilai"} />;
              }
              const donnees = donneesParFournisseur.get(f.id);
              return (
                <IntegrationCard
                  key={f.id}
                  fournisseur={f.id}
                  nom={f.nom}
                  initiales={f.initiales}
                  logo={f.logo}
                  methode={f.methode}
                  aide={f.aide}
                  statutInitial={donnees?.statut ?? "non_connecte"}
                  apercuInitial={donnees?.apercu ?? null}
                  messageErreurInitial={donnees?.messageErreur ?? null}
                  peutEtreCrm={FOURNISSEURS_CRM_EXTERNES.includes(f.id)}
                  estCrmActifInitial={crmActif === f.id}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
