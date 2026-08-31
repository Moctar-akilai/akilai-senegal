import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import {
  PRIORITE_TICKET_BADGE,
  PRIORITE_TICKET_LABEL,
  STATUT_TICKET_BADGE,
  STATUT_TICKET_LABEL,
  type PrioriteTicket,
  type StatutTicket,
} from "@/lib/crm/statuts";
import { TicketPrioriteForm } from "./TicketPrioriteForm";
import { TicketReplyForm } from "./TicketReplyForm";

// TODO: quand le statut d'un message 'support' est ajouté depuis le
// backoffice, envoyer un email de notification au gestionnaire via Resend,
// sur son email de compte.

function formatHeure(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, titre, description, priorite, statut, created_at, automatisation_id, automatisations(id, nom)"
    )
    .eq("id", id)
    .eq("gestionnaire_id", user.id)
    .maybeSingle();

  if (!ticket) notFound();

  const automatisation = Array.isArray(ticket.automatisations)
    ? ticket.automatisations[0]
    : ticket.automatisations;

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, auteur, contenu, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/tickets" className="text-sm text-texte-secondaire hover:text-encre">
          ← Tickets
        </Link>
      </div>

      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-encre">{ticket.titre}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITE_TICKET_BADGE[ticket.priorite as PrioriteTicket]}`}
          >
            {PRIORITE_TICKET_LABEL[ticket.priorite as PrioriteTicket]}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_TICKET_BADGE[ticket.statut as StatutTicket]}`}
          >
            {STATUT_TICKET_LABEL[ticket.statut as StatutTicket]}
          </span>
        </div>

        <p className="mb-4 text-sm text-texte-secondaire">
          Automatisation concernée : {automatisation?.nom ?? "—"}
        </p>

        {ticket.description && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-encre">{ticket.description}</p>
        )}

        <TicketPrioriteForm ticketId={ticket.id} prioriteInitiale={ticket.priorite as PrioriteTicket} />
      </div>

      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
        <div className="flex flex-col gap-3 p-4">
          {(!messages || messages.length === 0) && (
            <p className="py-8 text-center text-sm text-texte-secondaire">Aucun message pour l&apos;instant.</p>
          )}

          {messages?.map((m) => {
            const estClient = m.auteur === "client";
            return (
              <div key={m.id} className={`flex flex-col ${estClient ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    estClient ? "bg-argile-forte text-white" : "bg-bordure text-encre"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.contenu}</p>
                </div>
                <span className="mt-1 text-xs text-texte-secondaire">{formatHeure(m.created_at)}</span>
              </div>
            );
          })}
        </div>

        <TicketReplyForm ticketId={ticket.id} />
      </div>
    </div>
  );
}
