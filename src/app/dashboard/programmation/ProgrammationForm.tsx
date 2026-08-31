"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JOURS_SEMAINE } from "@/lib/automatisations/programmation";

type Programmation = {
  jours_actifs: number[];
  heure_debut: string;
  heure_fin: string;
  actif: boolean;
};

const PROGRAMMATION_PAR_DEFAUT: Programmation = {
  jours_actifs: [1, 2, 3, 4, 5, 6, 7],
  heure_debut: "08:00",
  heure_fin: "20:00",
  actif: false,
};

function versChampHeure(heure: string) {
  return heure.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
}

export function ProgrammationForm({
  automatisations,
  programmationsParAutomatisation,
}: {
  automatisations: { id: string; nom: string }[];
  programmationsParAutomatisation: Record<string, Programmation | null>;
}) {
  const supabase = createClient();
  const [automatisationId, setAutomatisationId] = useState(automatisations[0]?.id ?? "");

  function programmationInitiale(id: string): Programmation {
    const p = programmationsParAutomatisation[id];
    if (!p) return PROGRAMMATION_PAR_DEFAUT;
    return {
      jours_actifs: p.jours_actifs,
      heure_debut: versChampHeure(p.heure_debut),
      heure_fin: versChampHeure(p.heure_fin),
      actif: p.actif,
    };
  }

  const [programmation, setProgrammation] = useState<Programmation>(
    programmationInitiale(automatisationId)
  );
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(
    null
  );
  const [chargement, setChargement] = useState(false);

  function changerAutomatisation(id: string) {
    setAutomatisationId(id);
    setProgrammation(programmationInitiale(id));
    setMessage(null);
  }

  function basculerJour(valeur: number) {
    setProgrammation((p) => ({
      ...p,
      jours_actifs: p.jours_actifs.includes(valeur)
        ? p.jours_actifs.filter((j) => j !== valeur)
        : [...p.jours_actifs, valeur].sort((a, b) => a - b),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!automatisationId) return;
    setChargement(true);
    setMessage(null);

    const { error } = await supabase.from("programmations").upsert(
      {
        automatisation_id: automatisationId,
        jours_actifs: programmation.jours_actifs,
        heure_debut: programmation.heure_debut,
        heure_fin: programmation.heure_fin,
        actif: programmation.actif,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "automatisation_id" }
    );

    setMessage(
      error
        ? { type: "erreur", texte: error.message }
        : { type: "succes", texte: "Programmation enregistrée." }
    );
    setChargement(false);
  }

  if (automatisations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
        Aucune automatisation à programmer pour l&apos;instant.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6 rounded-lg border border-neutral-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Automatisation à programmer
        </label>
        <select
          value={automatisationId}
          onChange={(e) => changerAutomatisation(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          {automatisations.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nom}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={programmation.actif}
          onChange={(e) => setProgrammation((p) => ({ ...p, actif: e.target.checked }))}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-neutral-900">
          Activer une programmation horaire
        </span>
      </label>
      <p className="-mt-4 text-xs text-neutral-500">
        Si désactivé, l&apos;automatisation tourne sans restriction d&apos;horaire (24h/7j).
      </p>

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">Jours actifs</p>
        <div className="flex flex-wrap gap-2">
          {JOURS_SEMAINE.map((jour) => {
            const actif = programmation.jours_actifs.includes(jour.valeur);
            return (
              <button
                key={jour.valeur}
                type="button"
                onClick={() => basculerJour(jour.valeur)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  actif
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {jour.abrege}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Heure de début</label>
          <input
            type="time"
            value={programmation.heure_debut}
            onChange={(e) => setProgrammation((p) => ({ ...p, heure_debut: e.target.value }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Heure de fin</label>
          <input
            type="time"
            value={programmation.heure_fin}
            onChange={(e) => setProgrammation((p) => ({ ...p, heure_fin: e.target.value }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
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
