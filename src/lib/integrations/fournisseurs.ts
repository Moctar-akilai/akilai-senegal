export type Fournisseur =
  | "google_calendar"
  | "calendly"
  | "crm_akilai"
  | "hubspot"
  | "shopify"
  | "notion"
  | "airtable"
  | "google_sheets"
  | "excel"
  | "slack"
  | "teams"
  | "outlook"
  | "brevo"
  | "resend";

export type StatutIntegration = "non_connecte" | "connecte" | "erreur";

type DefinitionFournisseur = {
  id: Fournisseur;
  nom: string;
  initiales: string;
};

type Categorie = {
  titre: string;
  fournisseurs: DefinitionFournisseur[];
};

export const CATEGORIES_INTEGRATIONS: Categorie[] = [
  {
    titre: "Agenda & RDV",
    fournisseurs: [
      { id: "google_calendar", nom: "Google Calendar", initiales: "GC" },
      { id: "calendly", nom: "Calendly", initiales: "CA" },
    ],
  },
  {
    titre: "Données & CRM",
    fournisseurs: [
      { id: "crm_akilai", nom: "CRM AkilAI", initiales: "AI" },
      { id: "hubspot", nom: "HubSpot", initiales: "HS" },
      { id: "shopify", nom: "Shopify", initiales: "SH" },
      { id: "notion", nom: "Notion", initiales: "NO" },
      { id: "airtable", nom: "Airtable", initiales: "AT" },
    ],
  },
  {
    titre: "Tableurs",
    fournisseurs: [
      { id: "google_sheets", nom: "Google Sheets", initiales: "GS" },
      { id: "excel", nom: "Excel", initiales: "XL" },
    ],
  },
  {
    titre: "Communication",
    fournisseurs: [
      { id: "slack", nom: "Slack", initiales: "SL" },
      { id: "teams", nom: "Teams", initiales: "TE" },
      { id: "outlook", nom: "Outlook", initiales: "OU" },
    ],
  },
  {
    titre: "Email Marketing",
    fournisseurs: [
      { id: "brevo", nom: "Brevo", initiales: "BR" },
      { id: "resend", nom: "Resend", initiales: "RE" },
    ],
  },
];

export const TOUS_LES_FOURNISSEURS: DefinitionFournisseur[] = CATEGORIES_INTEGRATIONS.flatMap(
  (c) => c.fournisseurs
);

export function nomFournisseur(id: Fournisseur): string {
  return TOUS_LES_FOURNISSEURS.find((f) => f.id === id)?.nom ?? id;
}
