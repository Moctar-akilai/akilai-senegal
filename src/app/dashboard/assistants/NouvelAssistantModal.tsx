"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

// Le parent démonte ce composant quand la modale est fermée : le
// formulaire repart à neuf à chaque ouverture (même schéma que
// ConfigurerBaseNotionModal.tsx / NouveauLeadModal.tsx).
export function NouvelAssistantModal({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  if (!ouvert) return null;
  return <FormulaireNouvelAssistant onFermer={onFermer} />;
}

function FormulaireNouvelAssistant({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
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
    const resultat = await ecrireDashboard<{ id: string }>("assistant.create", { nom: nom.trim() });
    setChargement(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    onFermer();
    router.push(`/dashboard/assistants/${resultat.data.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="w-full max-w-sm rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-encre">Nouvel assistant</h3>
        <form onSubmit={creer} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Nom de l&apos;assistant</label>
            <input
              required
              autoFocus
              value={nom}
              onChange={(e) => setNom(e.target.value)}
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
              {chargement ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
