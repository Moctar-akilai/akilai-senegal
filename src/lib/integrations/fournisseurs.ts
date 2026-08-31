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

// "cle_api" : connexion par clé API, gérée par ConnexionCleApiModal +
// /api/integrations/connecter. "oauth_bientot" : nécessite un vrai flux
// OAuth pas encore implémenté, garde la modale "Bientôt disponible".
export type MethodeConnexion = "cle_api" | "oauth_bientot";

type DefinitionFournisseur = {
  id: Fournisseur;
  nom: string;
  initiales: string;
  // Chemin attendu dans public/logos/ (voir README de ce dossier). Si le
  // fichier n'existe pas, IntegrationCard retombe automatiquement sur le
  // badge à initiales (onError sur l'<img>) — aucun changement de code
  // n'est nécessaire quand le vrai logo est ajouté plus tard, il suffit de
  // déposer le fichier au bon chemin.
  logo: string;
  methode: MethodeConnexion;
  // Texte + lien affichés dans la modale de connexion par clé API, propres
  // à chaque fournisseur compatible.
  aide?: { texte: string; url: string };
};

type Categorie = {
  titre: string;
  fournisseurs: DefinitionFournisseur[];
};

export const CATEGORIES_INTEGRATIONS: Categorie[] = [
  {
    titre: "Agenda & RDV",
    fournisseurs: [
      {
        id: "google_calendar",
        nom: "Google Calendar",
        initiales: "GC",
        logo: "/logos/google-calendar.png",
        methode: "oauth_bientot",
      },
      {
        id: "calendly",
        nom: "Calendly",
        initiales: "CA",
        logo: "/logos/calendly.png",
        methode: "oauth_bientot",
      },
    ],
  },
  {
    titre: "Données & CRM",
    fournisseurs: [
      {
        id: "crm_akilai",
        nom: "CRM AkilAI",
        initiales: "AI",
        logo: "/logos/crm-akilai.png",
        methode: "cle_api",
        aide: {
          texte: "Où trouver ma clé API CRM AkilAI",
          url: "https://akilai.example.com/docs/api-keys",
        },
      },
      {
        id: "hubspot",
        nom: "HubSpot",
        initiales: "HS",
        logo: "/logos/hubspot.png",
        methode: "cle_api",
        aide: {
          texte: "Où trouver ma clé API HubSpot",
          url: "https://developers.hubspot.com/docs/api/private-apps",
        },
      },
      {
        id: "shopify",
        nom: "Shopify",
        initiales: "SH",
        logo: "/logos/shopify.png",
        methode: "cle_api",
        aide: {
          texte: "Où trouver ma clé API Shopify",
          url: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
        },
      },
      {
        id: "notion",
        nom: "Notion",
        initiales: "NO",
        logo: "/logos/notion.png",
        methode: "cle_api",
        aide: {
          texte: "Où trouver ma clé API Notion",
          url: "https://www.notion.so/my-integrations",
        },
      },
      {
        id: "airtable",
        nom: "Airtable",
        initiales: "AT",
        logo: "/logos/airtable.png",
        methode: "cle_api",
        aide: {
          texte: "Où trouver ma clé API Airtable",
          url: "https://airtable.com/create/tokens",
        },
      },
    ],
  },
  {
    titre: "Tableurs",
    fournisseurs: [
      {
        id: "google_sheets",
        nom: "Google Sheets",
        initiales: "GS",
        logo: "/logos/google-sheets.png",
        methode: "cle_api",
        aide: {
          texte: "Où trouver ma clé de compte de service Google Sheets",
          url: "https://developers.google.com/workspace/sheets/api/guides/authorizing",
        },
      },
      {
        id: "excel",
        nom: "Excel",
        initiales: "XL",
        logo: "/logos/excel.png",
        methode: "oauth_bientot",
      },
    ],
  },
  {
    titre: "Communication",
    fournisseurs: [
      {
        id: "slack",
        nom: "Slack",
        initiales: "SL",
        logo: "/logos/slack.png",
        methode: "oauth_bientot",
      },
      {
        id: "teams",
        nom: "Teams",
        initiales: "TE",
        logo: "/logos/teams.png",
        methode: "oauth_bientot",
      },
      {
        id: "outlook",
        nom: "Outlook",
        initiales: "OU",
        logo: "/logos/outlook.png",
        methode: "oauth_bientot",
      },
    ],
  },
  {
    titre: "Email Marketing",
    fournisseurs: [
      {
        id: "brevo",
        nom: "Brevo",
        initiales: "BR",
        logo: "/logos/brevo.png",
        methode: "cle_api",
        aide: {
          texte: "Où trouver ma clé API Brevo",
          url: "https://app.brevo.com/settings/keys/api",
        },
      },
      {
        id: "resend",
        nom: "Resend",
        initiales: "RE",
        logo: "/logos/resend.png",
        methode: "cle_api",
        aide: {
          texte: "Où trouver ma clé API Resend",
          url: "https://resend.com/api-keys",
        },
      },
    ],
  },
];

export const TOUS_LES_FOURNISSEURS: DefinitionFournisseur[] = CATEGORIES_INTEGRATIONS.flatMap(
  (c) => c.fournisseurs
);

export function nomFournisseur(id: Fournisseur): string {
  return TOUS_LES_FOURNISSEURS.find((f) => f.id === id)?.nom ?? id;
}

export function definitionFournisseur(id: Fournisseur): DefinitionFournisseur | undefined {
  return TOUS_LES_FOURNISSEURS.find((f) => f.id === id);
}

export const FOURNISSEURS_CLE_API: Fournisseur[] = TOUS_LES_FOURNISSEURS.filter(
  (f) => f.methode === "cle_api"
).map((f) => f.id);
