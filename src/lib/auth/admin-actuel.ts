import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "./gestionnaire-actuel";

// Résout l'admin actuellement authentifié : session valide (via
// getGestionnaireActuel()) ET profils.est_admin = true. Utilisée par toutes
// les pages/routes du backoffice (/admin/*), en plus de la vérification déjà
// faite par le middleware — défense en profondeur si jamais une route est
// appelée directement sans passer par lui.
export async function getAdminActuel() {
  const user = await getGestionnaireActuel();

  const supabase = createServiceClient();
  const { data: profil } = await supabase
    .from("profils")
    .select("id, nom, est_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profil?.est_admin) {
    throw new Error("Accès admin refusé.");
  }

  return { id: profil.id as string, nom: profil.nom as string };
}
