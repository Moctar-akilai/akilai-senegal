import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import {
  PRIORITE_TICKET_BADGE,
  PRIORITE_TICKET_LABEL,
  STATUT_TICKET_BADGE,
  STATUT_TICKET_LABEL,
  type PrioriteTicket,
  type StatutTicket,
} from "@/lib/crm/statuts";
import { TicketStatutPrioriteForm } from "./TicketStatutPrioriteForm";
import { TicketReplyForm } from "./TicketReplyForm";

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
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, titre, description, priorite, statut, created_at, contact_id, automatisation_id, contacts(id, nom, telephone), automatisations(id, nom)"
    )
    .eq("id", id)
    .eq("gestionnaire_id", user.id)
    .maybeSingle();

  if (!ticket) notFound();

  const contact = Array.isArray(ticket.contacts) ? ticket.contacts[0] : ticket.contacts;
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
        <Link href="/dashboard/tickets" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Tickets
        </Link>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-neutral-900">{ticket.titre}</h1>
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

        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600">
          <span>
            Contact lié :{" "}
            {contact ? (
              <Link href={`/dashboard/crm/${contact.id}`} className="text-neutral-900 hover:underline">
                {contact.nom || contact.telephone}
              </Link>
            ) : (
              "—"
            )}
          </span>
          <span>Automatisation concernée : {automatisation?.nom ?? "—"}</span>
        </div>

        {ticket.description && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-neutral-700">{ticket.description}</p>
        )}

        <TicketStatutPrioriteForm
          ticketId={ticket.id}
          prioriteInitiale={ticket.priorite as PrioriteTicket}
          statutInitial={ticket.statut as StatutTicket}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 p-4">
          {(!messages || messages.length === 0) && (
            <p className="py-8 text-center text-sm text-neutral-500">Aucun message pour l&apos;instant.</p>
          )}

          {messages?.map((m) => {
            const estGestionnaire = m.auteur === "gestionnaire";
            return (
              <div key={m.id} className={`flex flex-col ${estGestionnaire ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    estGestionnaire ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.contenu}</p>
                </div>
                <span className="mt-1 text-xs text-neutral-400">{formatHeure(m.created_at)}</span>
              </div>
            );
          })}
        </div>

        <TicketReplyForm ticketId={ticket.id} />
      </div>
    </div>
  );
}
