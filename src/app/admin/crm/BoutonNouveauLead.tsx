"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NouveauLeadModal } from "./NouveauLeadModal";

export function BoutonNouveauLead() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile"
      >
        + Nouveau lead
      </button>
      <NouveauLeadModal ouvert={ouvert} onFermer={() => setOuvert(false)} onCree={() => router.refresh()} />
    </>
  );
}
