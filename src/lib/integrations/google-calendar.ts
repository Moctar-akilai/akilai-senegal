import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { chiffrerCleApi, dechiffrerCleApi, cleMaitresse } from "./chiffrement";

// Client Google Calendar (OAuth + API REST) — server-only. Aucune fonction
// de ce module ne doit être importée depuis un composant client : le
// secret client (GOOGLE_CLIENT_SECRET) et les tokens déchiffrés ne doivent
// jamais atteindre le navigateur.

// Doit correspondre exactement à l'URI de redirection configurée côté
// Google Cloud Console — Google refuse toute requête dont redirect_uri ne
// correspond pas au caractère près, donc une valeur dérivée dynamiquement
// des en-têtes de la requête (host, proto) serait fragile en production.
const REDIRECT_URI = "https://akilai-senegal.vercel.app/api/integrations/google-calendar/callback";
const SCOPE = "https://www.googleapis.com/auth/calendar";
const TIMEOUT_MS = 10000;
const MARGE_EXPIRATION_MS = 2 * 60 * 1000; // rafraîchit le token 2 min avant son expiration réelle
const DUREE_VALIDITE_STATE_MS = 10 * 60 * 1000; // durée max entre le clic "Connecter" et le retour de Google

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID n'est pas configurée.");
  return id;
}

function clientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET n'est pas configurée.");
  return secret;
}

// ============================================================================
// Flux OAuth : URL d'autorisation, échange de code, rafraîchissement, révocation
// ============================================================================

