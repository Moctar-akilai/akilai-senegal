import type { createServiceClient } from "@/lib/supabase/service";

// Petit helper partagé (webhook WhatsApp + page whatsapp-ia) : est-ce que
// Google Calendar est connecté et utilisable pour ce gestionnaire ?
export async function estGoogleCalendarConnecte(
  supabase: ReturnType<typeof createServiceClient>,
  gestionnaireId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("integrations")
    .select("statut")
    .eq("gestionnaire_id", gestionnaireId)
    .eq("fournisseur", "google_calendar")
    .maybeSingle();
  return data?.statut === "connecte";
}
