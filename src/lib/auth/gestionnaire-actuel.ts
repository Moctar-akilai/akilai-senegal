// ============================================================================
// ⚠️ CONTOURNEMENT TEMPORAIRE DE L'AUTHENTIFICATION — À RETIRER ⚠️
// ============================================================================
// Tant que src/middleware.ts laisse passer /dashboard/* sans vérifier de
// session (voir le commentaire en haut de ce fichier), il n'y a plus
// d'utilisateur Supabase authentifié disponible côté serveur. Les pages du
// dashboard qui appelaient `supabase.auth.getUser()` pour connaître le
// gestionnaire courant appellent maintenant getGestionnaireActuel() à la
// place, qui retourne un identifiant fixe codé en dur ci-dessous.
//
// Conséquence directe : auth.uid() est null côté base pour toute requête
// faite depuis un Server Component, puisqu'il n'y a pas de session Supabase
// réelle. Toutes les policies RLS de ce projet sont écrites comme
// `auth.uid() = gestionnaire_id` : avec le client anon (@/lib/supabase/server),
// ces policies bloquent donc silencieusement toute lecture — même avec un
// gestionnaire_id valide passé explicitement dans .eq(). C'est ce qui causait
// par exemple "Impossible de charger la configuration" sur
// /dashboard/whatsapp-ia. Toutes les pages du dashboard (hors
// src/app/dashboard/biens/*, legacy et non liées à la nav) utilisent donc
// createServiceClient() (@/lib/supabase/service, clé service_role, contourne
// le RLS) le temps du bypass, avec le filtrage par gestionnaire fait
// explicitement dans chaque requête (.eq("gestionnaire_id", ...)) plutôt que
// de compter sur RLS.
//
// Même piège côté écritures : les composants client (formulaires, toggles,
// création de ressources) ne peuvent pas non plus compter sur RLS sans
// session réelle. Comme la clé service_role ne doit jamais être exposée au
// navigateur, ils passent par src/app/api/dashboard/write/route.ts, une
// route API qui utilise createServiceClient() côté serveur avec
// gestionnaire_id venant de getGestionnaireActuel() (jamais une valeur
// fournie par le client). Voir le commentaire en haut de ce fichier de
// route pour le détail des actions couvertes.
//
// Pour réactiver l'authentification normale :
//   1. Dans src/middleware.ts, retirer le court-circuit et restaurer la
//      redirection vers /login pour les routes /dashboard/* sans session.
//   2. Dans chaque page du dashboard, remplacer l'appel à
//      getGestionnaireActuel() par le code d'origine :
//        const { data: { user } } = await supabase.auth.getUser();
//   3. Dans ces mêmes pages, remplacer createServiceClient()
//      (@/lib/supabase/service) par createClient() (@/lib/supabase/server) —
//      RLS redevient fiable une fois qu'une vraie session existe. Les
//      .eq("gestionnaire_id", ...) explicites peuvent rester : ils ne
//      changent rien de mal une fois RLS actif, en plus d'être une bonne
//      pratique de défense en profondeur.
//   4. Côté écritures, remplacer chaque appel à ecrireDashboard() par un
//      appel direct au client anon (@/lib/supabase/client) — ou mieux,
//      migrer vers des Server Actions / routes API classiques utilisant
//      auth.getUser() côté serveur — puis supprimer
//      src/app/api/dashboard/write/route.ts et src/lib/dashboard/ecrire.ts.
//   5. Supprimer ce fichier.
// ============================================================================

// ⚠️ UUID de test codé en dur — compte de test réel (Mohamed Diop),
// vérifié dans le projet Supabase "Akilai" : auth.users, public.profils
// et public.parametres_compte ont chacun une ligne pour cet UUID.
export const GESTIONNAIRE_ACTUEL_ID = "26e63c82-5b7b-427d-99d2-c1ee71656dd1";

export async function getGestionnaireActuel() {
  return { id: GESTIONNAIRE_ACTUEL_ID };
}
