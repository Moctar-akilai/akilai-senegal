import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { CompteForm } from "./CompteForm";
import { SecuriteForm } from "./SecuriteForm";
import { AssistantForm } from "./AssistantForm";

export default async function ParametresPage() {
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const [{ data: profil }, { data: parametresCompte }] = await Promise.all([
    supabase.from("profils").select("nom, telephone").eq("id", user.id).single(),
    supabase
      .from("parametres_compte")
      .select(
        "assistant_whatsapp_actif, numero_whatsapp, assistant_nom, assistant_prompt, assistant_ton, outil_faq_actif, outil_prise_rdv_actif, outil_transfert_humain_actif, outil_infos_pratiques_actif"
      )
      .eq("gestionnaire_id", user.id)
      .single(),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold text-neutral-900">Paramètres</h1>

      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-900">Mon compte</h2>
        <CompteForm
          userId={user.id}
          nomInitial={profil?.nom ?? ""}
          telephoneInitial={profil?.telephone ?? ""}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-900">Sécurité</h2>
        <SecuriteForm />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-900">Assistant WhatsApp</h2>
        {parametresCompte ? (
          <AssistantForm gestionnaireId={user.id} parametresInitiaux={parametresCompte} />
        ) : (
          <p className="text-sm text-neutral-500">
            Impossible de charger la configuration de l&apos;assistant.
          </p>
        )}
      </section>
    </div>
  );
}
