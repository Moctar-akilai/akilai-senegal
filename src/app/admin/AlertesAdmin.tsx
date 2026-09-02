"use client";

import { useState } from "react";
import Link from "next/link";

export type Alerte = { titre: string; description: string; lien?: string };

// Section rétractable — l'ouverture/fermeture est un pur état d'affichage
// local, sans lien avec les données (contrairement à lu_par_gestionnaire
// sur les tickets, une notion différente).
export function AlertesAdmin({ alertes }: { alertes: Alerte[] }) {
  const [ouvert, setOuvert] = useState(true);

  return (
    <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-encre">
          Alertes
          {alertes.length > 0 && (
            <span className="rounded-full bg-erreur px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
              {alertes.length}
            </span>
          )}
        </span>
        <span className="text-xs text-texte-secondaire">{ouvert ? "Masquer ▲" : "Afficher ▼"}</span>
      </button>

      {ouvert && (
        <div className="border-t border-bordure p-4">
          {alertes.length === 0 ? (
            <p className="text-sm text-texte-secondaire">Aucune alerte pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-2">
              {alertes.map((a, i) => (
                <li key={i} className="rounded-lg bg-attention-pastel/40 px-3 py-2">
                  {a.lien ? (
                    <Link href={a.lien} className="text-sm font-medium text-encre hover:underline">
                      {a.titre}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-encre">{a.titre}</p>
                  )}
                  <p className="text-xs text-texte-secondaire">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
