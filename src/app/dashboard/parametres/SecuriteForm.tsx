"use client";

import { useState } from "react";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

export function SecuriteForm() {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(
    null
  );
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (motDePasse !== confirmation) {
      setMessage({ type: "erreur", texte: "Les mots de passe ne correspondent pas." });
      return;
    }

    setChargement(true);
    // ⚠️ Contournement temporaire de l'authentification — sans vraie
    // session, supabase.auth.updateUser() côté navigateur n'a personne à
    // mettre à jour. Passe par /api/dashboard/write, qui utilise l'API
    // admin de Supabase Auth (auth.admin.updateUserById, disponible avec
    // service_role) pour changer le mot de passe du compte de test ciblé
    // par getGestionnaireActuel(). Voir le commentaire en haut de cette
    // route API.
    const resultat = await ecrireDashboard("compte.updatePassword", { motDePasse });

    setMessage(
      !resultat.ok
        ? { type: "erreur", texte: resultat.error }
        : { type: "succes", texte: "Mot de passe mis à jour." }
    );
    if (resultat.ok) {
      setMotDePasse("");
      setConfirmation("");
    }
    setChargement(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Nouveau mot de passe
        </label>
        <input
          required
          type="password"
          minLength={6}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Confirmer le mot de passe
        </label>
        <input
          required
          type="password"
          minLength={6}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
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
        {chargement ? "Enregistrement..." : "Mettre à jour le mot de passe"}
      </button>
    </form>
  );
}
