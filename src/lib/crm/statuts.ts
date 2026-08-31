export type StatutContact = "prospect" | "contacte" | "client" | "inactif";

export const STATUT_CONTACT_BADGE: Record<StatutContact, string> = {
  prospect: "bg-neutre-pastel text-neutre-pastel-texte",
  contacte: "bg-attention-pastel text-attention-pastel-texte",
  client: "bg-succes-pastel text-succes-pastel-texte",
  inactif: "bg-bordure text-texte-secondaire",
};

export const STATUT_CONTACT_LABEL: Record<StatutContact, string> = {
  prospect: "Prospect",
  contacte: "Contacté",
  client: "Client",
  inactif: "Inactif",
};

export type PrioriteTicket = "basse" | "normale" | "haute" | "urgente";

export const PRIORITE_TICKET_BADGE: Record<PrioriteTicket, string> = {
  basse: "bg-bordure text-texte-secondaire",
  normale: "bg-neutre-pastel text-neutre-pastel-texte",
  haute: "bg-attention-pastel text-attention-pastel-texte",
  urgente: "bg-erreur-pastel text-erreur-pastel-texte",
};

export const PRIORITE_TICKET_LABEL: Record<PrioriteTicket, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

export type StatutTicket = "ouvert" | "en_cours" | "resolu" | "ferme";

export const STATUT_TICKET_BADGE: Record<StatutTicket, string> = {
  ouvert: "bg-neutre-pastel text-neutre-pastel-texte",
  en_cours: "bg-attention-pastel text-attention-pastel-texte",
  resolu: "bg-succes-pastel text-succes-pastel-texte",
  ferme: "bg-bordure text-texte-secondaire",
};

export const STATUT_TICKET_LABEL: Record<StatutTicket, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  ferme: "Fermé",
};
