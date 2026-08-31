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
  type StatutContact,
  type StatutTicket,
} from "@/lib/crm/statuts";
import { ContactInfoForm } from "./ContactInfoForm";

const NB_MESSAGES_HISTORIQUE = 10;

function formatDateHeure(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extrait(texte: string | null, longueur = 80) {
  if (!texte) return "(vide)";
  return texte.length > longueur ? `${texte.slice(0, longueur)}…` : texte;
}

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, nom, telephone, email, statut, notes")
    .eq("id", id)
    .eq("gestionnaire_id", user.id)
    .maybeSingle();

  if (!contact) notFound();

  const [{ data: historique }, { data: tickets }] = await Promise.all([
    supabase
      .from("conversations_whatsapp")
      .select("id, direction, contenu, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(NB_MESSAGES_HISTORIQUE),
    supabase
      .from("tickets")
      .select("id, titre, priorite, statut, created_at")
      .eq("contact_id", id)
      .eq("gestionnaire_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/crm" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← CRM
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {contact.nom || `Contact sans nom (${contact.telephone})`}
        </h1>
        <p className="text-sm text-neutral-500">
          {contact.telephone}
          {contact.email && ` · ${contact.email}`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Informations</h2>
          <ContactInfoForm
            contactId={contact.id}
            statutInitial={contact.statut as StatutContact}
            notesInitial={contact.notes ?? ""}
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-900">Historique WhatsApp</h2>
              <Link
                href={`/dashboard/messages/${contact.id}`}
                className="text-xs text-neutral-500 hover:text-neutral-900"
              >
                Voir la conversation complète →
              </Link>
            </div>
            {!historique || historique.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun message échangé pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2">
                {historique.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span
                        className={`mr-2 rounded-full px-2 py-0.5 text-xs ${
                          m.direction === "sortant"
                            ? "bg-neutral-100 text-neutral-600"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {m.direction === "sortant" ? "Envoyé" : "Reçu"}
                      </span>
                      <span className="text-neutral-700">{extrait(m.contenu)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {formatDateHeure(m.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-medium text-neutral-900">Tickets</h2>
            {!tickets || tickets.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun ticket lié à ce contact.</p>
            ) : (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/dashboard/tickets/${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      <span className="min-w-0 flex-1 truncate text-neutral-800">{t.titre}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITE_TICKET_BADGE[t.priorite as PrioriteTicket]}`}
                      >
                        {PRIORITE_TICKET_LABEL[t.priorite as PrioriteTicket]}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_TICKET_BADGE[t.statut as StatutTicket]}`}
                      >
                        {STATUT_TICKET_LABEL[t.statut as StatutTicket]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
