import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { type PrioriteTicket, type StatutTicket } from "@/lib/crm/statuts";
import { TicketAdminForm } from "./TicketAdminForm";

function formatHeure(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, titre, description, priorite, statut, created_at, gestionnaire_id, automatisations(id, nom), profils(nom)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!ticket) notFound();

  const automatisation = Array.isArray(ticket.automatisations) ? ticket.automatisations[0] : ticket.automatisations;
  const profil = Array.isArray(ticket.profils) ? ticket.profils[0] : ticket.profils;

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, auteur, contenu, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tickets" className="text-sm text-texte-secondaire hover:text-encre">
          ← Support
        </Link>
      </div>

      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-encre">{ticket.titre}</h1>
        </div>
        <p className="mb-4 text-sm text-texte-secondaire">
          Client :{" "}
          <Link href={`/admin/clients/${ticket.gestionnaire_id}`} className="font-medium text-encre hover:underline">
            {profil?.nom ?? "—"}
          </Link>
          {" · "}Automatisation concernée : {automatisation?.nom ?? "—"}
        </p>

        {ticket.description && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-encre">{ticket.description}</p>
        )}

        <TicketAdminForm
          ticketId={ticket.id}
          statutInitial={ticket.statut as StatutTicket}
          prioriteInitiale={ticket.priorite as PrioriteTicket}
        />
      </div>

      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
        <div className="flex flex-col gap-3 p-4">
          {(!messages || messages.length === 0) && (
            <p className="py-8 text-center text-sm text-texte-secondaire">Aucun message pour l&apos;instant.</p>
          )}

          {/* Client à gauche, support (l'admin) à droite — inverse de la
              vue client (src/app/dashboard/tickets/[id]/page.tsx), où
              c'est le gestionnaire qui est aligné à droite. */}
          {messages?.map((m) => {
            const estSupport = m.auteur === "support";
            return (
              <div key={m.id} className={`flex flex-col ${estSupport ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    estSupport ? "bg-argile-forte text-white" : "bg-bordure text-encre"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.contenu}</p>
                </div>
                <span className="mt-1 text-xs text-texte-secondaire">{formatHeure(m.created_at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
