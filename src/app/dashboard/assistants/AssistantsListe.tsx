"use client";

import { useState } from "react";
import Link from "next/link";
import { NouvelAssistantModal } from "./NouvelAssistantModal";

type Statut = "actif" | "inactif" | "erreur";

type Assistant = {
  id: string;
  nom: string;
  numeroWhatsapp: string | null;
  statut: Statut;
};

const BADGE_STYLES: Record<Statut, string> = {
  actif: "bg-succes-pastel text-succes-pastel-texte",
  inactif: "bg-bordure text-texte-secondaire",
  erreur: "bg-erreur-pastel text-erreur-pastel-texte",
};

const BADGE_LABELS: Record<Statut, string> = {
  actif: "Actif",
  inactif: "Inactif",
  erreur: "Erreur",
};

export function AssistantsListe({
  assistants,
  limiteAssistants,
}: {
  assistants: Assistant[];
  limiteAssistants: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const limiteAtteinte = assistants.length >= limiteAssistants;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-texte-secondaire">
          {assistants.length} / {limiteAssistants} assistant{limiteAssistants > 1 ? "s" : ""} autorisé
          {limiteAssistants > 1 ? "s" : ""}
        </p>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={limiteAtteinte}
            onClick={() => setOuvert(true)}
            className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Nouvel assistant
          </button>
          {limiteAtteinte && (
            <p className="max-w-xs text-right text-xs text-texte-secondaire">
              Limite atteinte — contactez le support pour en débloquer davantage.
            </p>
          )}
        </div>
      </div>

      {assistants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-bordure p-8 text-center text-sm text-texte-secondaire">
          Aucun assistant pour l&apos;instant.
        </div>
      ) : (
        <div className="space-y-3">
          {assistants.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/assistants/${a.id}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-bordure bg-carte p-5 shadow-[var(--shadow-carte)] transition-colors hover:bg-bordure/20"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-encre">{a.nom}</p>
                <p className="truncate text-sm text-texte-secondaire">
                  {a.numeroWhatsapp || "Numéro non configuré"}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[a.statut]}`}>
                {BADGE_LABELS[a.statut]}
              </span>
            </Link>
          ))}
        </div>
      )}

      <NouvelAssistantModal ouvert={ouvert} onFermer={() => setOuvert(false)} />
    </div>
  );
}
