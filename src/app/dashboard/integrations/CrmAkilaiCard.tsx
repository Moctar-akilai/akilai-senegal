"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";
import { LogoAvecRepli } from "./LogoAvecRepli";

// CRM AkilAI est le CRM natif (/dashboard/crm), actif par défaut — pas une
// intégration au sens des autres cartes (pas de clé API, jamais
// "déconnecté"). Toujours cliquable vers le CRM, avec juste un badge
// Actif/Disponible et un bouton pour le redéfinir par défaut si un CRM
// externe a pris sa place. Voir integration.setCrmActif dans
// /api/dashboard/write.
export function CrmAkilaiCard({ estActifInitial }: { estActifInitial: boolean }) {
  const router = useRouter();
  const [estActif, setEstActif] = useState(estActifInitial);
  const [chargement, setChargement] = useState(false);

  async function reactiver() {
    setChargement(true);
    const resultat = await ecrireDashboard("integration.setCrmActif", { fournisseur: "crm_akilai" });
    if (resultat.ok) setEstActif(true);
    setChargement(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <Link href="/dashboard/crm" className="flex min-w-0 flex-1 items-center gap-3">
        <LogoAvecRepli src="/logos/crm-akilai.png" initiales="AI" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">CRM AkilAI</p>
          <span
            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              estActif ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {estActif ? "Actif" : "Disponible"}
          </span>
        </div>
      </Link>

      {!estActif && (
        <button
          type="button"
          disabled={chargement}
          onClick={reactiver}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {chargement ? "..." : "Réactiver comme CRM par défaut"}
        </button>
      )}
    </div>
  );
}
