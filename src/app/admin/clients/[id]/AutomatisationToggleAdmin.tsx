"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireAdmin } from "@/lib/admin/ecrire";

type StatutAutomatisation = "actif" | "inactif" | "erreur";

const BADGE: Record<StatutAutomatisation, string> = {
  actif: "bg-succes-pastel text-succes-pastel-texte",
  inactif: "bg-bordure text-texte-secondaire",
  erreur: "bg-erreur-pastel text-erreur-pastel-texte",
};

const LABEL: Record<StatutAutomatisation, string> = {
  actif: "Actif",
  inactif: "Inactif",
  erreur: "Erreur",
};

// Bascule actif/inactif directement depuis l'admin — écrit dans
// automatisations.statut ; le trigger existant (migration_002) synchronise
// automatiquement parametres_compte.assistant_whatsapp_actif, rien de plus
// à faire ici. Une automatisation en erreur ne peut être remise qu'à
// "actif" (pas de retour arrière vers "erreur" depuis l'UI).
export function AutomatisationToggleAdmin({
  automatisationId,
  gestionnaireId,
  statutInitial,
}: {
  automatisationId: string;
  gestionnaireId: string;
  statutInitial: StatutAutomatisation;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(statutInitial);
  const [chargement, setChargement] = useState(false);

  async function basculer() {
    const nouveauStatut = statut === "actif" ? "inactif" : "actif";
    setChargement(true);
    const resultat = await ecrireAdmin("automatisation.setStatut", {
      automatisationId,
      gestionnaireId,
      statut: nouveauStatut,
    });
    if (resultat.ok) setStatut(nouveauStatut);
    setChargement(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[statut]}`}>{LABEL[statut]}</span>
      <button
        type="button"
        disabled={chargement}
        onClick={basculer}
        className="rounded-lg border border-bordure px-3 py-1.5 text-xs font-medium text-encre hover:bg-bordure/60 disabled:opacity-50"
      >
        {statut === "actif" ? "Désactiver" : "Activer"}
      </button>
    </div>
  );
}
