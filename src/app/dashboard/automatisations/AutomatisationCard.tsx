"use client";

import { useState } from "react";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

type Statut = "actif" | "inactif" | "erreur";

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

export function AutomatisationCard({
  id,
  nom,
  statutInitial,
}: {
  id: string;
  nom: string;
  statutInitial: Statut;
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
    <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-encre">{nom}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[statut]}`}>
            {BADGE_LABELS[statut]}
          </span>
        </div>

        <label className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-texte-secondaire">{statut === "actif" ? "Activée" : "Désactivée"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={statut === "actif"}
            disabled={chargement || statut === "erreur"}
            onClick={basculer}
            className={`relative h-6 w-11 shrink-0 rounded-full p-0 transition-colors disabled:opacity-50 ${
              statut === "actif" ? "bg-argile-forte" : "bg-bordure"
            }`}
          >
            {/* Position explicite (left-0.5/top-0.5) plutôt que de compter sur
                la "static position" par défaut d'un enfant absolute dans un
                <button> : celle-ci dépend du padding par défaut du navigateur
                sur les boutons, ce qui décentrait le rond et rendait les
                marges gauche/droite asymétriques. */}
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-carte transition-transform ${
                statut === "actif" ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
