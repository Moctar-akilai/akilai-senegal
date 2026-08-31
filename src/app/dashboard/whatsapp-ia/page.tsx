import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { WhatsappIAForm } from "./WhatsappIAForm";

export default async function WhatsappIAPage() {
  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts. C'était la
  // cause du bug "Impossible de charger la configuration" : avec le client
  // anon, auth.uid() est null tant que le bypass est actif, donc RLS
  // bloquait cette lecture même si la ligne existait.
  const supabase = createServiceClient();
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
