import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { WhatsappIAForm } from "./WhatsappIAForm";

export default async function WhatsappIAPage() {
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const { data: parametresCompte } = await supabase
    .from("parametres_compte")
    .select(
      "numero_whatsapp, assistant_nom, langue, assistant_prompt, assistant_ton, outil_faq_actif, outil_prise_rdv_actif, outil_transfert_humain_actif, outil_infos_pratiques_actif"
    )
    .eq("gestionnaire_id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">WhatsApp & IA</h1>

      {parametresCompte ? (
        <WhatsappIAForm
          gestionnaireId={user.id}
          numeroWhatsapp={parametresCompte.numero_whatsapp}
          parametresInitiaux={{
            assistant_nom: parametresCompte.assistant_nom,
            langue: parametresCompte.langue,
            assistant_prompt: parametresCompte.assistant_prompt,
            assistant_ton: parametresCompte.assistant_ton,
            outil_faq_actif: parametresCompte.outil_faq_actif,
            outil_prise_rdv_actif: parametresCompte.outil_prise_rdv_actif,
            outil_transfert_humain_actif: parametresCompte.outil_transfert_humain_actif,
            outil_infos_pratiques_actif: parametresCompte.outil_infos_pratiques_actif,
          }}
        />
      ) : (
        <p className="text-sm text-neutral-500">
          Impossible de charger la configuration de l&apos;assistant.
        </p>
      )}
    </div>
  );
}
