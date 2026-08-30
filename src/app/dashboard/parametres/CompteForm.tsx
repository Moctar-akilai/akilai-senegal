"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CompteForm({
  userId,
  nomInitial,
  telephoneInitial,
}: {
  userId: string;
  nomInitial: string;
  telephoneInitial: string;
}) {
  const supabase = createClient();
  const [nom, setNom] = useState(nomInitial);
  const [telephone, setTelephone] = useState(telephoneInitial);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(
    null
  );
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setMessage(null);

    const { error } = await supabase
      .from("profils")
      .update({ nom, telephone })
      .eq("id", userId);

    setMessage(
      error
        ? { type: "erreur", texte: error.message }
        : { type: "succes", texte: "Informations mises à jour." }
    );
    setChargement(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Nom</label>
        <input
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Téléphone</label>
        <input
          required
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === "erreur" ? "text-red-600" : "text-green-600"}`}>
          {message.texte}
        </p>
      )}

      <button
        type="submit"
        disabled={chargement}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {chargement ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
