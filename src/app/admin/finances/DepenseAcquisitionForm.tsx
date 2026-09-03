"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireAdmin } from "@/lib/admin/ecrire";

// Toujours le mois en cours (le CAC n'a de sens que pour le mois en cours
// dans cette première version) : pas de double confirmation nécessaire,
// contrairement à CoutsInfraForm qui permet de revenir sur des mois passés.
export function DepenseAcquisitionForm({ moisISO, montantInitial }: { moisISO: string; montantInitial: number }) {
  const router = useRouter();
  const [montant, setMontant] = useState(String(montantInitial));
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setMessage(null);
    const resultat = await ecrireAdmin("finances.saveDepenseAcquisition", {
      mois: moisISO,
      montant: Number(montant) || 0,
    });
    setChargement(false);
    setMessage(!resultat.ok ? resultat.error : "Enregistré.");
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-texte-secondaire">
          Dépense d&apos;acquisition ce mois (FCFA)
        </label>
        <input
          type="number"
          min="0"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className="w-40 rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </div>
      <button
        type="submit"
        disabled={chargement}
        className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
      >
        {chargement ? "..." : "Enregistrer"}
      </button>
      {message && <p className="text-sm text-texte-secondaire">{message}</p>}
    </form>
  );
}
