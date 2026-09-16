"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireAdmin } from "@/lib/admin/ecrire";

export function LimiteAssistantsForm({
  gestionnaireId,
  limiteInitiale,
}: {
  gestionnaireId: string;
  limiteInitiale: number;
}) {
  const router = useRouter();
  const [limite, setLimite] = useState(String(limiteInitiale));
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const valeur = Number(limite);
    if (!Number.isInteger(valeur) || valeur < 1) {
      setMessage("La limite doit être un nombre entier supérieur ou égal à 1.");
      return;
    }
    setChargement(true);
    setMessage(null);
    const resultat = await ecrireAdmin("client.updateLimiteAssistants", { gestionnaireId, limiteAssistants: valeur });
    setChargement(false);
    setMessage(!resultat.ok ? resultat.error : "Enregistré.");
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} className="flex items-center gap-2">
      <label className="text-xs text-texte-secondaire">Limite d&apos;assistants autorisés</label>
      <input
        type="number"
        min="1"
        value={limite}
        onChange={(e) => setLimite(e.target.value)}
        className="w-16 rounded-lg border border-bordure px-2 py-1 text-sm outline-none focus:border-argile-forte"
      />
      <button
        type="submit"
        disabled={chargement}
        className="rounded-lg bg-argile-forte px-3 py-1 text-xs font-medium text-white hover:bg-argile disabled:opacity-50"
      >
        {chargement ? "..." : "Enregistrer"}
      </button>
      {message && <span className="text-xs text-texte-secondaire">{message}</span>}
    </form>
  );
}
