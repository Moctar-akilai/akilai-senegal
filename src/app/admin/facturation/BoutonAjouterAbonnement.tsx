"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AjouterAbonnementModal } from "./AjouterAbonnementModal";

export function BoutonAjouterAbonnement({
  clients,
  prixPlans,
}: {
  clients: { id: string; nom: string; plan: string }[];
  prixPlans: Record<string, number>;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile"
      >
        + Ajouter un abonnement
      </button>
      <AjouterAbonnementModal
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        onCree={() => router.refresh()}
        clients={clients}
        prixPlans={prixPlans}
      />
    </>
  );
}
