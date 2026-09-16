import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { estGoogleCalendarConnecte } from "@/lib/integrations/statut";
import { AssistantConfigForm } from "./AssistantConfigForm";

export default async function AssistantConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const [{ data: automatisation }, googleCalendarConnecte] = await Promise.all([
    supabase
      .from("automatisations")
      .select(
        "id, nom, langue, prompt, ton, numero_whatsapp, outil_faq_actif, outil_prise_rdv_actif, outil_transfert_humain_actif, outil_infos_pratiques_actif"
      )
      .eq("id", id)
      .eq("gestionnaire_id", user.id)
      .maybeSingle(),
    estGoogleCalendarConnecte(supabase, user.id),
  ]);

  if (!automatisation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/assistants" className="text-sm text-texte-secondaire hover:text-encre">
          ← Assistants
        </Link>
      </div>

      <h1 className="font-display text-2xl font-semibold text-encre">{automatisation.nom}</h1>

      <AssistantConfigForm
        assistantId={automatisation.id}
        googleCalendarConnecte={googleCalendarConnecte}
        parametresInitiaux={{
          nom: automatisation.nom,
          langue: automatisation.langue,
          prompt: automatisation.prompt,
          ton: automatisation.ton as "professionnel" | "amical" | "decontracte",
          numeroWhatsapp: automatisation.numero_whatsapp,
          outil_faq_actif: automatisation.outil_faq_actif,
          outil_prise_rdv_actif: automatisation.outil_prise_rdv_actif,
          outil_transfert_humain_actif: automatisation.outil_transfert_humain_actif,
          outil_infos_pratiques_actif: automatisation.outil_infos_pratiques_actif,
        }}
      />
    </div>
  );
}
