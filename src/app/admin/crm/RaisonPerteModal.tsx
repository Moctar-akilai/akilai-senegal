"use client";

import { useState } from "react";
import { ecrireAdmin } from "@/lib/admin/ecrire";

// Réutilisée à la fois par le drop d'une carte sur la colonne "Perdu"
// (LeadsKanban.tsx) et par le bouton "Marquer comme perdu" de la fiche
// détail (LeadDetailModal.tsx) : appelle elle-même l'action d'écriture,
// le parent n'a qu'à réagir à onConfirme une fois le raison enregistrée.
export function RaisonPerteModal({
  leadId,
  onFermer,
  onConfirme,
}: {
  leadId: string;
  onFermer: () => void;
  onConfirme: (raison: string) => void;
}) {
  const [raison, setRaison] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer() {
    if (!raison.trim()) return;
    setChargement(true);
    setErreur(null);
    const resultat = await ecrireAdmin("lead.marquerPerdu", { leadId, raison: raison.trim() });
    if (!resultat.ok) {
      setErreur(resultat.error);
      setChargement(false);
      return;
    }
    setChargement(false);
    onConfirme(raison.trim());
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="w-full max-w-sm rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-base font-semibold text-encre">Marquer ce lead comme perdu ?</h3>
        <textarea
          value={raison}
          onChange={(e) => setRaison(e.target.value)}
          rows={3}
          placeholder="Raison de la perte…"
          className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
        {erreur && <p className="mt-1 text-sm text-erreur">{erreur}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onFermer}
            className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={chargement || !raison.trim()}
            onClick={confirmer}
            className="flex-1 rounded-lg bg-erreur py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {chargement ? "..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
