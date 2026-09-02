"use client";

import { useState } from "react";
import { ecrireAdmin } from "@/lib/admin/ecrire";

export function NotesAdminForm({ gestionnaireId, notesInitiales }: { gestionnaireId: string; notesInitiales: string }) {
  const [notes, setNotes] = useState(notesInitiales);
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer() {
    setChargement(true);
    setMessage(null);
    const resultat = await ecrireAdmin("client.updateNotes", { gestionnaireId, notes });
    setMessage(!resultat.ok ? resultat.error : "Enregistré.");
    setChargement(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-texte-secondaire">Visibles uniquement depuis le backoffice admin.</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={8}
        placeholder="Notes internes sur ce client…"
        className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={chargement}
          onClick={enregistrer}
          className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
        >
          {chargement ? "Enregistrement..." : "Enregistrer"}
        </button>
        {message && <p className="text-sm text-texte-secondaire">{message}</p>}
      </div>
    </div>
  );
}
