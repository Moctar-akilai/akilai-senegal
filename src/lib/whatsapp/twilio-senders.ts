// ============================================================================
// ⚠️ ZONE D'INCERTITUDE — Twilio Senders API (WhatsApp Tech Provider / Embedded Signup)
// ============================================================================
// L'accès Twilio Tech Provider et la Configuration ID Meta sont en cours de
// démarche au moment de l'écriture de ce fichier — rien ci-dessous n'a pu
// être testé avec un vrai compte approuvé. L'endpoint et la forme du corps
// sont écrits sur la base de la documentation Twilio "Senders API"
// (Messaging v2 Channels Senders, utilisée pour le "WhatsApp Coexistence"
// self-serve via Embedded Signup) connue au moment de l'écriture, mais
// cette API était encore en évolution. À VÉRIFIER dès que l'accès Tech
// Provider est confirmé, dans l'ordre :
//
//   1. L'endpoint exact. https://messaging.twilio.com/v2/Channels/Senders
//      est le nom le plus probable au moment de l'écriture — reconfirmer
//      dans la documentation/console Twilio à jour (elle a changé plusieurs
//      fois pendant la beta de cette fonctionnalité).
//   2. Les noms de champs exacts du corps pour lier un waba_id +
//      phone_number_id (issus de l'Embedded Signup Meta) à ce sous-compte
//      Twilio. Ci-dessous, on suppose un objet "configuration" avec
//      waba_id/phone_number_id — Twilio utilise peut-être des noms
//      différents (ex. "whatsapp_business_account_id"), ou attend le
//      "code" d'autorisation Meta brut plutôt que les IDs déjà résolus.
//   3. sender_id : suppose ici `whatsapp:${phoneNumberId}`, ce qui est
//      presque certainement FAUX (sender_id attend vraisemblablement un
//      numéro E.164, pas le phone_number_id Meta, qui est un identifiant
//      opaque) — Twilio le déduit peut-être lui-même depuis waba_id/
//      phone_number_id sans qu'on ait besoin de le fournir.
//   4. Si la création du sender est synchrone (réponse immédiate avec le
//      statut final) ou asynchrone (statut "PENDING" puis webhook de
//      confirmation à écouter, ou polling GET sur la ressource créée).
//   5. Comment récupérer le numéro E.164 confirmé une fois le sender actif
//      — peut-être directement dans la réponse Twilio (sender_id), ou il
//      peut falloir interroger l'API Meta Graph
//      (GET /{phone_number_id}?fields=display_phone_number) avec un token
//      System User Meta. Cela nécessiterait une variable d'environnement
//      supplémentaire non prévue dans la liste initiale de cette tâche
//      (ex. META_SYSTEM_USER_TOKEN) — non implémenté ici, seulement noté.
//
// Tant que ces points ne sont pas vérifiés, cette fonction est écrite en
// best-effort : elle ne doit jamais faire échouer l'enregistrement de
// waba_id/phone_number_id côté AkilAI (voir l'appelant, qui l'exécute après
// coup et journalise sans bloquer).
// ============================================================================

type ResultatFinalisationSender =
  | { ok: true; numeroWhatsapp: string | null }
  | { ok: false; erreur: string };

export async function finaliserSenderTwilio(
  wabaId: string,
  phoneNumberId: string
): Promise<ResultatFinalisationSender> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { ok: false, erreur: "TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN non configurées." };
  }

  const identifiants = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    // TODO(Twilio Tech Provider) : endpoint + corps à reconfirmer — voir le
    // bloc de commentaires en tête de fichier, points 1 à 3.
    const reponse = await fetch("https://messaging.twilio.com/v2/Channels/Senders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${identifiants}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // TODO: sender_id ci-dessous est presque certainement incorrect,
        // voir le point 3 du bloc de commentaires en tête de fichier.
        sender_id: `whatsapp:${phoneNumberId}`,
        configuration: {
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
        },
      }),
    });

    const corps = await reponse.json().catch(() => null);

    if (!reponse.ok) {
      return {
        ok: false,
        erreur:
          corps?.message ?? `Twilio a répondu ${reponse.status} — endpoint/corps à vérifier (voir TODO en tête de fichier).`,
      };
    }

    // TODO: confirmer le champ exact contenant le numéro E.164 une fois le
    // sender actif — voir le point 5 du bloc de commentaires en tête de
    // fichier. sender_id est une supposition raisonnable mais non vérifiée.
    const numeroWhatsapp = typeof corps?.sender_id === "string" ? corps.sender_id : null;

    return { ok: true, numeroWhatsapp };
  } catch (erreur) {
    console.error("[twilio-senders] Échec de l'appel à l'API Senders Twilio:", erreur);
    return {
      ok: false,
      erreur: erreur instanceof Error ? erreur.message : "Erreur réseau lors de l'appel à l'API Twilio Senders.",
    };
  }
}
