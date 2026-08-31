export type StatutFacture = "en_attente" | "payee" | "en_retard";

export const STATUT_FACTURE_BADGE: Record<StatutFacture, string> = {
  en_attente: "bg-attention-pastel text-attention-pastel-texte",
  payee: "bg-succes-pastel text-succes-pastel-texte",
  en_retard: "bg-erreur-pastel text-erreur-pastel-texte",
};

export const STATUT_FACTURE_LABEL: Record<StatutFacture, string> = {
  en_attente: "En attente",
  payee: "Payée",
  en_retard: "En retard",
};
