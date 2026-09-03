// Grille tarifaire réelle (FCFA/mois). Les noms doivent correspondre
// exactement aux valeurs autorisées par la contrainte CHECK sur
// parametres_compte.plan (migration_014) — sinon le MRR estimé ignore
// silencieusement les clients dont le plan ne matche aucune clé ici.
// Le nombre d'échanges inclus est noté pour référence mais n'est pas
// encore exploité : aucun suivi de consommation par quota n'existe côté
// AkilAI, seul le prix sert au calcul du MRR estimé.
export const PRIX_PLANS: Record<string, number> = {
  Essentiel: 15000, // 300 échanges inclus
  Croissance: 20000, // 600 échanges inclus
  Pro: 30000, // 1 200 échanges inclus
};
