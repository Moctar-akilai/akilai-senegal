"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ParametresCompte = {
  assistant_whatsapp_actif: boolean;
  numero_whatsapp: string | null;
  assistant_nom: string;
  assistant_prompt: string;
  assistant_ton: "professionnel" | "amical" | "decontracte";
  outil_faq_actif: boolean;
  outil_prise_rdv_actif: boolean;
  outil_transfert_humain_actif: boolean;
  outil_infos_pratiques_actif: boolean;
};

export function AssistantForm({
  gestionnaireId,
  parametresInitiaux,
}: {
  gestionnaireId: string;
  parametresInitiaux: ParametresCompte;
}) {
  const supabase = createClient();
  const [parametres, setParametres] = useState(parametresInitiaux);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(
    null
  );
  const [chargement, setChargement] = useState(false);

  function set<K extends keyof ParametresCompte>(cle: K, valeur: ParametresCompte[K]) {
    setParametres((p) => ({ ...p, [cle]: valeur }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setMessage(null);

    const { error } = await supabase
      .from("parametres_compte")
      .update({
        ...parametres,
        numero_whatsapp: parametres.numero_whatsapp?.trim() || null,
      })
      .eq("gestionnaire_id", gestionnaireId);

    setMessage(
      error
        ? { type: "erreur", texte: error.message }
        : { type: "succes", texte: "Assistant WhatsApp mis à jour." }
    );
    setChargement(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={parametres.assistant_whatsapp_actif}
          onChange={(e) => set("assistant_whatsapp_actif", e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-neutral-900">Activer l&apos;assistant WhatsApp</span>
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Numéro WhatsApp Twilio assigné
        </label>
        <input
          value={parametres.numero_whatsapp ?? ""}
          onChange={(e) => set("numero_whatsapp", e.target.value)}
          placeholder="whatsapp:+221771234567"
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Numéro utilisé pour identifier les messages destinés à ce compte.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Nom de l&apos;assistant</label>
        <input
          required
          value={parametres.assistant_nom}
          onChange={(e) => set("assistant_nom", e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Ton</label>
        <select
          value={parametres.assistant_ton}
          onChange={(e) => set("assistant_ton", e.target.value as ParametresCompte["assistant_ton"])}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          <option value="professionnel">Professionnel</option>
          <option value="amical">Amical</option>
          <option value="decontracte">Décontracté</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Instructions pour l&apos;assistant
        </label>
        <textarea
          value={parametres.assistant_prompt}
          onChange={(e) => set("assistant_prompt", e.target.value)}
          rows={6}
          placeholder="Décris ton activité, ce que l'assistant doit savoir répondre, tes horaires, tes produits/services…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Ce texte est entièrement libre — il guide toutes les réponses de l&apos;assistant.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700">Outils activés</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={parametres.outil_faq_actif}
            onChange={(e) => set("outil_faq_actif", e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-neutral-800">Répondre aux questions fréquentes</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={parametres.outil_prise_rdv_actif}
            onChange={(e) => set("outil_prise_rdv_actif", e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-neutral-800">Prise de rendez-vous</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={parametres.outil_transfert_humain_actif}
            onChange={(e) => set("outil_transfert_humain_actif", e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-neutral-800">Transfert vers un humain</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={parametres.outil_infos_pratiques_actif}
            onChange={(e) => set("outil_infos_pratiques_actif", e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-neutral-800">Infos pratiques (horaires, localisation…)</span>
        </label>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "erreur" ? "text-red-600" : "text-green-600"}`}>
          {message.texte}
        </p>
      )}

      <button
        type="submit"
        disabled={chargement}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {chargement ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
