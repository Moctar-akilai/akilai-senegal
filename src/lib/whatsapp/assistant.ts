import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

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

const TON_LABELS: Record<ParametresAssistant["assistant_ton"], string> = {
  professionnel: "professionnel et courtois",
  amical: "amical et chaleureux",
  decontracte: "décontracté, familier mais respectueux",
};

function construireSystemPrompt(parametres: ParametresAssistant, contactNom: string | null) {
  const outils: string[] = [];
  if (parametres.outil_faq_actif) {
    outils.push("- Tu peux répondre aux questions fréquentes sur l'entreprise, ses produits ou ses services.");
  }
  if (parametres.outil_prise_rdv_actif) {
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
  historique: MessageHistorique[]
): Promise<string> {
  const messages: Anthropic.MessageParam[] = historique
    .filter((m) => m.contenu && m.contenu.trim().length > 0)
    .map((m) => ({
      role: m.direction === "entrant" ? ("user" as const) : ("assistant" as const),
      content: m.type_message === "audio" ? `[message vocal] ${m.contenu}` : m.contenu!,
    }));

  if (messages.length === 0 || messages[0].role !== "user") {
    // L'API exige que le premier message soit "user".
    messages.unshift({ role: "user", content: "(Bonjour)" });
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: construireSystemPrompt(parametres, contactNom),
    output_config: { effort: "low" },
    messages,
  });

  if (response.stop_reason === "refusal") {
    return "Désolé, je ne peux pas répondre à cette demande. Un membre de l'équipe reviendra vers vous rapidement.";
  }

  const texte = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  return texte?.trim() || "Désolé, je n'ai pas bien compris. Pouvez-vous reformuler ?";
}
