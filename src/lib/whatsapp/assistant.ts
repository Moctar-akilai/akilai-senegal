import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OUTILS_RENDEZ_VOUS, executerOutilRendezVous } from "./outils-rendezvous";

const MODEL = "gpt-4o";
const MAX_TOURS_OUTILS = 5; // garde-fou contre une boucle d'appels d'outils

// Le client n'est instancié qu'au premier appel réel (jamais au chargement
// du module) : Next.js exécute le module au moment du build ("Collecting
// page data"), où OPENAI_API_KEY n'est pas garantie disponible. Un
// `new OpenAI()` au niveau du module ferait échouer le build avec
// "Missing credentials" même quand la clé est bien configurée à l'exécution.
let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) openai = new OpenAI();
  return openai;
}

export type ParametresAssistant = {
  assistant_nom: string;
  assistant_prompt: string;
  assistant_ton: "professionnel" | "amical" | "decontracte";
  outil_faq_actif: boolean;
  outil_prise_rdv_actif: boolean;
  outil_transfert_humain_actif: boolean;
  outil_infos_pratiques_actif: boolean;
};

export type MessageHistorique = {
  direction: "entrant" | "sortant";
  type_message: "texte" | "audio";
  contenu: string | null;
};

export type ContexteAssistant = {
  gestionnaireId: string;
  contactId: string;
  // Vérifié par l'appelant (voir le webhook) avant de générer la réponse :
  // les outils de rendez-vous ne sont exposés à OpenAI que si Google
  // Calendar est réellement connecté pour ce gestionnaire.
  googleCalendarConnecte: boolean;
};

const TON_LABELS: Record<ParametresAssistant["assistant_ton"], string> = {
  professionnel: "professionnel et courtois",
  amical: "amical et chaleureux",
  decontracte: "décontracté, familier mais respectueux",
};

function construireSystemPrompt(
  parametres: ParametresAssistant,
  contactNom: string | null,
  googleCalendarConnecte: boolean
) {
  const outils: string[] = [];
  if (parametres.outil_faq_actif) {
    outils.push("- Tu peux répondre aux questions fréquentes sur l'entreprise, ses produits ou ses services.");
  }
  if (parametres.outil_prise_rdv_actif && googleCalendarConnecte) {
    outils.push(
      "- Tu peux prendre, reporter ou annuler un rendez-vous directement via les outils fournis (verifier_disponibilite, prendre_rendez_vous, annuler_ou_reporter_rendez_vous). Vérifie TOUJOURS la disponibilité avec verifier_disponibilite avant de proposer ou de confirmer un créneau — n'invente jamais une disponibilité que tu n'as pas vérifiée. Une fois un rendez-vous pris, reporté ou annulé, confirme-le clairement au client (jour et heure)."
    );
  } else if (parametres.outil_prise_rdv_actif) {
    outils.push(
      "- Tu peux aider le client à prendre rendez-vous : propose-lui d'indiquer ses disponibilités et confirme que la demande sera traitée."
    );
  }
  if (parametres.outil_transfert_humain_actif) {
    outils.push(
      "- Si la demande dépasse ce que tu peux traiter (réclamation, cas complexe, demande explicite), propose de transférer la conversation à un membre de l'équipe."
    );
  }
  if (parametres.outil_infos_pratiques_actif) {
    outils.push(
      "- Tu peux partager les horaires d'ouverture, la localisation ou d'autres informations pratiques si elles sont mentionnées dans tes instructions ci-dessous."
    );
  }

  return [
    `Tu es ${parametres.assistant_nom}, l'assistant WhatsApp d'une entreprise. Ton ton doit rester ${TON_LABELS[parametres.assistant_ton]} en toute circonstance.`,
    contactNom
      ? `Tu échanges avec ${contactNom}.`
      : `Tu ne connais pas encore le nom de la personne à qui tu écris.`,
    "",
    "Instructions données par l'entreprise (à suivre en priorité, tant qu'elles restent légales et raisonnables) :",
    parametres.assistant_prompt?.trim() || "(aucune instruction spécifique fournie)",
    "",
    "Outils et comportements activés :",
    outils.length > 0 ? outils.join("\n") : "- Aucun outil spécifique activé : réponds simplement de façon utile et polie.",
    "",
    "Règles générales : réponds dans la langue utilisée par le client. Reste concis, adapté à une conversation WhatsApp (pas de formatage markdown, pas de listes à puces sauf si vraiment utile, quelques phrases courtes maximum). Ne prétends jamais être un humain si on te le demande directement.",
  ].join("\n");
}

