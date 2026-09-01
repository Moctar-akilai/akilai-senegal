import type { ConfigIntegration, MappingIntegration } from "./fournisseurs";

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

type ProprieteNotionBrute = { name: string; type: string; [type: string]: unknown };

// databases.retrieve — schéma brut complet, partagé par
// recupererProprietesBaseNotion (liste nom+type, pour la modale "Configurer
// la base") et recupererSchemaProprietes (nom+type+options, pour l'écriture).
async function recupererProprietesBrutes(
  cleApi: string,
  databaseId: string
): Promise<Record<string, ProprieteNotionBrute>> {
  const reponse = await appelNotion(`https://api.notion.com/v1/databases/${databaseId}`, cleApi);
  if (!reponse.ok) throw new Error(await messageErreurNotion(reponse));
  const donnees = await reponse.json();
  return (donnees.properties ?? {}) as Record<string, ProprieteNotionBrute>;
}

// databases.retrieve — liste les propriétés (colonnes) d'une base, pour la
// modale "Configurer la base".
export async function recupererProprietesBaseNotion(
  cleApi: string,
  databaseId: string
): Promise<ProprieteNotion[]> {
  const proprietes = await recupererProprietesBrutes(cleApi, databaseId);
  return Object.values(proprietes).map((p) => ({ nom: p.name, type: p.type }));
}

export type SchemaPropriete = { type: string; premiereOption?: string };

// Schéma indexé par nom de propriété, avec pour les select/status la
// première option disponible (utile pour choisir un statut de départ à la
// création d'une page) — recupererProprietesBaseNotion ne suffit pas pour
// ça, elle ne retourne que {nom, type}.
export async function recupererSchemaProprietes(
  cleApi: string,
  databaseId: string
): Promise<Record<string, SchemaPropriete>> {
  const proprietes = await recupererProprietesBrutes(cleApi, databaseId);
  const schema: Record<string, SchemaPropriete> = {};
  for (const [nom, p] of Object.entries(proprietes)) {
    const details = p[p.type] as { options?: { name: string }[] } | undefined;
    schema[nom] = { type: p.type, premiereOption: details?.options?.[0]?.name };
  }
  return schema;
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

// ============================================================================
// Écriture (synchronisation du contact collecté lors d'une prise de RDV —
// voir src/lib/whatsapp/outils-rendezvous.ts). Symétrique à
// extraireValeurPropriete côté lecture.
// ============================================================================

function construireValeurPropriete(type: string, valeur: string): Record<string, unknown> {
  switch (type) {
    case "title":
      return { title: [{ text: { content: valeur } }] };
    case "phone_number":
      return { phone_number: valeur };
    case "email":
      return { email: valeur };
    case "select":
      return { select: { name: valeur } };
    case "status":
      return { status: { name: valeur } };
    case "rich_text":
    default:
      return { rich_text: [{ text: { content: valeur } }] };
  }
}

function construireFiltreEgalite(type: string, valeur: string): Record<string, unknown> {
  switch (type) {
    case "phone_number":
      return { phone_number: { equals: valeur } };
    case "email":
      return { email: { equals: valeur } };
    case "title":
      return { title: { equals: valeur } };
    case "select":
      return { select: { equals: valeur } };
    case "status":
      return { status: { equals: valeur } };
    case "rich_text":
    default:
      return { rich_text: { equals: valeur } };
  }
}

// databases.query avec filtre — cherche la première page dont la propriété
// `nomPropriete` correspond exactement à `valeur` (utilisé pour retrouver
// un contact par téléphone). Retourne null si aucune correspondance.
async function rechercherPageParValeur(
  cleApi: string,
  databaseId: string,
  nomPropriete: string,
  typePropriete: string,
  valeur: string
): Promise<PageNotion | null> {
  const reponse = await appelNotion(`https://api.notion.com/v1/databases/${databaseId}/query`, cleApi, {
    method: "POST",
    body: JSON.stringify({
      filter: { property: nomPropriete, ...construireFiltreEgalite(typePropriete, valeur) },
      page_size: 1,
    }),
  });
  if (!reponse.ok) throw new Error(await messageErreurNotion(reponse));
  const donnees = await reponse.json();
  const resultats = (donnees.results ?? []) as PageNotion[];
  return resultats[0] ?? null;
}

// pages.update — met à jour uniquement les propriétés fournies.
async function mettreAJourPageNotion(
  cleApi: string,
  pageId: string,
  proprietes: Record<string, unknown>
): Promise<void> {
  const reponse = await appelNotion(`https://api.notion.com/v1/pages/${pageId}`, cleApi, {
    method: "PATCH",
    body: JSON.stringify({ properties: proprietes }),
  });
  if (!reponse.ok) throw new Error(await messageErreurNotion(reponse));
}

// pages.create — nouvelle ligne dans la base.
async function creerPageNotion(
  cleApi: string,
  databaseId: string,
  proprietes: Record<string, unknown>
): Promise<void> {
  const reponse = await appelNotion(`https://api.notion.com/v1/pages`, cleApi, {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: databaseId }, properties: proprietes }),
  });
  if (!reponse.ok) throw new Error(await messageErreurNotion(reponse));
}

