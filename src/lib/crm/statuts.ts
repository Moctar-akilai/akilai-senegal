export type StatutContact = "prospect" | "contacte" | "client" | "inactif";

export const STATUT_CONTACT_BADGE: Record<StatutContact, string> = {
  prospect: "bg-blue-50 text-blue-700",
  contacte: "bg-amber-100 text-amber-700",
  client: "bg-green-100 text-green-700",
  inactif: "bg-neutral-100 text-neutral-500",
};

export const STATUT_CONTACT_LABEL: Record<StatutContact, string> = {
  prospect: "Prospect",
  contacte: "Contacté",
  client: "Client",
  inactif: "Inactif",
};

export type PrioriteTicket = "basse" | "normale" | "haute" | "urgente";

export const PRIORITE_TICKET_BADGE: Record<PrioriteTicket, string> = {
  basse: "bg-neutral-100 text-neutral-600",
  normale: "bg-blue-50 text-blue-700",
  haute: "bg-amber-100 text-amber-700",
  urgente: "bg-red-100 text-red-700",
};

export const PRIORITE_TICKET_LABEL: Record<PrioriteTicket, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

export type StatutTicket = "ouvert" | "en_cours" | "resolu" | "ferme";

export const STATUT_TICKET_BADGE: Record<StatutTicket, string> = {
  ouvert: "bg-blue-50 text-blue-700",
  en_cours: "bg-amber-100 text-amber-700",
  resolu: "bg-green-100 text-green-700",
  ferme: "bg-neutral-100 text-neutral-500",
};

export const STATUT_TICKET_LABEL: Record<StatutTicket, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  ferme: "Fermé",
};