export async function genererReponseAssistant(
  parametres: ParametresAssistant,
  contactNom: string | null,
  historique: MessageHistorique[],
  contexte: ContexteAssistant
): Promise<string> {
  const messagesHistorique: ChatCompletionMessageParam[] = historique
    .filter((m) => m.contenu && m.contenu.trim().length > 0)
    .map((m) => ({
      role: m.direction === "entrant" ? ("user" as const) : ("assistant" as const),
      content: m.contenu!,
    }));

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: construireSystemPrompt(parametres, contactNom, contexte.googleCalendarConnecte) },
    ...messagesHistorique,
  ];

  const outilsDisponibles =
    parametres.outil_prise_rdv_actif && contexte.googleCalendarConnecte ? OUTILS_RENDEZ_VOUS : undefined;

  // Boucle d'appels d'outils : tant que le modèle demande un outil, on
  // l'exécute et on relance un tour avec le résultat, jusqu'à une réponse
  // texte finale (ou MAX_TOURS_OUTILS atteint, garde-fou contre une boucle).
  for (let tour = 0; tour < MAX_TOURS_OUTILS; tour++) {
    let completion;
    try {
      completion = await getOpenAIClient().chat.completions.create({
        model: MODEL,
        max_tokens: 500,
        messages,
        ...(outilsDisponibles ? { tools: outilsDisponibles } : {}),
      });
    } catch (erreur) {
      console.error(
        "[assistant] Échec de l'appel OpenAI chat.completions.create (modèle:",
        MODEL,
        ", nb messages historique:",
        messagesHistorique.length,
        "):",
        erreur
      );
      throw erreur;
    }

    const choix = completion.choices[0];
    if (choix?.finish_reason === "content_filter") {
      console.error("[assistant] Réponse OpenAI bloquée par le content filter.");
      return "Désolé, je ne peux pas répondre à cette demande. Un membre de l'équipe reviendra vers vous rapidement.";
    }

    const appelsOutils = choix?.message?.tool_calls;
    if (appelsOutils && appelsOutils.length > 0) {
      messages.push(choix.message);
      for (const appel of appelsOutils) {
        if (appel.type !== "function") continue;
        const resultat = await executerOutilRendezVous(appel.function.name, appel.function.arguments, {
          gestionnaireId: contexte.gestionnaireId,
          contactId: contexte.contactId,
        });
        messages.push({ role: "tool", tool_call_id: appel.id, content: resultat });
      }
      continue;
    }

    if (!choix?.message?.content?.trim()) {
      console.error(
        "[assistant] Réponse OpenAI vide ou inattendue, finish_reason:",
        choix?.finish_reason,
        "completion complète:",
        JSON.stringify(completion)
      );
    }

    return choix?.message?.content?.trim() || "Désolé, je n'ai pas bien compris. Pouvez-vous reformuler ?";
  }

  console.error("[assistant] Nombre maximal de tours d'outils atteint sans réponse finale.");
  return "Désolé, je rencontre une difficulté technique pour traiter votre demande. Un membre de l'équipe reviendra vers vous rapidement.";
}

// Transcrit un message vocal WhatsApp via Whisper (OpenAI) pour que
// l'assistant puisse réagir au contenu réel plutôt qu'à un texte de
// remplacement.
export async function transcrireAudio(
  buffer: Buffer,
  contentType: string,
  nomFichier: string
): Promise<string | null> {
  try {
    const fichier = new File([new Uint8Array(buffer)], nomFichier, { type: contentType });
    const transcription = await getOpenAIClient().audio.transcriptions.create({
      file: fichier,
      model: "whisper-1",
    });
    return transcription.text?.trim() || null;
  } catch (erreur) {
    console.error(
      "[assistant] Échec de la transcription audio Whisper (fichier:",
      nomFichier,
      ", contentType:",
      contentType,
      "):",
      erreur
    );
    return null;
  }
}
