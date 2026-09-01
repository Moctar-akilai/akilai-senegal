import type { ChatCompletionTool } from "openai/resources/chat/completions";
import {
  obtenirConnexionGoogleCalendar,
  listerEvenements,
  listerEvenementsFutursDuContact,
  creerEvenement,
  mettreAJourEvenement,
  supprimerEvenement,
  type EvenementGoogle,
} from "@/lib/integrations/google-calendar";

// Outils de prise de rendez-vous exposés à l'assistant WhatsApp (function
// calling OpenAI) — seulement quand Google Calendar est connecté pour le
// gestionnaire concerné (voir genererReponseAssistant dans ./assistant.ts).
//
// Dakar (Africa/Dakar) est en UTC+0 toute l'année, sans heure d'été : une
// date+heure locale donnée par le contact correspond donc directement à
// l'heure UTC envoyée à Google Calendar, sans conversion de fuseau.
function versISO(date: string, heure: string): string {
  return `${date}T${heure}:00Z`;
}

function minutesDepuisMinuit(heureHHMM: string): number {
  const [h, m] = heureHHMM.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesEnHeure(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Cherche, dans les événements déjà connus du jour, des créneaux libres de
// la durée demandée entre 08h et 19h, triés par proximité avec l'heure
// initialement souhaitée (les 3 plus proches).
function creneauxLibresProches(
  evenementsJour: EvenementGoogle[],
  dureeMinutes: number,
  heureSouhaiteeMinutes: number
): string[] {
  const OUVERTURE = 8 * 60;
  const FERMETURE = 19 * 60;
  const occupes = evenementsJour
    .filter((e) => e.debut.includes("T")) // ignore les événements "journée entière"
    .map((e): [number, number] => [minutesDepuisMinuit(e.debut.slice(11, 16)), minutesDepuisMinuit(e.fin.slice(11, 16))]);

  const libres: number[] = [];
  for (let debut = OUVERTURE; debut + dureeMinutes <= FERMETURE; debut += 30) {
    const fin = debut + dureeMinutes;
    if (!occupes.some(([od, of_]) => debut < of_ && fin > od)) libres.push(debut);
  }

  return libres
    .sort((a, b) => Math.abs(a - heureSouhaiteeMinutes) - Math.abs(b - heureSouhaiteeMinutes))
    .slice(0, 3)
    .sort((a, b) => a - b)
    .map(formatMinutesEnHeure);
}

export const OUTILS_RENDEZ_VOUS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "verifier_disponibilite",
      description:
        "Vérifie si un créneau est libre sur le calendrier. À appeler systématiquement avant de proposer ou confirmer un créneau à un client — ne jamais affirmer qu'un créneau est libre sans avoir appelé cet outil.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date du créneau, format AAAA-MM-JJ" },
          heure_debut: { type: "string", description: "Heure de début, format HH:MM (24h)" },
          heure_fin: { type: "string", description: "Heure de fin, format HH:MM (24h)" },
        },
        required: ["date", "heure_debut", "heure_fin"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prendre_rendez_vous",
      description:
        "Crée le rendez-vous dans le calendrier. N'appeler qu'après avoir confirmé la disponibilité du créneau avec verifier_disponibilite.",
      parameters: {
        type: "object",
        properties: {
          titre: { type: "string", description: "Titre court du rendez-vous" },
          date: { type: "string", description: "Date, format AAAA-MM-JJ" },
          heure_debut: { type: "string", description: "Heure de début, format HH:MM (24h)" },
          heure_fin: { type: "string", description: "Heure de fin, format HH:MM (24h)" },
          description: { type: "string", description: "Détails optionnels du rendez-vous" },
        },
        required: ["titre", "date", "heure_debut", "heure_fin"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "annuler_ou_reporter_rendez_vous",
      description: "Annule ou reporte un rendez-vous déjà pris par ce contact.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["annuler", "reporter"] },
          identifiant_ou_description_rdv: {
            type: "string",
            description: "Ce qui permet d'identifier le rendez-vous concerné (titre, date approximative...)",
          },
          nouvelle_date: { type: "string", description: "Nouvelle date, AAAA-MM-JJ — requis si action=reporter" },
          nouvelle_heure: { type: "string", description: "Nouvelle heure de début, HH:MM — requis si action=reporter" },
        },
        required: ["action", "identifiant_ou_description_rdv"],
      },
    },
  },
];

function estString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

async function outilVerifierDisponibilite(
  accessToken: string,
  calendarId: string,
  args: Record<string, unknown>
): Promise<string> {
  if (!estString(args.date) || !estString(args.heure_debut) || !estString(args.heure_fin)) {
    return JSON.stringify({ succes: false, erreur: "date, heure_debut et heure_fin sont requis." });
  }
  const date = args.date;
  const heureDebut = args.heure_debut;
  const heureFin = args.heure_fin;

  const evenementsJour = await listerEvenements(accessToken, calendarId, `${date}T00:00:00Z`, `${date}T23:59:59Z`);

  const debutSouhaite = new Date(versISO(date, heureDebut));
  const finSouhaite = new Date(versISO(date, heureFin));
  const chevauche = evenementsJour.some(
    (e) => debutSouhaite < new Date(e.fin) && finSouhaite > new Date(e.debut)
  );

  if (!chevauche) return JSON.stringify({ disponible: true });

  const dureeMinutes = Math.max(30, (finSouhaite.getTime() - debutSouhaite.getTime()) / 60000);
  const creneaux = creneauxLibresProches(evenementsJour, dureeMinutes, minutesDepuisMinuit(heureDebut));
  return JSON.stringify({ disponible: false, creneaux_libres_proches: creneaux });
}

