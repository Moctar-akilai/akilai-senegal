import { createClient } from "@/lib/supabase/server";

// Résout le gestionnaire actuellement authentifié à partir de la session
// Supabase (cookies lus par @/lib/supabase/server). Utilisée par toutes
// les pages et routes API du dashboard comme source unique du
// gestionnaire courant.
//
// Les pages du dashboard sont protégées en amont par src/middleware.ts
// (redirection vers /login si aucune session), donc ce cas ne devrait
// normalement jamais se produire depuis une page — cette vérification
// protège malgré tout un appel direct à une route API sans session.
export async function getGestionnaireActuel() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Aucun utilisateur authentifié.");
  }

  return { id: user.id };
}
