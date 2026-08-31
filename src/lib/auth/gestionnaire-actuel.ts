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

// ⚠️ UUID de test codé en dur — AUCUN compte réel ne correspond à cet UUID
// pour l'instant (vérifié dans le projet Supabase "Akilai" : ni auth.users
// ni public.profils n'ont de ligne). Remplacer par l'UUID d'un vrai compte
// (auth.users.id / profils.id) une fois celui-ci créé.
export const GESTIONNAIRE_ACTUEL_ID = "00000000-0000-0000-0000-000000000000";

export async function getGestionnaireActuel() {
  return { id: GESTIONNAIRE_ACTUEL_ID };
}
