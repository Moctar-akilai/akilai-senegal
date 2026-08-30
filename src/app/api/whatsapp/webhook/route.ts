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

export const runtime = "nodejs";

const NB_MESSAGES_CONTEXTE = 20;

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
    return twiml();
  }

  const supabase = createServiceClient();

  const { data: parametres } = await supabase
    .from("parametres_compte")
    .select(
      "gestionnaire_id, assistant_whatsapp_actif, assistant_nom, assistant_prompt, assistant_ton, outil_faq_actif, outil_prise_rdv_actif, outil_transfert_humain_actif, outil_infos_pratiques_actif"
    )
    .eq("numero_whatsapp", to)
    .maybeSingle();

  // Numéro non configuré côté AkilAI : on ne peut pas savoir à quel
  // compte router ce message.
  if (!parametres) {
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
      } catch {
        // Le message est tout de même enregistré, sans audio récupérable
        // ni transcription.
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
    return twiml();
  }

  const { data: historique } = await supabase
    .from("conversations_whatsapp")
    .select("direction, type_message, contenu, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(NB_MESSAGES_CONTEXTE);

  const historiqueChronologique = (historique ?? []).slice().reverse();

  let reponse: string;
  try {
    reponse = await genererReponseAssistant(
      parametres as unknown as ParametresAssistant,
      contactNom,
      historiqueChronologique
    );
  } catch {
    return twiml();
  }

  await supabase.from("conversations_whatsapp").insert({
    gestionnaire_id: gestionnaireId,
    contact_id: contactId,
    direction: "sortant",
    type_message: "texte",
    contenu: reponse,
  });

  return twiml(reponse);
}
