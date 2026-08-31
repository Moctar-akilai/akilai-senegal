"use client";

import { useState } from "react";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

export function CompteForm({
  nomInitial,
  telephoneInitial,
  numeroWhatsappInitial,
}: {
  nomInitial: string;
  telephoneInitial: string;
  numeroWhatsappInitial: string | null;
}) {
  const [nom, setNom] = useState(nomInitial);
  const [telephone, setTelephone] = useState(telephoneInitial);
  const [numeroWhatsapp, setNumeroWhatsapp] = useState(numeroWhatsappInitial ?? "");
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(
    null
  );
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setMessage(null);

    // ⚠️ Contournement temporaire de l'authentification — écrit via
    // /api/dashboard/write (service_role côté serveur) au lieu du client
    // Supabase anon, RLS-bloqué tant que le bypass est actif. Voir le
    // commentaire en haut de cette route API. userId n'est pas transmis :
    // le gestionnaire cible vient de getGestionnaireActuel() côté serveur.
    const resultat = await ecrireDashboard("compte.update", {
      nom,
      telephone,
      numeroWhatsapp: numeroWhatsapp.trim() || null,
    });

    setMessage(
      !resultat.ok
        ? { type: "erreur", texte: resultat.error }
        : { type: "succes", texte: "Informations mises à jour." }
    );
    setChargement(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-encre">Nom</label>
        <input
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-encre">Téléphone</label>
        <input
          required
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-encre">
          Numéro WhatsApp Twilio
        </label>
        <input
          value={numeroWhatsapp}
          onChange={(e) => setNumeroWhatsapp(e.target.value)}
          placeholder="whatsapp:+221771234567"
          className="w-full max-w-sm rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
        <p className="mt-1 text-xs text-texte-secondaire">
          Numéro utilisé pour identifier les messages destinés à ce compte (affiché en lecture
          seule dans WhatsApp &amp; IA).
        </p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "erreur" ? "text-erreur" : "text-succes"}`}>
          {message.texte}
        </p>
      )}

      <button
        type="submit"
        disabled={chargement}
        className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
      >
        {chargement ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
