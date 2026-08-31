"use client";

import type { EvenementAgenda } from "./CalendarGrid";

function formatDateHeure(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Structure prête pour afficher un vrai rendez-vous une fois les
// intégrations Google Calendar / Calendly branchées — vide tant qu'aucun
// événement réel n'existe.
export function EvenementModal({
  evenement,
  onFermer,
}: {
  evenement: EvenementAgenda | null;
  onFermer: () => void;
}) {
  if (!evenement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onFermer}
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold text-neutral-900">{evenement.titre}</h3>
        <p className="mb-4 text-sm text-neutral-500">
          {formatDateHeure(evenement.debut)} → {formatDateHeure(evenement.fin)}
        </p>

        {evenement.lieu && (
          <p className="mb-2 text-sm text-neutral-700">
            <span className="font-medium">Lieu : </span>
            {evenement.lieu}
          </p>
        )}
        {evenement.description && (
          <p className="mb-4 text-sm text-neutral-700">{evenement.description}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="flex-1 rounded-md border border-neutral-300 py-2 text-sm font-medium text-neutral-400"
          >
            Modifier
          </button>
          <button
            type="button"
            disabled
            className="flex-1 rounded-md border border-neutral-300 py-2 text-sm font-medium text-neutral-400"
          >
            Supprimer
          </button>
        </div>
        <button
          type="button"
          onClick={onFermer}
          className="mt-3 w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