async function outilPrendreRendezVous(
  accessToken: string,
  calendarId: string,
  args: Record<string, unknown>,
  contactId: string
): Promise<string> {
  if (!estString(args.titre) || !estString(args.date) || !estString(args.heure_debut) || !estString(args.heure_fin)) {
    return JSON.stringify({ succes: false, erreur: "titre, date, heure_debut et heure_fin sont requis." });
  }
  const titre = args.titre;
  const date = args.date;
  const heureDebut = args.heure_debut;
  const heureFin = args.heure_fin;
  const description = typeof args.description === "string" ? args.description : null;

  const evenement = await creerEvenement(accessToken, calendarId, {
    titre,
    description,
    debutISO: versISO(date, heureDebut),
    finISO: versISO(date, heureFin),
    contactId,
  });

  return JSON.stringify({
    succes: true,
    evenement_id: evenement.id,
    message: `Rendez-vous "${titre}" confirmé le ${date} de ${heureDebut} à ${heureFin}.`,
  });
}

async function outilAnnulerOuReporter(
  accessToken: string,
  calendarId: string,
  args: Record<string, unknown>,
  contactId: string
): Promise<string> {
  const action = args.action === "reporter" ? "reporter" : args.action === "annuler" ? "annuler" : null;
  if (!action) return JSON.stringify({ succes: false, erreur: "action doit être 'annuler' ou 'reporter'." });

  const description = estString(args.identifiant_ou_description_rdv)
    ? args.identifiant_ou_description_rdv.toLowerCase()
    : "";

  const evenements = await listerEvenementsFutursDuContact(accessToken, calendarId, contactId);
  if (evenements.length === 0) {
    return JSON.stringify({ succes: false, erreur: "Aucun rendez-vous à venir trouvé pour ce contact." });
  }

  const cible =
    evenements.length === 1
      ? evenements[0]
      : evenements.find(
          (e) =>
            description &&
            (e.titre.toLowerCase().includes(description) || (e.description ?? "").toLowerCase().includes(description))
        );

  if (!cible) {
    return JSON.stringify({
      succes: false,
      erreur:
        "Plusieurs rendez-vous à venir trouvés pour ce contact, impossible d'identifier lequel avec certitude — demande au client de préciser la date ou le titre.",
      rendez_vous_a_venir: evenements.map((e) => ({ titre: e.titre, debut: e.debut })),
    });
  }

  if (action === "annuler") {
    await supprimerEvenement(accessToken, calendarId, cible.id);
    return JSON.stringify({ succes: true, message: `Le rendez-vous "${cible.titre}" a bien été annulé.` });
  }

  if (!estString(args.nouvelle_date) || !estString(args.nouvelle_heure)) {
    return JSON.stringify({ succes: false, erreur: "nouvelle_date et nouvelle_heure sont requis pour reporter." });
  }
  const nouvelleDate = args.nouvelle_date;
  const nouvelleHeure = args.nouvelle_heure;
  const dureeMs = new Date(cible.fin).getTime() - new Date(cible.debut).getTime();
  const debutISO = versISO(nouvelleDate, nouvelleHeure);
  const finISO = new Date(new Date(debutISO).getTime() + dureeMs).toISOString();

  const misAJour = await mettreAJourEvenement(accessToken, calendarId, cible.id, { debutISO, finISO });
  return JSON.stringify({
    succes: true,
    message: `Le rendez-vous "${misAJour.titre}" a bien été reporté au ${nouvelleDate} à ${nouvelleHeure}.`,
  });
}

export async function executerOutilRendezVous(
  nom: string,
  argsJSON: string,
  ctx: { gestionnaireId: string; contactId: string }
): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJSON || "{}");
  } catch {
    return JSON.stringify({ succes: false, erreur: "Arguments invalides." });
  }

  try {
    const connexion = await obtenirConnexionGoogleCalendar(ctx.gestionnaireId);
    if (!connexion) {
      return JSON.stringify({ succes: false, erreur: "Google Calendar n'est pas connecté." });
    }
    const { accessToken, calendarId } = connexion;

    switch (nom) {
      case "verifier_disponibilite":
        return await outilVerifierDisponibilite(accessToken, calendarId, args);
      case "prendre_rendez_vous":
        return await outilPrendreRendezVous(accessToken, calendarId, args, ctx.contactId);
      case "annuler_ou_reporter_rendez_vous":
        return await outilAnnulerOuReporter(accessToken, calendarId, args, ctx.contactId);
      default:
        return JSON.stringify({ succes: false, erreur: "Outil inconnu." });
    }
  } catch (erreur) {
    console.error("[outils-rendezvous] Échec de l'appel à Google Calendar (outil=", nom, "):", erreur);
    return JSON.stringify({ succes: false, erreur: "Impossible de contacter Google Calendar pour le moment." });
  }
}
