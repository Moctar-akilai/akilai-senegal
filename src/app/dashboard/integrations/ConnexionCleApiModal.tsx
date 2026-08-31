"use client";

import { useState } from "react";
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
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold text-neutral-900">Connexion à {nom}</h3>
        <p className="mb-4 text-sm text-neutral-500">
          Collez votre clé API {nom}. Elle est chiffrée avant stockage et ne sera plus jamais
          affichée en clair.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Clé API</label>
            <div className="relative">
              <input
                type={visible ? "text" : "password"}
                required
                autoFocus
                value={cleApi}
                onChange={(e) => setCleApi(e.target.value)}
                placeholder="Collez votre clé ici"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm outline-none focus:border-neutral-900"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700"
                aria-label={visible ? "Masquer la clé" : "Afficher la clé"}
              >
                {visible ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          {aide && (
            <a
              href={aide.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-neutral-500 underline hover:text-neutral-900"
            >
              {aide.texte}
            </a>
          )}

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={fermer}
              className="flex-1 rounded-md border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={chargement || !cleApi.trim()}
              className="flex-1 rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {chargement ? "Vérification..." : "Vérifier et connecter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
