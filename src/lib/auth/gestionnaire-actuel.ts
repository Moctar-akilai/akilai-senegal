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
// Pour réactiver l'authentification normale :
//   1. Dans src/middleware.ts, retirer le court-circuit et restaurer la
//      redirection vers /login pour les routes /dashboard/* sans session.
//   2. Dans chaque page du dashboard, remplacer l'appel à
//      getGestionnaireActuel() par le code d'origine :
//        const { data: { user } } = await supabase.auth.getUser();
//   3. Supprimer ce fichier.
// ============================================================================

// ⚠️ UUID de test codé en dur — compte de test réel (Mohamed Diop),
// vérifié dans le projet Supabase "Akilai" : auth.users, public.profils
// et public.parametres_compte ont chacun une ligne pour cet UUID.
export const GESTIONNAIRE_ACTUEL_ID = "26e63c82-5b7b-427d-99d2-c1ee71656dd1";

export async function getGestionnaireActuel() {
  return { id: GESTIONNAIRE_ACTUEL_ID };
}
