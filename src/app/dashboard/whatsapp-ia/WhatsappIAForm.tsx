"use client";

import { useState } from "react";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

type ParametresAssistant = {
  assistant_nom: string;
  langue: string;
  assistant_prompt: string;
  assistant_ton: "professionnel" | "amical" | "decontracte";
  outil_faq_actif: boolean;
  outil_prise_rdv_actif: boolean;
  outil_transfert_humain_actif: boolean;
  outil_infos_pratiques_actif: boolean;
};

const OUTILS_ACTIFS: {
  cle: keyof Pick<
    ParametresAssistant,
    "outil_faq_actif" | "outil_prise_rdv_actif" | "outil_transfert_humain_actif" | "outil_infos_pratiques_actif"
  >;
  label: string;
}[] = [
  { cle: "outil_faq_actif", label: "Questions fréquentes (FAQ)" },
  { cle: "outil_prise_rdv_actif", label: "Prise de rendez-vous" },
  { cle: "outil_transfert_humain_actif", label: "Transfert vers un humain" },
  { cle: "outil_infos_pratiques_actif", label: "Infos pratiques (horaires, localisation…)" },
];

const OUTILS_A_VENIR = ["Google Calendar", "Calendly", "CRM AkilAI"];

export function WhatsappIAForm({
  numeroWhatsapp,
  parametresInitiaux,
}: {
  numeroWhatsapp: string | null;
  parametresInitiaux: ParametresAssistant;
}) {
  const [parametres, setParametres] = useState(parametresInitiaux);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(
    null
  );
  const [chargement, setChargement] = useState(false);

  function set<K extends keyof ParametresAssistant>(cle: K, valeur: ParametresAssistant[K]) {
    setParametres((p) => ({ ...p, [cle]: valeur }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setMessage(null);

    // ⚠️ Contournement temporaire de l'authentification — écrit via
    // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
    // tant que le bypass est actif. Voir le commentaire en haut de cette
    // route API. gestionnaireId n'est pas transmis : le gestionnaire cible
    // vient de getGestionnaireActuel() côté serveur.
    const resultat = await ecrireDashboard("assistant.update", parametres);

    setMessage(
      !resultat.ok
        ? { type: "erreur", texte: resultat.error }
        : { type: "succes", texte: "Configuration mise à jour." }
    );
    setChargement(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Nom de l&apos;assistant</label>
        <input
          required
          value={parametres.assistant_nom}
          onChange={(e) => set("assistant_nom", e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Langue</label>
          <select
            value={parametres.langue}
            onChange={(e) => set("langue", e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value="Français">Français</option>
            <option value="Anglais">Anglais</option>
            <option value="Wolof">Wolof</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Ton</label>
          <select
            value={parametres.assistant_ton}
            onChange={(e) => set("assistant_ton", e.target.value as ParametresAssistant["assistant_ton"])}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value="professionnel">Professionnel</option>
            <option value="amical">Amical</option>
            <option value="decontracte">Décontracté</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Numéro Twilio</label>
        <p className="w-full max-w-sm rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          {numeroWhatsapp || "Non configuré"}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Lecture seule ici — modifiable depuis Paramètres → Mon compte.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Prompt système
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
        <p className="text-sm font-medium text-neutral-700">Outils actifs</p>
        {OUTILS_ACTIFS.map((outil) => (
          <label key={outil.cle} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={parametres[outil.cle]}
              onChange={(e) => set(outil.cle, e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-neutral-800">{outil.label}</span>
          </label>
        ))}

        {OUTILS_A_VENIR.map((nom) => (
          <label key={nom} className="flex items-center gap-2 opacity-60">
            <input type="checkbox" disabled className="h-4 w-4" />
            <span className="text-sm text-neutral-600">{nom}</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Bientôt disponible
            </span>
          </label>
        ))}
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
