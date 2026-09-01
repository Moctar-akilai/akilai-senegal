import type { MappingIntegration } from "./fournisseurs";

// Client minimal pour l'API Notion (lecture seule) — utilisé pour la
// configuration de la base (liste des propriétés) et la lecture en direct
// du CRM (src/app/dashboard/crm/page.tsx et crm/[id]/page.tsx). Jamais de
// clé en clair transmise au navigateur : ces fonctions ne doivent être
// appelées que côté serveur, avec la clé déjà déchiffrée
// (@/lib/integrations/chiffrement).
const NOTION_VERSION = "2022-06-28";
const TIMEOUT_MS = 10000;
const MAX_PAGES = 500; // garde-fou : au plus 5 requêtes de 100 lignes

export type ProprieteNotion = { nom: string; type: string };

export type ValeurProprieteNotion = {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  phone_number?: string | null;
  email?: string | null;
  select?: { name: string } | null;
  status?: { name: string } | null;
};

export type PageNotion = {
  id: string;
  last_edited_time?: string;
  properties: Record<string, ValeurProprieteNotion>;
};

async function appelNotion(url: string, cleApi: string, init?: RequestInit): Promise<Response> {
  const controleur = new AbortController();
  const timer = setTimeout(() => controleur.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${cleApi}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controleur.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function messageErreurNotion(reponse: Response): Promise<string> {
  const corps = await reponse.json().catch(() => null);
  return corps?.message ?? `Notion a répondu ${reponse.status}.`;
}

// databases.retrieve — liste les propriétés (colonnes) d'une base, pour la
// modale "Configurer la base".
export async function recupererProprietesBaseNotion(
  cleApi: string,
  databaseId: string
): Promise<ProprieteNotion[]> {
  const reponse = await appelNotion(`https://api.notion.com/v1/databases/${databaseId}`, cleApi);
  if (!reponse.ok) throw new Error(await messageErreurNotion(reponse));
  const donnees = await reponse.json();
  const proprietes = (donnees.properties ?? {}) as Record<string, { name: string; type: string }>;
  return Object.values(proprietes).map((p) => ({ nom: p.name, type: p.type }));
}

// databases.query — toutes les lignes d'une base (pagine automatiquement,
// plafonné à MAX_PAGES par sécurité), pour la lecture en direct du CRM.
export async function interrogerBaseNotion(cleApi: string, databaseId: string): Promise<PageNotion[]> {
  const pages: PageNotion[] = [];
  let curseur: string | undefined;
  do {
    const reponse = await appelNotion(`https://api.notion.com/v1/databases/${databaseId}/query`, cleApi, {
      method: "POST",
      body: JSON.stringify(curseur ? { start_cursor: curseur, page_size: 100 } : { page_size: 100 }),
    });
    if (!reponse.ok) throw new Error(await messageErreurNotion(reponse));
    const donnees = await reponse.json();
    pages.push(...((donnees.results ?? []) as PageNotion[]));
    curseur = donnees.has_more ? donnees.next_cursor : undefined;
  } while (curseur && pages.length < MAX_PAGES);
  return pages;
}

// pages.retrieve — une seule ligne, pour la fiche contact.
export async function recupererPageNotion(cleApi: string, pageId: string): Promise<PageNotion> {
  const reponse = await appelNotion(`https://api.notion.com/v1/pages/${pageId}`, cleApi);
  if (!reponse.ok) throw new Error(await messageErreurNotion(reponse));
  return reponse.json();
}

// Extrait une valeur affichable d'une propriété Notion selon son type.
// "status" (type distinct de "select" dans l'API Notion, même si visible
// de façon similaire dans l'éditeur) est géré en plus des 5 types demandés
// car c'est le type le plus couramment utilisé pour un champ "statut" dans
// les modèles de CRM Notion — sans ce cas, le mapping statut échouerait
// silencieusement pour la majorité des bases réelles.
export function extraireValeurPropriete(propriete: ValeurProprieteNotion | undefined): string {
  if (!propriete) return "";
  switch (propriete.type) {
    case "title":
      return (propriete.title ?? []).map((t) => t.plain_text).join("");
    case "rich_text":
      return (propriete.rich_text ?? []).map((t) => t.plain_text).join("");
    case "phone_number":
      return propriete.phone_number ?? "";
    case "email":
      return propriete.email ?? "";
    case "select":
      return propriete.select?.name ?? "";
    case "status":
      return propriete.status?.name ?? "";
    default:
      return "";
  }
}

export type ContactNotion = {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  statut: string;
  derniereModification: string | null;
};

// Convertit une page Notion en "contact" affichable dans le tableau CRM,
// selon la correspondance de colonnes enregistrée par le gestionnaire.
// email/statut sont optionnels dans le mapping : chaîne vide si non
// configurés plutôt qu'une erreur.
export function mapperPageNotionEnContact(page: PageNotion, mapping: MappingIntegration): ContactNotion {
  return {
    id: page.id,
    nom: extraireValeurPropriete(page.properties[mapping.nom]),
    telephone: extraireValeurPropriete(page.properties[mapping.telephone]),
    email: mapping.email ? extraireValeurPropriete(page.properties[mapping.email]) : "",
    statut: mapping.statut ? extraireValeurPropriete(page.properties[mapping.statut]) : "",
    derniereModification: page.last_edited_time ?? null,
  };
}
