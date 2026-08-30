import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Le numéro WhatsApp Twilio doit être au format "whatsapp:+14155238886"
const FROM = process.env.TWILIO_WHATSAPP_FROM!;

function toWhatsApp(numero: string) {
  const propre = numero.replace(/[\s.-]/g, "");
  return propre.startsWith("whatsapp:") ? propre : `whatsapp:${propre}`;
}

export function numeroSansPrefixeWhatsApp(numero: string) {
  return numero.replace(/^whatsapp:/, "");
}

export async function envoyerMessageWhatsApp(numeroDestinataire: string, corps: string) {
  return client.messages.create({
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
