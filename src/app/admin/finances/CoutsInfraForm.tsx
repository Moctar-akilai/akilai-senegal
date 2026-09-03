"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireAdmin } from "@/lib/admin/ecrire";
import { POSTES_INFRA, POSTE_INFRA_LABEL } from "@/lib/admin/finances";

type DonneesMois = Record<string, number>;

function valeursVides(): DonneesMois {
  return Object.fromEntries(POSTES_INFRA.map((p) => [p, 0]));
}

export function CoutsInfraForm({
  moisDisponibles,
  donneesParMois,
  moisEnCoursISO,
}: {
  moisDisponibles: { value: string; label: string }[];
  donneesParMois: Record<string, DonneesMois>;
  moisEnCoursISO: string;
}) {
  const router = useRouter();
  const [moisSelectionne, setMoisSelectionne] = useState(moisDisponibles[0]?.value ?? moisEnCoursISO);
  const [valeurs, setValeurs] = useState<DonneesMois>(donneesParMois[moisSelectionne] ?? valeursVides());
  const [confirmation, setConfirmation] = useState<DonneesMois | null>(null);
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function changerMois(nouveauMois: string) {
    setMoisSelectionne(nouveauMois);
    setValeurs(donneesParMois[nouveauMois] ?? valeursVides());
    setConfirmation(null);
    setMessage(null);
  }

  function changerValeur(poste: string, valeur: string) {
    setValeurs((prev) => ({ ...prev, [poste]: Number(valeur) || 0 }));
    setMessage(null);
  }

  async function enregistrerValeurs(v: DonneesMois) {
    setChargement(true);
    setMessage(null);
    const resultat = await ecrireAdmin("finances.saveCoutsInfra", { mois: moisSelectionne, montants: v });
    setChargement(false);
    setConfirmation(null);
    setMessage(!resultat.ok ? resultat.error : "Enregistré.");
    router.refresh();
  }

  // Un mois déjà passé (pas le mois en cours) demande une double
  // confirmation avant sauvegarde — voir §5 de la tâche qui a créé ce
  // formulaire.
  const estMoisPasse = moisSelectionne < moisEnCoursISO;

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (estMoisPasse) {
      setConfirmation(valeurs);
      return;
    }
    enregistrerValeurs(valeurs);
  }

  const anciennesValeurs = donneesParMois[moisSelectionne] ?? valeursVides();

  return (
    <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
      <h2 className="mb-4 text-sm font-medium text-encre">Coûts d&apos;infrastructure</h2>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-texte-secondaire">Mois</label>
        <select
          value={moisSelectionne}
          onChange={(e) => changerMois(e.target.value)}
          className="rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        >
          {moisDisponibles.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {confirmation ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-attention-pastel/40 px-3 py-2 text-sm text-attention-pastel-texte">
            Vous modifiez un mois déjà passé — vérifiez les nouvelles valeurs avant de confirmer.
          </p>
          <ul className="space-y-1 text-sm">
            {POSTES_INFRA.map((poste) => (
              <li key={poste} className="flex justify-between">
                <span className="text-texte-secondaire">{POSTE_INFRA_LABEL[poste]}</span>
                <span>
                  {(anciennesValeurs[poste] ?? 0).toLocaleString("fr-FR")} →{" "}
                  <span className="font-medium text-encre">{(confirmation[poste] ?? 0).toLocaleString("fr-FR")}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmation(null)}
              className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={chargement}
              onClick={() => enregistrerValeurs(confirmation)}
              className="flex-1 rounded-lg bg-argile-forte py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
            >
              {chargement ? "..." : "Confirmer"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={soumettre} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {POSTES_INFRA.map((poste) => (
              <div key={poste}>
                <label className="mb-1 block text-xs font-medium text-texte-secondaire">
                  {POSTE_INFRA_LABEL[poste]}
                </label>
                <input
                  type="number"
                  min="0"
                  value={valeurs[poste] ?? 0}
                  onChange={(e) => changerValeur(poste, e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
            ))}
          </div>
          {message && <p className="text-sm text-texte-secondaire">{message}</p>}
          <button
            type="submit"
            disabled={chargement}
            className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
          >
            {chargement ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      )}
    </div>
  );
}