// Crée ou met à jour, dans la base Notion configurée comme CRM actif, la
// page correspondant à ce téléphone — avec le nom/email les plus à jour
// connus côté natif. Appelée après une prise de rendez-vous où l'assistant
// a collecté nom/email (voir src/lib/whatsapp/outils-rendezvous.ts) ;
// laisse volontairement remonter ses erreurs, à l'appelant de décider de ne
// jamais bloquer la prise de RDV dessus.
export async function synchroniserContactNotion(
  cleApi: string,
  config: ConfigIntegration,
  contact: { telephone: string; nom: string | null; email: string | null }
): Promise<void> {
  const schema = await recupererSchemaProprietes(cleApi, config.database_id);
  const schemaTelephone = schema[config.mapping.telephone];
  if (!schemaTelephone) {
    throw new Error(`Colonne "${config.mapping.telephone}" introuvable dans la base Notion.`);
  }

  const pageExistante = await rechercherPageParValeur(
    cleApi,
    config.database_id,
    config.mapping.telephone,
    schemaTelephone.type,
    contact.telephone
  );

  const proprietes: Record<string, unknown> = {};
  const schemaNom = schema[config.mapping.nom];
  if (contact.nom && schemaNom) {
    proprietes[config.mapping.nom] = construireValeurPropriete(schemaNom.type, contact.nom);
  }
  const schemaEmail = config.mapping.email ? schema[config.mapping.email] : undefined;
  if (contact.email && config.mapping.email && schemaEmail) {
    proprietes[config.mapping.email] = construireValeurPropriete(schemaEmail.type, contact.email);
  }

  if (pageExistante) {
    if (Object.keys(proprietes).length > 0) {
      await mettreAJourPageNotion(cleApi, pageExistante.id, proprietes);
    }
    return;
  }

  // Nouvelle page : renseigne aussi le téléphone (sert à la retrouver la
  // prochaine fois) et, si la colonne statut est mappée, une valeur de
  // départ raisonnable — la première option si select/status, sinon une
  // chaîne simple pour un champ texte.
  proprietes[config.mapping.telephone] = construireValeurPropriete(schemaTelephone.type, contact.telephone);
  if (config.mapping.statut) {
    const schemaStatut = schema[config.mapping.statut];
    if (schemaStatut) {
      const valeurDepart = schemaStatut.premiereOption ?? "Nouveau";
      proprietes[config.mapping.statut] = construireValeurPropriete(schemaStatut.type, valeurDepart);
    }
  }

  await creerPageNotion(cleApi, config.database_id, proprietes);
}
