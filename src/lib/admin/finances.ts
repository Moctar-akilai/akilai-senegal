export const POSTES_INFRA = ["vercel", "supabase", "claude", "openai", "twilio", "autres"] as const;
export type PosteInfra = (typeof POSTES_INFRA)[number];

export const POSTE_INFRA_LABEL: Record<PosteInfra, string> = {
  vercel: "Vercel",
  supabase: "Supabase",
  claude: "Claude",
  openai: "OpenAI",
  twilio: "Twilio",
  autres: "Autres",
};

// Coût variable estimé par message WhatsApp échangé (FCFA) — approximation
// utilisée pour la marge par client (§3), pas une vraie mesure de coût API
// par message.
export const COUT_PAR_ECHANGE = 12;

// Durée de vie par défaut (mois) utilisée pour le LTV tant qu'il n'y a pas
// assez de résiliations réelles pour calculer une vraie moyenne.
export const DUREE_VIE_DEFAUT_MOIS = 12;

// Nombre minimum de résiliations avant de faire confiance à une durée de
// vie moyenne calculée plutôt qu'au défaut ci-dessus.
export const SEUIL_RESILIATIONS_POUR_MOYENNE = 3;

export type StatutPaiementAbonnement = "a_jour" | "relance_j7" | "relance_j3" | "en_retard" | "resilie";

export type AbonnementCalcul = {
  gestionnaireId: string;
  montantMensuel: number;
  dateSignature: string; // date (YYYY-MM-DD)
  statutPaiement: StatutPaiementAbonnement;
  updatedAt: string; // timestamptz ISO
};

export function premierJourDuMois(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function premierJourDuMoisISO(date: Date): string {
  return premierJourDuMois(date).toISOString().slice(0, 10);
}

// Plage [début, fin] du mois situé `offsetMois` mois avant aujourd'hui
// (0 = mois en cours, 1 = mois précédent, etc.), fin incluse en toute fin
// de journée du dernier jour du mois.
export function plageMois(offsetMois: number, reference: Date = new Date()) {
  const debut = new Date(reference.getFullYear(), reference.getMonth() - offsetMois, 1);
  const fin = new Date(reference.getFullYear(), reference.getMonth() - offsetMois + 1, 0, 23, 59, 59, 999);
  return { debut, fin };
}

export function formatMoisLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

// Reconstruction approximative de l'historique : aucune table ne garde un
// vrai journal des changements de statut_paiement, donc "actif en mois M"
// est déduit de l'état ACTUEL de l'abonnement + updated_at comme proxy de
// la date de résiliation (mis à jour précisément à ce moment-là par
// l'action abonnement.resilier). Un abonnement résilié compte encore comme
// actif pour le mois où la résiliation a eu lieu, plus pour tous les mois
// précédents. Approximation raisonnable en l'absence d'historique, mais
// pas un vrai ledger — un abonnement résilié PUIS un montant modifié après
// coup fausserait légèrement le mois de bascule (edge case rare en
// pratique, updated_at ne bouge plus après une résiliation).
export function etaitActifEnMois(a: AbonnementCalcul, debutMois: Date, finMois: Date): boolean {
  const signature = new Date(a.dateSignature);
  if (signature > finMois) return false;
  if (a.statutPaiement !== "resilie") return true;
  return new Date(a.updatedAt) >= debutMois;
}

// Variante "au tout début du mois" (pour le dénominateur du churn) : un
// abonnement signé pendant le mois lui-même n'était pas encore actif à son
// ouverture.
export function etaitActifAuDebutDuMois(a: AbonnementCalcul, debutMois: Date): boolean {
  const signature = new Date(a.dateSignature);
  if (signature >= debutMois) return false;
  if (a.statutPaiement !== "resilie") return true;
  return new Date(a.updatedAt) >= debutMois;
}
