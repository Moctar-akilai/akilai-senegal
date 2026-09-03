"use client";

import { useState } from "react";
import { ecrireAdmin } from "@/lib/admin/ecrire";

const PLANS = ["Essentiel", "Croissance", "Pro"];

// Le parent démonte ce composant quand la modale est fermée : le
// formulaire repart à neuf à chaque ouverture (même schéma que
// ConfigurerBaseNotionModal.tsx / NouveauRdvModal.tsx).
export function NouveauLeadModal({
  ouvert,
  onFermer,
  onCree,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onCree: () => void;
}) {
  if (!ouvert) return null;
  return <FormulaireNouveauLead onFermer={onFermer} onCree={onCree} />;
}

function FormulaireNouveauLead({ onFermer, onCree }: { onFermer: () => void; onCree: () => void }) {
  const [nom, setNom] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");
  const [planEstime, setPlanEstime] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) {
      setErreur("Le nom est requis.");
      return;
    }
    setChargement(true);
    setErreur(null);
    const resultat = await ecrireAdmin("lead.create", {
      nom: nom.trim(),
      entreprise: entreprise || null,
      telephone: telephone || null,
      email: email || null,
      source: source || null,
      planEstime: planEstime || null,
    });
    setChargement(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    onCree();
    onFermer();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="w-full max-w-md rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-encre">Nouveau lead</h3>
        <form onSubmit={creer} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Nom</label>
            <input
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Entreprise</label>
            <input
              value={entreprise}
              onChange={(e) => setEntreprise(e.target.value)}
              className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-encre">Téléphone</label>
              <input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-encre">Source</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="closer, entrant…"
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre">Plan estimé</label>
              <select
                value={planEstime}
                onChange={(e) => setPlanEstime(e.target.value)}
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              >
                <option value="">—</option>
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
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
              {chargement ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
