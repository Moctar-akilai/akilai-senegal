"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

// Ajoute un message du gestionnaire (auteur='client') au fil du ticket de
// support. C'est un dialogue interne à la plateforme entre le gestionnaire
// et l'équipe support AkilAI — aucun envoi externe (pas de WhatsApp) ici.
export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [contenu, setContenu] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenu.trim()) return;
    setChargement(true);
    setErreur(null);

    // ⚠️ Contournement temporaire de l'authentification — écrit via
    // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
    // tant que le bypass est actif. Voir le commentaire en haut de cette
    // route API.
    const resultat = await ecrireDashboard("ticket.addMessage", {
      ticketId,
      contenu: contenu.trim(),
    });

    if (!resultat.ok) {
      setErreur(resultat.error);
      setChargement(false);
      return;
    }

    setContenu("");
    setChargement(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-bordure p-4">
      <textarea
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        rows={3}
        placeholder="Écrire un message à l'équipe support AkilAI…"
        className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
      />
      {erreur && <p className="mt-1 text-sm text-erreur">{erreur}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={chargement || !contenu.trim()}
          className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
        >
          {chargement ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