export function construireUrlAutorisationGoogle(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Signe le gestionnaire_id dans le paramètre state (HMAC-SHA256 avec
// ENCRYPTION_KEY) : la redirection externe vers Google puis retour ne porte
// aucune session, ce state signé est donc l'unique moyen fiable de savoir
// quel gestionnaire revient sur /callback, sans qu'il puisse être falsifié.
export function signerState(gestionnaireId: string): string {
  const payload = JSON.stringify({ g: gestionnaireId, exp: Date.now() + DUREE_VALIDITE_STATE_MS });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const signature = createHmac("sha256", cleMaitresse()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifierState(state: string): string | null {
  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) return null;

  const signatureAttendue = createHmac("sha256", cleMaitresse()).update(payloadB64).digest("base64url");
  const bufFourni = Buffer.from(signature);
  const bufAttendu = Buffer.from(signatureAttendue);
  if (bufFourni.length !== bufAttendu.length || !timingSafeEqual(bufFourni, bufAttendu)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (typeof payload.g !== "string" || typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return payload.g;
  } catch {
    return null;
  }
}

// Les erreurs Google prennent deux formes selon l'endpoint : les endpoints
// OAuth (token/revoke) renvoient { error: "invalid_grant", error_description }
// tandis que l'API Calendar renvoie { error: { message } } — ce helper gère
// les deux.
async function messageErreurGoogle(reponse: Response): Promise<string> {
  const corps = await reponse.json().catch(() => null);
  return (
    corps?.error?.message ?? corps?.error_description ?? corps?.error ?? `Google a répondu ${reponse.status}.`
  );
}

export async function echangerCodeContreTokens(
  code: string
): Promise<{ accessToken: string; refreshToken: string | null; expiryDate: number }> {
  const reponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!reponse.ok) throw new Error(await messageErreurGoogle(reponse));
  const donnees = await reponse.json();
  return {
    accessToken: donnees.access_token,
    refreshToken: donnees.refresh_token ?? null,
    expiryDate: Date.now() + donnees.expires_in * 1000,
  };
}

async function rafraichirAccessToken(refreshToken: string): Promise<{ accessToken: string; expiryDate: number }> {
  const reponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!reponse.ok) throw new Error(await messageErreurGoogle(reponse));
  const donnees = await reponse.json();
  return { accessToken: donnees.access_token, expiryDate: Date.now() + donnees.expires_in * 1000 };
}

// Révocation best-effort — appelée avant de vider integrations.config au
// moment de la déconnexion. Le token est révoqué côté Google même si cet
// appel échoue silencieusement pour l'appelant (voir /api/dashboard/write).
export async function revoquerToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" });
}

// ============================================================================
// Token valide + config stockée
// ============================================================================

export type ConfigGoogleCalendar = {
  access_token_chiffre: string;
  refresh_token_chiffre: string;
  expiry_date: number;
  calendar_id: string;
};

// Lit la config Google Calendar de ce gestionnaire, rafraîchit l'access
// token via le refresh token si nécessaire (et persiste le nouveau token
// chiffré), puis retourne un access token exploitable immédiatement.
// Toute fonction qui appelle l'API Google Calendar doit passer par ici
// plutôt que d'utiliser un access_token stocké directement.
export async function obtenirConnexionGoogleCalendar(
  gestionnaireId: string
): Promise<{ accessToken: string; calendarId: string } | null> {
  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("config")
    .eq("gestionnaire_id", gestionnaireId)
    .eq("fournisseur", "google_calendar")
    .maybeSingle();

  const config = (integration?.config as ConfigGoogleCalendar | null) ?? null;
  if (!config?.refresh_token_chiffre || !config.access_token_chiffre) return null;

  if (config.expiry_date - MARGE_EXPIRATION_MS > Date.now()) {
    return { accessToken: dechiffrerCleApi(config.access_token_chiffre), calendarId: config.calendar_id || "primary" };
  }

  let rafraichi: { accessToken: string; expiryDate: number };
  try {
    rafraichi = await rafraichirAccessToken(dechiffrerCleApi(config.refresh_token_chiffre));
  } catch (erreurRafraichissement) {
    // Le refresh token a probablement été révoqué côté Google : reflète
    // l'échec sur la carte Intégrations plutôt que de laisser un statut
    // "connecté" trompeur.
    await supabase
      .from("integrations")
      .update({
        statut: "erreur",
        message_erreur:
          erreurRafraichissement instanceof Error
            ? erreurRafraichissement.message
            : "Échec du rafraîchissement du token Google Calendar.",
      })
      .eq("gestionnaire_id", gestionnaireId)
      .eq("fournisseur", "google_calendar");
    throw erreurRafraichissement;
  }

  const nouvelleConfig: ConfigGoogleCalendar = {
    ...config,
    access_token_chiffre: chiffrerCleApi(rafraichi.accessToken),
    expiry_date: rafraichi.expiryDate,
  };
  await supabase
    .from("integrations")
    .update({ config: nouvelleConfig })
    .eq("gestionnaire_id", gestionnaireId)
    .eq("fournisseur", "google_calendar");

  return { accessToken: rafraichi.accessToken, calendarId: config.calendar_id || "primary" };
}

export async function obtenirAccessTokenValide(gestionnaireId: string): Promise<string | null> {
  const connexion = await obtenirConnexionGoogleCalendar(gestionnaireId);
  return connexion?.accessToken ?? null;
}

// ============================================================================
// API Google Calendar (events.list / events.insert / events.update / events.delete)
// ============================================================================

export type EvenementGoogle = {
  id: string;
  titre: string;
  debut: string; // ISO
  fin: string; // ISO
  description: string | null;
  lieu: string | null;
};

async function appelGoogleCalendar(accessToken: string, chemin: string, init?: RequestInit): Promise<Response> {
  const controleur = new AbortController();
  const timer = setTimeout(() => controleur.abort(), TIMEOUT_MS);
  try {
    return await fetch(`https://www.googleapis.com/calendar/v3${chemin}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controleur.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

type EvenementGoogleBrut = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
};

function mapperEvenementGoogle(item: EvenementGoogleBrut): EvenementGoogle {
  return {
    id: item.id,
    titre: item.summary ?? "(Sans titre)",
    debut: item.start?.dateTime ?? item.start?.date ?? "",
    fin: item.end?.dateTime ?? item.end?.date ?? "",
    description: item.description ?? null,
    lieu: item.location ?? null,
  };
}

export async function listerEvenements(
  accessToken: string,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string
): Promise<EvenementGoogle[]> {
  const params = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const reponse = await appelGoogleCalendar(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  if (!reponse.ok) throw new Error(await messageErreurGoogle(reponse));
  const donnees = await reponse.json();
  return ((donnees.items ?? []) as EvenementGoogleBrut[]).map(mapperEvenementGoogle);
}

// Événements à venir créés pour un contact donné (voir `contactId` dans
// creerEvenement) — utilisé par l'outil annuler_ou_reporter_rendez_vous
// pour retrouver les rendez-vous de ce contact sans dépendre d'un
// identifiant que l'assistant n'a de toute façon pas mémorisé entre deux
// messages.
export async function listerEvenementsFutursDuContact(
  accessToken: string,
  calendarId: string,
  contactId: string
): Promise<EvenementGoogle[]> {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
    privateExtendedProperty: `akilai_contact_id=${contactId}`,
  });
  const reponse = await appelGoogleCalendar(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  if (!reponse.ok) throw new Error(await messageErreurGoogle(reponse));
  const donnees = await reponse.json();
  return ((donnees.items ?? []) as EvenementGoogleBrut[]).map(mapperEvenementGoogle);
}

export async function creerEvenement(
  accessToken: string,
  calendarId: string,
  evenement: { titre: string; debutISO: string; finISO: string; description?: string | null; contactId?: string }
): Promise<EvenementGoogle> {
  const corps: Record<string, unknown> = {
    summary: evenement.titre,
    description: evenement.description || undefined,
    start: { dateTime: evenement.debutISO },
    end: { dateTime: evenement.finISO },
  };
  // Référence privée (invisible pour l'invité, non éditable manuellement)
  // permettant de retrouver ensuite les rendez-vous de ce contact — voir
  // listerEvenementsFutursDuContact.
  if (evenement.contactId) {
    corps.extendedProperties = { private: { akilai_contact_id: evenement.contactId } };
  }

  const reponse = await appelGoogleCalendar(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(corps),
  });
  if (!reponse.ok) throw new Error(await messageErreurGoogle(reponse));
  return mapperEvenementGoogle(await reponse.json());
}

export async function mettreAJourEvenement(
  accessToken: string,
  calendarId: string,
  eventId: string,
  patch: { debutISO?: string; finISO?: string; titre?: string }
): Promise<EvenementGoogle> {
  const corps: Record<string, unknown> = {};
  if (patch.titre) corps.summary = patch.titre;
  if (patch.debutISO) corps.start = { dateTime: patch.debutISO };
  if (patch.finISO) corps.end = { dateTime: patch.finISO };

  const reponse = await appelGoogleCalendar(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(corps) }
  );
  if (!reponse.ok) throw new Error(await messageErreurGoogle(reponse));
  return mapperEvenementGoogle(await reponse.json());
}

export async function supprimerEvenement(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const reponse = await appelGoogleCalendar(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" }
  );
  // 410 Gone = déjà supprimé côté Google : à traiter comme un succès plutôt
  // qu'une erreur (l'objectif — "ce rendez-vous n'existe plus" — est atteint).
  if (!reponse.ok && reponse.status !== 410) throw new Error(await messageErreurGoogle(reponse));
}
