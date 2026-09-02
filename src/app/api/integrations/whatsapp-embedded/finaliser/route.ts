import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { finaliserSenderTwilio } from "@/lib/whatsapp/twilio-senders";

// Reçoit waba_id/phone_number_id une fois le flow WhatsApp Embedded Signup
// (Meta) terminé côté navigateur (voir WhatsappEmbeddedSignup.tsx). Deux
// étapes volontairement séparées :
//   1. Enregistrement waba_id/phone_number_id + mode_connexion='embedded_signup'
//      — toujours fiable, ne dépend d'aucun accès Twilio.
//   2. Finalisation Twilio (finaliserSenderTwilio) — best-effort, l'accès
//      Tech Provider n'étant pas encore confirmé au moment de l'écriture
//      (voir les TODO dans src/lib/whatsapp/twilio-senders.ts). Un échec
//      ici ne doit jamais faire échouer l'étape 1 ni cette requête.

type DonneesReponse = {
  modeConnexion: "embedded_signup";
  numeroWhatsapp: string | null;
  avertissement: string | null;
};
type Reponse = { ok: true; data: DonneesReponse } | { ok: false; error: string };

function erreur(message: string, status = 400) {
  return NextResponse.json<Reponse>({ ok: false, error: message }, { status });
}

function estString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !estString(body.waba_id) || !estString(body.phone_number_id)) {
    return erreur("waba_id et phone_number_id sont requis.");
  }
  const wabaId = body.waba_id.trim();
  const phoneNumberId = body.phone_number_id.trim();

  let gestionnaire: { id: string };
  try {
    gestionnaire = await getGestionnaireActuel();
  } catch {
    return erreur("Non authentifié.", 401);
  }

  const supabase = createServiceClient();

  const { error: erreurEcriture } = await supabase
    .from("parametres_compte")
    .update({
      whatsapp_waba_id: wabaId,
      whatsapp_phone_number_id: phoneNumberId,
      whatsapp_mode_connexion: "embedded_signup",
    })
    .eq("gestionnaire_id", gestionnaire.id);

  if (erreurEcriture) return erreur(erreurEcriture.message, 500);

  const resultat = await finaliserSenderTwilio(wabaId, phoneNumberId);

  let numeroWhatsapp: string | null = null;
  let avertissement: string | null = null;

  if (resultat.ok) {
    numeroWhatsapp = resultat.numeroWhatsapp;
    if (numeroWhatsapp) {
      const { error: erreurNumero } = await supabase
        .from("parametres_compte")
        .update({ numero_whatsapp: numeroWhatsapp })
        .eq("gestionnaire_id", gestionnaire.id);
      if (erreurNumero) {
        console.error(
          "[whatsapp-embedded/finaliser] Échec de la mise à jour de numero_whatsapp pour gestionnaire_id=",
          gestionnaire.id,
          ":",
          erreurNumero
        );
        avertissement = "Numéro confirmé par Twilio mais non enregistré — à vérifier manuellement.";
      }
    } else {
      avertissement =
        "Numéro connecté mais non confirmé automatiquement par Twilio — à vérifier manuellement (voir TODO dans twilio-senders.ts).";
    }
  } else {
    console.error(
      "[whatsapp-embedded/finaliser] Échec de la finalisation Twilio pour gestionnaire_id=",
      gestionnaire.id,
      "waba_id=",
      wabaId,
      "phone_number_id=",
      phoneNumberId,
      ":",
      resultat.erreur
    );
    avertissement =
      "Connexion Meta enregistrée, mais la finalisation Twilio a échoué — à vérifier manuellement (voir logs serveur et TODO dans twilio-senders.ts).";
  }

  return NextResponse.json<Reponse>({
    ok: true,
    data: { modeConnexion: "embedded_signup", numeroWhatsapp, avertissement },
  });
}
