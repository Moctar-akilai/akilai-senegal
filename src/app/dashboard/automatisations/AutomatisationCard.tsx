"use client";

import { useState } from "react";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

type Statut = "actif" | "inactif" | "erreur";

export type LogMessage = {
  id: string;
  direction: "entrant" | "sortant";
  contenu: string | null;
  created_at: string;
  contactNom: string | null;
  contactTelephone: string;
};

const BADGE_STYLES: Record<Statut, string> = {
  actif: "bg-green-100 text-green-700",
  inactif: "bg-neutral-100 text-neutral-600",
  erreur: "bg-red-100 text-red-700",
};

const BADGE_LABELS: Record<Statut, string> = {
  actif: "Actif",
  inactif: "Inactif",
  erreur: "Erreur",
};

function formatDateHeure(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extrait(texte: string | null, longueur = 60) {
  if (!texte) return "(vide)";
  return texte.length > longueur ? `${texte.slice(0, longueur)}…` : texte;
}

export function AutomatisationCard({
  id,
  nom,
  description,
  statutInitial,
  logs,
}: {
  id: string;
  nom: string;
  description: string | null;
  statutInitial: Statut;
  logs: LogMessage[];
}) {
  const [statut, setStatut] = useState<Statut>(statutInitial);
  const [chargement, setChargement] = useState(false);

  async function basculer() {
    const nouveauStatut: "actif" | "inactif" = statut === "actif" ? "inactif" : "actif";
    setChargement(true);
    // ⚠️ Contournement temporaire de l'authentification — écrit via
    // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
    // tant que le bypass est actif. Voir le commentaire en haut de cette
    // route API.
    const resultat = await ecrireDashboard("automatisation.setStatut", {
      id,
      statut: nouveauStatut,
    });
    if (resultat.ok) setStatut(nouveauStatut);
    setChargement(false);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-neutral-900">{nom}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[statut]}`}>
              {BADGE_LABELS[statut]}
            </span>
          </div>
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        </div>

        <label className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-neutral-500">{statut === "actif" ? "Activée" : "Désactivée"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={statut === "actif"}
            disabled={chargement || statut === "erreur"}
            onClick={basculer}
            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
              statut === "actif" ? "bg-neutral-900" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                statut === "actif" ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Logs récents
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucun message échangé pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-1.5">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-neutral-700">
                  <span className="font-medium">{log.contactNom || log.contactTelephone}</span>
                  {" — "}
                  {extrait(log.contenu)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    log.direction === "sortant"
                      ? "bg-neutral-100 text-neutral-600"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {log.direction === "sortant" ? "Envoyé" : "Reçu"}
                </span>
                <span className="shrink-0 text-xs text-neutral-400">
                  {formatDateHeure(log.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
