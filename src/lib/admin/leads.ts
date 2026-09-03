export type StatutLead =
  | "prospect"
  | "contacte"
  | "demo_planifiee"
  | "proposition_envoyee"
  | "gagne"
  | "perdu";

// Ordre = ordre des colonnes du Kanban.
export const COLONNES_LEAD: { id: StatutLead; label: string }[] = [
  { id: "prospect", label: "Prospect" },
  { id: "contacte", label: "Contacté" },
  { id: "demo_planifiee", label: "Démo planifiée" },
  { id: "proposition_envoyee", label: "Proposition envoyée" },
  { id: "gagne", label: "Gagné" },
  { id: "perdu", label: "Perdu" },
];

export const STATUT_LEAD_LABEL = Object.fromEntries(
  COLONNES_LEAD.map((c) => [c.id, c.label])
) as Record<StatutLead, string>;

export const STATUTS_LEAD: StatutLead[] = COLONNES_LEAD.map((c) => c.id);

export type Lead = {
  id: string;
  nom: string;
  entreprise: string | null;
  telephone: string | null;
  email: string | null;
  statut: StatutLead;
  source: string | null;
  notes: string | null;
  raisonPerte: string | null;
  planEstime: string | null;
  gestionnaireIdConverti: string | null;
  createdAt: string;
};
