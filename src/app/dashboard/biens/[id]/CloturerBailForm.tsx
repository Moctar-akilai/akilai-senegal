"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MOTIFS_CLOTURE = [
  { valeur: "termine", label: "Terminé (fin normale)" },
  { valeur: "resilie", label: "Résilié" },
];

export function CloturerBailForm({ bailId }: { bailId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [ouvert, setOuvert] = useState(false);
  const [dateFin, setDateFin] = useState(new Date().toISOString().slice(0, 10));
  const [motif, setMotif] = useState("termine");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error } = await supabase
      .from("baux")
      .update({ date_fin: dateFin, statut: motif })
      .eq("id", bailId);

    if (error) {
      setErreur(error.message);
      setChargement(false);
      return;
    }

    setChargement(false);
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400"
      >
        Clôturer le bail
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Date de fin</label>
          <input
            required
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Motif</label>
          <select
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            {MOTIFS_CLOTURE.map((m) => (
              <option key={m.valeur} value={m.valeur}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={chargement}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {chargement ? "Enregistrement..." : "Confirmer la clôture"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-md px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
