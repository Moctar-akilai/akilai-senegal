"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Ajoute un message interne (auteur='gestionnaire') à l'historique du
// ticket. N'envoie rien au contact pour l'instant — c'est un journal
// interne, pas un canal d'envoi WhatsApp réel.
export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [contenu, setContenu] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenu.trim()) return;
    setChargement(true);
    setErreur(null);

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticketId,
      auteur: "gestionnaire",
      contenu: contenu.trim(),
    });

    if (error) {
      setErreur(error.message);
      setChargement(false);
      return;
    }

    setContenu("");
    setChargement(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-neutral-100 p-4">
      <textarea
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        rows={3}
        placeholder="Ajouter une réponse (historique interne)…"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
      {erreur && <p className="mt-1 text-sm text-red-600">{erreur}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={chargement || !contenu.trim()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {chargement ? "Envoi..." : "Répondre"}
        </button>
      </div>
    </form>
  );
}
