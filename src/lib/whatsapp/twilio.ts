import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Le numéro WhatsApp Twilio doit être au format "whatsapp:+14155238886"
const FROM = process.env.TWILIO_WHATSAPP_FROM!;

function toWhatsApp(numero: string) {
  const propre = numero.replace(/[\s.-]/g, "");
  return propre.startsWith("whatsapp:") ? propre : `whatsapp:${propre}`;
}

export async function envoyerMessageWhatsApp(numeroDestinataire: string, corps: string) {
  return client.messages.create({
    from: FROM,
    to: toWhatsApp(numeroDestinataire),
    body: corps,
  });
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
