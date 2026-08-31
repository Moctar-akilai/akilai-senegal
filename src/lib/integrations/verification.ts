import type { Fournisseur } from "./fournisseurs";

export type ResultatVerification =
  | { tentee: true; ok: true }
  | { tentee: true; ok: false; erreur: string }
  | { tentee: false };

// Fournisseurs pour lesquels un appel "whoami"/infos de compte simple et
// fiable existe et est implémenté ci-dessous. Pour tous les autres
// fournisseurs compatibles clé API, la clé est stockée et le statut passe
// directement à 'connecte' sans appel de vérification (voir
// FOURNISSEURS_CLE_API dans fournisseurs.ts pour la liste complète, et le
// commentaire de dispatch plus bas pour le détail des exclusions) :
// - Shopify : un appel nécessite aussi le nom de la boutique
//   (*.myshopify.com), qu'un simple champ "clé API" ne fournit pas.
// - Google Sheets (compte de service) : l'authentification réelle est un
//   flux JWT signé avec une clé privée, pas un simple jeton porteur — ça ne
//   correspond pas à un "appel minimal" avec une clé API collée telle quelle.
// - Resend : les clés API ont des portées (envoi seul vs accès complet) et
//   aucun endpoint n'est garanti accessible pour toutes les portées, un
//   "whoami" pourrait donc renvoyer une fausse erreur sur une clé valide.
// - CRM AkilAI : ne correspond à aucune API tierce documentée connue.
const TIMEOUT_MS = 8000;

async function appelAvecTimeout(url: string, init: RequestInit): Promise<Response> {
  const controleur = new AbortController();
  const timer = setTimeout(() => controleur.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controleur.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function verifierHubspot(cle: string): Promise<ResultatVerification> {
  try {
    const reponse = await appelAvecTimeout("https://api.hubapi.com/account-info/v3/details", {
      headers: { Authorization: `Bearer ${cle}` },
    });
    if (reponse.ok) return { tentee: true, ok: true };
    return { tentee: true, ok: false, erreur: `HubSpot a répondu ${reponse.status}.` };
  } catch (erreur) {
    return { tentee: true, ok: false, erreur: `Échec de connexion à HubSpot : ${String(erreur)}` };
  }
}

async function verifierNotion(cle: string): Promise<ResultatVerification> {
  try {
    const reponse = await appelAvecTimeout("https://api.notion.com/v1/users/me", {
      headers: { Authorization: `Bearer ${cle}`, "Notion-Version": "2022-06-28" },
    });
    if (reponse.ok) return { tentee: true, ok: true };
    return { tentee: true, ok: false, erreur: `Notion a répondu ${reponse.status}.` };
  } catch (erreur) {
    return { tentee: true, ok: false, erreur: `Échec de connexion à Notion : ${String(erreur)}` };
  }
}

async function verifierAirtable(cle: string): Promise<ResultatVerification> {
  try {
    const reponse = await appelAvecTimeout("https://api.airtable.com/v0/meta/whoami", {
      headers: { Authorization: `Bearer ${cle}` },
    });
    if (reponse.ok) return { tentee: true, ok: true };
    return { tentee: true, ok: false, erreur: `Airtable a répondu ${reponse.status}.` };
  } catch (erreur) {
    return { tentee: true, ok: false, erreur: `Échec de connexion à Airtable : ${String(erreur)}` };
  }
}

async function verifierBrevo(cle: string): Promise<ResultatVerification> {
  try {
    const reponse = await appelAvecTimeout("https://api.brevo.com/v3/account", {
      headers: { "api-key": cle },
    });
    if (reponse.ok) return { tentee: true, ok: true };
    return { tentee: true, ok: false, erreur: `Brevo a répondu ${reponse.status}.` };
  } catch (erreur) {
    return { tentee: true, ok: false, erreur: `Échec de connexion à Brevo : ${String(erreur)}` };
  }
}

export async function verifierCleApi(
  fournisseur: Fournisseur,
  cleApi: string
): Promise<ResultatVerification> {
  switch (fournisseur) {
    case "hubspot":
      return verifierHubspot(cleApi);
    case "notion":
      return verifierNotion(cleApi);
    case "airtable":
      return verifierAirtable(cleApi);
    case "brevo":
      return verifierBrevo(cleApi);
    default:
      return { tentee: false };
  }
}
