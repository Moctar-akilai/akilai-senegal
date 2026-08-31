"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Ajoute un message du gestionnaire (auteur='client') au fil du ticket de
// support. C'est un dialogue interne à la plateforme entre le gestionnaire
// et l'équipe support AkilAI — aucun envoi externe (pas de WhatsApp) ici.
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
      auteur: "client",
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
        placeholder="Écrire un message à l'équipe support AkilAI…"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
      {erreur && <p className="mt-1 text-sm text-red-600">{erreur}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={chargement || !contenu.trim()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {chargement ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
