// Emails transactionnels envoyés par la plateforme AkilAI elle-même (ex :
// notification "nouvelle réponse à votre ticket"), via l'API REST Resend
// (pas le SDK npm, pour rester cohérent avec le reste du projet — voir
// notion.ts/google-calendar.ts qui font pareil). À ne pas confondre avec
// l'intégration Resend que les clients peuvent connecter avec leur PROPRE
// clé API (src/lib/integrations/fournisseurs.ts) : RESEND_API_KEY ici est
// la clé du compte Resend d'AkilAI, côté plateforme.
const RESEND_API_URL = "https://api.resend.com/emails";

// TODO: domaine d'envoi à vérifier une fois un domaine personnalisé
// configuré et validé côté Resend — un sous-domaine vercel.app ne peut pas
// servir d'adresse d'envoi vérifiée.
const EMAIL_FROM = "AkilAI <notifications@akilai.example.com>";
const BASE_URL = "https://akilai-senegal.vercel.app";

function echapperHtml(texte: string): string {
  return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Notifie le gestionnaire par email qu'une réponse support a été ajoutée à
// l'un de ses tickets — TODO resté en suspens depuis la construction
// initiale des tickets, voir src/app/api/admin/write/route.ts (action
// ticket.addMessageSupport) pour l'appelant. Laisse volontairement remonter
// ses erreurs : c'est l'appelant qui décide de ne jamais bloquer
// l'enregistrement de la réponse support dessus (best-effort).
export async function envoyerEmailReponseTicket(
  destinataire: string,
  titreTicket: string,
  ticketId: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY n'est pas configurée.");
  }

  const lien = `${BASE_URL}/dashboard/tickets/${ticketId}`;
  const titreEchappe = echapperHtml(titreTicket);

  const reponse = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: destinataire,
      subject: `Nouvelle réponse à votre ticket "${titreTicket}"`,
      html: `
        <p>Bonjour,</p>
        <p>L'équipe support AkilAI a répondu à votre ticket <strong>${titreEchappe}</strong>.</p>
        <p><a href="${lien}">Voir la réponse</a></p>
        <p>— L'équipe AkilAI</p>
      `,
    }),
  });

  if (!reponse.ok) {
    const corps = await reponse.json().catch(() => null);
    throw new Error(corps?.message ?? `Resend a répondu ${reponse.status}.`);
  }
}
