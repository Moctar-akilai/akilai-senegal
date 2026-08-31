"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { connecterIntegration } from "@/lib/integrations/connecter";
import type { Fournisseur } from "@/lib/integrations/fournisseurs";

export function ConnexionCleApiModal({
  ouvert,
  fournisseur,
  nom,
  aide,
  onFermer,
  onConnecte,
}: {
  ouvert: boolean;
  fournisseur: Fournisseur;
  nom: string;
  aide?: { texte: string; url: string };
  onFermer: () => void;
  onConnecte: (resultat: { statut: string; apercu: string; messageErreur: string | null }) => void;
}) {
  const [cleApi, setCleApi] = useState("");
  const [visible, setVisible] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!ouvert) return null;

  function fermer() {
    setCleApi("");
    setVisible(false);
    setErreur(null);
    onFermer();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cleApi.trim()) return;
    setChargement(true);
    setErreur(null);

    const resultat = await connecterIntegration(fournisseur, cleApi.trim());

    if (!resultat.ok) {
      setErreur(resultat.error);
      setChargement(false);
      return;
    }

    setChargement(false);
    onConnecte(resultat.data);
    setCleApi("");
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={fermer}>
      <div
        className="w-full max-w-sm rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold text-encre">Connexion à {nom}</h3>
        <p className="mb-4 text-sm text-texte-secondaire">
          Collez votre clé API {nom}. Elle est chiffrée avant stockage et ne sera plus jamais
          affichée en clair.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Clé API</label>
            <div className="relative">
              <input
                type={visible ? "text" : "password"}
                required
                autoFocus
                value={cleApi}
                onChange={(e) => setCleApi(e.target.value)}
                placeholder="Collez votre clé ici"
                className="w-full rounded-lg border border-bordure px-3 py-2 pr-10 text-sm outline-none focus:border-argile-forte"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-texte-secondaire transition-colors hover:text-encre"
                aria-label={visible ? "Masquer la clé" : "Afficher la clé"}
              >
                {visible ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {aide && (
            <a
              href={aide.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-texte-secondaire underline hover:text-encre"
            >
              {aide.texte}
            </a>
          )}

          {erreur && <p className="text-sm text-erreur">{erreur}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={fermer}
              className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={chargement || !cleApi.trim()}
              className="flex-1 rounded-lg bg-argile-forte py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
            >
              {chargement ? "Vérification..." : "Vérifier et connecter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
