export type StatutFacture = "en_attente" | "payee" | "en_retard";

export const STATUT_FACTURE_BADGE: Record<StatutFacture, string> = {
  en_attente: "bg-amber-100 text-amber-700",
  payee: "bg-green-100 text-green-700",
  en_retard: "bg-red-100 text-red-700",
};

export const STATUT_FACTURE_LABEL: Record<StatutFacture, string> = {
  en_attente: "En attente",
  payee: "Payée",
  en_retard: "En retard",
};
