export type StatutPaiement = "a_jour" | "relance_j7" | "relance_j3" | "en_retard" | "resilie";
export type SantePaiement = "A" | "B" | "C" | "D";

export const STATUT_PAIEMENT_BADGE: Record<StatutPaiement, string> = {
  a_jour: "bg-succes-pastel text-succes-pastel-texte",
  relance_j7: "bg-attention-pastel text-attention-pastel-texte",
  relance_j3: "bg-erreur-pastel text-erreur-pastel-texte",
  en_retard: "bg-erreur text-white",
  resilie: "bg-bordure text-texte-secondaire",
};

export const STATUT_PAIEMENT_LABEL: Record<StatutPaiement, string> = {
  a_jour: "À jour",
  relance_j7: "Relance J-7",
  relance_j3: "Relance J-3",
  en_retard: "En retard",
  resilie: "Résilié",
};

export const SANTE_PAIEMENT_BADGE: Record<SantePaiement, string> = {
  A: "bg-succes-pastel text-succes-pastel-texte",
  B: "bg-neutre-pastel text-neutre-pastel-texte",
  C: "bg-attention-pastel text-attention-pastel-texte",
  D: "bg-erreur-pastel text-erreur-pastel-texte",
};

const JOUR_MS = 24 * 60 * 60 * 1000;

// Calcule le statut de paiement à afficher à partir de date_prochain_paiement
// — recalculé (et réécrit en base) à chaque chargement de
// /admin/facturation plutôt que via un cron (voir la page pour le
// write-back). 'resilie' est un état terminal manuel, jamais recalculé
// automatiquement à partir de la date.
export function calculerStatutPaiement(
  dateProchainPaiement: string,
  statutActuel: StatutPaiement
): StatutPaiement {
  if (statutActuel === "resilie") return "resilie";

  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const echeance = new Date(`${dateProchainPaiement}T00:00:00`);
  const joursRestants = Math.round((echeance.getTime() - aujourdHui.getTime()) / JOUR_MS);

  if (joursRestants < 0) return "en_retard";
  if (joursRestants <= 3) return "relance_j3";
  if (joursRestants <= 7) return "relance_j7";
  return "a_jour";
}

// Ajoute un mois à une date (YYYY-MM-DD) en clampant au dernier jour du
// mois cible si celui-ci a moins de jours (ex: 31 janvier + 1 mois -> 28/29
// février, pas le 3 mars que donnerait un setMonth() naïf).
export function ajouterUnMois(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const jour = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  if (d.getUTCDate() !== jour) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export function genererNumeroFacture(annee: number, sequence: number): string {
  return `FACT-${annee}-${String(sequence).padStart(3, "0")}`;
}

export function csvEchapper(valeur: string): string {
  if (/[",\n]/.test(valeur)) return `"${valeur.replace(/"/g, '""')}"`;
  return valeur;
}
