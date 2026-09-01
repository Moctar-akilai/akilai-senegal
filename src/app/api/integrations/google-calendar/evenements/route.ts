import { NextResponse, type NextRequest } from "next/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import {
  obtenirConnexionGoogleCalendar,
  listerEvenements,
  creerEvenement,
  type EvenementGoogle,
} from "@/lib/integrations/google-calendar";
import type { EvenementAgenda } from "@/app/dashboard/agenda/CalendarGrid";

// Lecture (GET) / création (POST) d'événements sur le calendrier connecté
// de la page /dashboard/agenda — voir src/app/dashboard/agenda/AgendaView.tsx.

type Reponse<T> = { ok: true; data: T } | { ok: false; error: string };

function erreur(message: string, status = 400) {
  return NextResponse.json<Reponse<never>>({ ok: false, error: message }, { status });
}

function estString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function versEvenementAgenda(e: EvenementGoogle): EvenementAgenda {
  return { id: e.id, titre: e.titre, debut: e.debut, fin: e.fin, description: e.description, lieu: e.lieu };
}

export async function GET(request: NextRequest) {
  let gestionnaire: { id: string };
  try {
    gestionnaire = await getGestionnaireActuel();
  } catch {
    return erreur("Non authentifié.", 401);
  }

  const debut = request.nextUrl.searchParams.get("debut");
  const fin = request.nextUrl.searchParams.get("fin");
  if (!debut || !fin) return erreur("Période requise.");

  try {
    const connexion = await obtenirConnexionGoogleCalendar(gestionnaire.id);
    if (!connexion) return erreur("Google Calendar n'est pas connecté.", 400);

    const evenements = await listerEvenements(connexion.accessToken, connexion.calendarId, debut, fin);
    return NextResponse.json<Reponse<EvenementAgenda[]>>({ ok: true, data: evenements.map(versEvenementAgenda) });
  } catch (e) {
    console.error("[agenda] Échec de la lecture des événements Google Calendar:", e);
    return erreur(e instanceof Error ? e.message : "Impossible de lire le calendrier.", 502);
  }
}

export async function POST(request: NextRequest) {
  let gestionnaire: { id: string };
  try {
    gestionnaire = await getGestionnaireActuel();
  } catch {
    return erreur("Non authentifié.", 401);
  }

  const body = await request.json().catch(() => null);
  if (!body || !estString(body.titre) || !estString(body.date) || !estString(body.heureDebut) || !estString(body.heureFin)) {
    return erreur("Titre, date, heure de début et heure de fin sont requis.");
  }

  try {
    const connexion = await obtenirConnexionGoogleCalendar(gestionnaire.id);
    if (!connexion) return erreur("Google Calendar n'est pas connecté.", 400);

    // Dakar (Africa/Dakar) est en UTC+0 toute l'année : la date/heure locale
    // saisie dans le formulaire correspond directement à l'heure UTC.
    const debutISO = `${body.date}T${body.heureDebut}:00Z`;
    const finISO = `${body.date}T${body.heureFin}:00Z`;

    const evenement = await creerEvenement(connexion.accessToken, connexion.calendarId, {
      titre: body.titre,
      description: estString(body.description) ? body.description : null,
      debutISO,
      finISO,
    });
    return NextResponse.json<Reponse<EvenementAgenda>>({ ok: true, data: versEvenementAgenda(evenement) });
  } catch (e) {
    console.error("[agenda] Échec de la création d'un événement Google Calendar:", e);
    return erreur(e instanceof Error ? e.message : "Impossible de créer le rendez-vous.", 502);
  }
}
