import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  numeroSansPrefixeWhatsApp,
  telechargerMediaTwilio,
  validerSignatureTwilio,
} from "@/lib/whatsapp/twilio";
import {
  genererReponseAssistant,
  transcrireAudio,
  type ParametresAssistant,
} from "@/lib/whatsapp/assistant";
import { estGoogleCalendarConnecte } from "@/lib/integrations/statut";
import { estDansPlageAutorisee, MESSAGE_HORS_HORAIRES } from "@/lib/automatisations/programmation";

export const runtime = "nodejs";

const NB_MESSAGES_CONTEXTE = 20;

// Répond au webhook avec du TwiML plutôt qu'un appel explicite à l'API
// Twilio. Twilio envoie alors le message en réponse depuis le numéro exact
// qui a reçu le message entrant (le "To" de la requête), vers son
// expéditeur — sans qu'on ait besoin de connaître ni de spécifier de "From"
// nous-mêmes. C'est ce qui permet à un même compte AkilAI de gérer
// plusieurs numéros WhatsApp Business sans configuration globale : il n'y a
// aucune dépendance à une variable d'environnement de type
// TWILIO_WHATSAPP_FROM dans ce fichier.
function twiml(corps?: string) {
  const message = corps ? `<Message>${escapeXml(corps)}</Message>` : "";
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${message}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(texte: string) {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extensionPourType(contentType: string) {
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("amr")) return "amr";
  return "audio";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host");
  const url = new URL(request.url);
  const urlPublique = `${proto}://${host}${url.pathname}${url.search}`;

  const signature = request.headers.get("x-twilio-signature");
  if (!validerSignatureTwilio(signature, urlPublique, params)) {
    return NextResponse.json({ erreur: "Signature Twilio invalide." }, { status: 403 });
  }

  const from = numeroSansPrefixeWhatsApp(params.From ?? "");
  const to = params.To ?? "";
  const corpsMessage = (params.Body ?? "").trim();
  const nbMedias = Number(params.NumMedia ?? "0");

  if (!from || !to) {
    console.error("[webhook] Requête sans From/To exploitable, params reçus:", params);
    return twiml();
  }

  const supabase = createServiceClient();

  const { data: parametres, error: erreurParametres } = await supabase
    .from("parametres_compte")
    .select(
      "gestionnaire_id, assistant_whatsapp_actif, assistant_nom, assistant_prompt, assistant_ton, outil_faq_actif, outil_prise_rdv_actif, outil_transfert_humain_actif, outil_infos_pratiques_actif"
    )
    .eq("numero_whatsapp", to)
    .maybeSingle();

  // Numéro non configuré côté AkilAI : on ne peut pas savoir à quel
  // compte router ce message.
  if (!parametres) {
    console.error(
      "[webhook] Aucun parametres_compte trouvé pour le numéro entrant To=",
      to,
      erreurParametres ? `(erreur Supabase: ${erreurParametres.message})` : "(aucune ligne ne correspond)"
    );
    return twiml();
  }

  const gestionnaireId = parametres.gestionnaire_id as string;

  // Trouve ou crée le contact — n'importe quel numéro peut écrire,
  // jamais rejeté comme dans l'ancien produit.
  const { data: contactExistant } = await supabase
    .from("contacts")
    .select("id, nom")
    .eq("gestionnaire_id", gestionnaireId)
    .eq("telephone", from)
    .maybeSingle();

  let contactId: string;
  let contactNom: string | null;

  if (contactExistant) {
    contactId = contactExistant.id;
    contactNom = contactExistant.nom;
    await supabase
      .from("contacts")
      .update({ derniere_interaction: new Date().toISOString() })
      .eq("id", contactId);
  } else {
    const { data: nouveauContact, error: erreurContact } = await supabase
      .from("contacts")
      .insert({ gestionnaire_id: gestionnaireId, telephone: from })
      .select("id, nom")
      .single();
    if (erreurContact || !nouveauContact) {
      console.error(
        "[webhook] Échec de la création du contact pour gestionnaire_id=",
        gestionnaireId,
        "telephone=",
        from,
        ":",
        erreurContact
      );
      return twiml();
    }
    contactId = nouveauContact.id;
    contactNom = nouveauContact.nom;
  }

  // Enregistre le message entrant (texte ou audio)
  let typeMessage: "texte" | "audio" = "texte";
  let contenuEntrant: string | null = corpsMessage || null;
  let audioUrl: string | null = null;

  if (nbMedias > 0) {
    const mediaUrl = params.MediaUrl0;
    const contentType = params.MediaContentType0 ?? "";
    if (mediaUrl && contentType.startsWith("audio/")) {
      typeMessage = "audio";
      let transcription: string | null = null;
      try {
        const { buffer, contentType: typeReel } = await telechargerMediaTwilio(mediaUrl);
        const extension = extensionPourType(typeReel);
        const chemin = `${gestionnaireId}/${contactId}/${Date.now()}.${extension}`;
        const { error: erreurUpload } = await supabase.storage
          .from("audios-whatsapp")
          .upload(chemin, buffer, { contentType: typeReel, upsert: false });
        if (!erreurUpload) audioUrl = chemin;

        transcription = await transcrireAudio(buffer, typeReel, `audio.${extension}`);
      } catch (erreurAudio) {
        // Le message est tout de même enregistré, sans audio récupérable
        // ni transcription.
        console.error(
          "[webhook] Échec du traitement du média audio (téléchargement/upload) pour gestionnaire_id=",
          gestionnaireId,
          "contact_id=",
          contactId,
          "mediaUrl=",
          mediaUrl,
          ":",
          erreurAudio
        );
      }
      contenuEntrant = corpsMessage || transcription || "(message vocal — transcription non disponible)";
    }
  }

  await supabase.from("conversations_whatsapp").insert({
    gestionnaire_id: gestionnaireId,
    contact_id: contactId,
    direction: "entrant",
    type_message: typeMessage,
    contenu: contenuEntrant,
    audio_url: audioUrl,
  });

  if (!parametres.assistant_whatsapp_actif) {
    console.error(
      "[webhook] assistant_whatsapp_actif=false pour gestionnaire_id=",
      gestionnaireId,
      "— aucune réponse ne sera envoyée (comportement attendu si l'assistant est désactivé côté dashboard)."
    );
    return twiml();
  }

  // Vérifie la programmation horaire de l'automatisation "Assistant
  // WhatsApp" de ce gestionnaire : si elle est active et qu'on est hors
  // des jours/heures autorisés, on répond un message par défaut au lieu
  // d'appeler GPT-4o.
  const { data: automatisation, error: erreurAutomatisation } = await supabase
    .from("automatisations")
    .select("id")
    .eq("gestionnaire_id", gestionnaireId)
    .eq("type", "whatsapp")
    .maybeSingle();

  if (erreurAutomatisation) {
    console.error(
      "[webhook] Échec de la lecture de l'automatisation 'whatsapp' pour gestionnaire_id=",
      gestionnaireId,
      ":",
      erreurAutomatisation
    );
  }

  if (automatisation) {
    const { data: programmation, error: erreurProgrammation } = await supabase
      .from("programmations")
      .select("jours_actifs, heure_debut, heure_fin, actif")
      .eq("automatisation_id", automatisation.id)
      .maybeSingle();

    if (erreurProgrammation) {
      console.error(
        "[webhook] Échec de la lecture de la programmation pour automatisation_id=",
        automatisation.id,
        ":",
        erreurProgrammation
      );
    }

    if (programmation && !estDansPlageAutorisee(programmation)) {
      console.error(
        "[webhook] Hors plage horaire autorisée pour gestionnaire_id=",
        gestionnaireId,
        "— envoi du message hors-horaires au lieu d'appeler l'assistant. programmation:",
        programmation
      );
      await supabase.from("conversations_whatsapp").insert({
        gestionnaire_id: gestionnaireId,
        contact_id: contactId,
        direction: "sortant",
        type_message: "texte",
        contenu: MESSAGE_HORS_HORAIRES,
      });
      return twiml(MESSAGE_HORS_HORAIRES);
    }
  }

  const { data: historique } = await supabase
    .from("conversations_whatsapp")
    .select("direction, type_message, contenu, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(NB_MESSAGES_CONTEXTE);

  const historiqueChronologique = (historique ?? []).slice().reverse();

  const googleCalendarConnecte = await estGoogleCalendarConnecte(supabase, gestionnaireId);

  let reponse: string;
  try {
    reponse = await genererReponseAssistant(
      parametres as unknown as ParametresAssistant,
      contactNom,
      historiqueChronologique,
      { gestionnaireId, contactId, googleCalendarConnecte }
    );
  } catch (erreurAssistant) {
    // C'est le point le plus probable d'échec silencieux : n'importe quelle
    // erreur ici (clé OPENAI_API_KEY manquante/invalide, quota dépassé,
    // erreur réseau, etc.) faisait auparavant retourner un TwiML vide sans
    // aucune trace — Twilio répond alors 200 mais n'envoie aucun message,
    // ce qui ressemble exactement à un "silence total" côté WhatsApp.
    console.error(
      "[webhook] Échec de genererReponseAssistant pour gestionnaire_id=",
      gestionnaireId,
      "contact_id=",
      contactId,
      ":",
      erreurAssistant
    );
    return twiml();
  }

  console.log(
    "[webhook] Réponse assistant générée avec succès pour gestionnaire_id=",
    gestionnaireId,
    "contact_id=",
    contactId,
    "longueur=",
    reponse.length
  );

  const { error: erreurInsertionSortant } = await supabase.from("conversations_whatsapp").insert({
    gestionnaire_id: gestionnaireId,
    contact_id: contactId,
    direction: "sortant",
    type_message: "texte",
    contenu: reponse,
  });

  if (erreurInsertionSortant) {
    console.error(
      "[webhook] Échec de l'enregistrement du message sortant en base pour gestionnaire_id=",
      gestionnaireId,
      "contact_id=",
      contactId,
      "— le TwiML sera tout de même renvoyé à Twilio:",
      erreurInsertionSortant
    );
  }

  return twiml(reponse);
}
