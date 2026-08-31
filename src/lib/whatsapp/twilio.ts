import twilio from "twilio";

// Le client n'est instancié qu'au premier appel réel (jamais au chargement
// du module) : Next.js exécute le module au moment du build ("Collecting
// page data"), où TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN ne sont pas
// garanties disponibles de la même façon qu'à l'exécution. Un
// `twilio(...)` au niveau du module ferait échouer le build dès que le SID
// est absent ou mal formé, même quand les identifiants sont bien
// configurés à l'exécution.
let client: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!client) client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
}

// Numéro d'envoi unique hérité de l'ancien produit (gestion locative),
// utilisé uniquement par envoyerMessageWhatsApp ci-dessous pour les
// quittances/relances (src/lib/whatsapp/notifications.ts, non utilisées par
// AkilAI). Le webhook AkilAI (src/app/api/whatsapp/webhook/route.ts) ne
// passe pas par cette fonction : il répond via TwiML, qui utilise
// automatiquement le numéro WhatsApp Business exact du compte concerné
// (le "To" du message entrant) — un seul numéro global n'aurait plus de
// sens puisque chaque gestionnaire a le sien (parametres_compte.numero_whatsapp).
const FROM = process.env.TWILIO_WHATSAPP_FROM!;

function toWhatsApp(numero: string) {
  const propre = numero.replace(/[\s.-]/g, "");
  return propre.startsWith("whatsapp:") ? propre : `whatsapp:${propre}`;
}

export function numeroSansPrefixeWhatsApp(numero: string) {
  return numero.replace(/^whatsapp:/, "");
}

// Utilisée uniquement par le flux hérité (quittances/relances) — le
// webhook AkilAI ne l'appelle pas, voir le commentaire sur FROM ci-dessus.
export async function envoyerMessageWhatsApp(numeroDestinataire: string, corps: string) {
  return getTwilioClient().messages.create({
    from: FROM,
    to: toWhatsApp(numeroDestinataire),
    body: corps,
  });
}

// Vérifie la signature Twilio d'une requête webhook entrante.
// `url` doit être l'URL publique exacte configurée dans la console Twilio
// (schéma https compris), et `params` les champs form-encoded du corps.
export function validerSignatureTwilio(
  signature: string | null,
  url: string,
  params: Record<string, string>
) {
  if (!signature) return false;
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, params);
}

// Télécharge un média Twilio (ex: message vocal) en utilisant l'authentification
// Basic du compte — les URLs de médias Twilio ne sont pas accessibles publiquement.
export async function telechargerMediaTwilio(mediaUrl: string) {
  const identifiants = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  const reponse = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${identifiants}` },
  });
  if (!reponse.ok) throw new Error(`Échec du téléchargement du média Twilio (${reponse.status})`);

  const contentType = reponse.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await reponse.arrayBuffer());
  return { buffer, contentType };
}

export function messageQuittance(params: {
  locataireNom: string;
  mois: string; // ex: "septembre 2026"
  montant: number;
  adresseBien: string;
}) {
  return (
    `Bonjour ${params.locataireNom},\n\n` +
    `Nous confirmons la réception de votre loyer de ${params.montant.toLocaleString("fr-FR")} FCFA ` +
    `pour ${params.mois}, concernant le logement situé au ${params.adresseBien}.\n\n` +
    `Merci pour votre paiement.\n\n` +
    `— Quittance générée automatiquement`
  );
}

export function messageRelance(params: {
  locataireNom: string;
  mois: string;
  montant: number;
  adresseBien: string;
}) {
  return (
    `Bonjour ${params.locataireNom},\n\n` +
    `Nous n'avons pas encore reçu votre loyer de ${params.montant.toLocaleString("fr-FR")} FCFA ` +
    `pour ${params.mois} (logement : ${params.adresseBien}).\n\n` +
    `Merci de bien vouloir régulariser dans les meilleurs délais, ou de nous contacter en cas de difficulté.\n\n` +
    `Cordialement.`
  );
}
