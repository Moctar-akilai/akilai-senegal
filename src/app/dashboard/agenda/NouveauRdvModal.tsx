"use client";

import { useState } from "react";

// Le parent démonte ce composant quand la modale est fermée (comme
// ConfigurerBaseNotionModal) : le formulaire repart à neuf à chaque
// ouverture sans effet de réinitialisation nécessaire.
export function NouveauRdvModal({
  ouvert,
  onFermer,
  onCree,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onCree: () => void;
}) {
  if (!ouvert) return null;
  return <FormulaireNouveauRdv onFermer={onFermer} onCree={onCree} />;
}

function FormulaireNouveauRdv({ onFermer, onCree }: { onFermer: () => void; onCree: () => void }) {
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [description, setDescription] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/integrations/google-calendar/evenements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, date, heureDebut, heureFin, description: description.trim() || null }),
      });
      const corps = await reponse.json().catch(() => null);
      if (!reponse.ok || !corps?.ok) {
        setErreur(corps?.error ?? "Impossible de créer le rendez-vous.");
        return;
      }
      onCree();
      onFermer();
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="w-full max-w-md rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-encre">Nouveau rendez-vous</h3>
        <form onSubmit={creer} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Titre</label>
            <input
              required
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-encre">Date</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre">Début</label>
              <input
                required
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre">Fin</label>
              <input
                required
                type="time"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
            />
          </div>

          {erreur && <p className="text-sm text-erreur">{erreur}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onFermer}
              className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={chargement}
              className="flex-1 rounded-lg bg-argile-forte py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
            >
              {chargement ? "Création..." : "Créer le rendez-vous"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
