import Link from "next/link";
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
import { NouveauTicketModal } from "./NouveauTicketModal";

const PRIORITES: PrioriteTicket[] = ["basse", "normale", "haute", "urgente"];
const STATUTS: StatutTicket[] = ["ouvert", "en_cours", "resolu", "ferme"];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; priorite?: string }>;
}) {
  const { statut, priorite } = await searchParams;
  const filtreStatut = statut && STATUTS.includes(statut as StatutTicket) ? (statut as StatutTicket) : "";
  const filtrePriorite =
    priorite && PRIORITES.includes(priorite as PrioriteTicket) ? (priorite as PrioriteTicket) : "";

  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  let requete = supabase
    .from("tickets")
    .select("id, titre, priorite, statut, created_at, automatisations(nom)")
    .eq("gestionnaire_id", user.id)
    .order("created_at", { ascending: false });

  if (filtreStatut) requete = requete.eq("statut", filtreStatut);
  if (filtrePriorite) requete = requete.eq("priorite", filtrePriorite);

  const [{ data: tickets }, { data: automatisations }] = await Promise.all([
    requete,
    supabase.from("automatisations").select("id, nom").eq("gestionnaire_id", user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-encre">Tickets</h1>
        <NouveauTicketModal
          automatisations={(automatisations ?? []).map((a) => ({ id: a.id, label: a.nom }))}
        />
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Statut</label>
          <select
            name="statut"
            defaultValue={filtreStatut}
            className="rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
          >
            <option value="">Tous</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_TICKET_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Priorité</label>
          <select
            name="priorite"
            defaultValue={filtrePriorite}
            className="rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
          >
            <option value="">Toutes</option>
            {PRIORITES.map((p) => (
              <option key={p} value={p}>
                {PRIORITE_TICKET_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg border border-bordure px-4 py-2 text-sm font-medium text-encre hover:bg-bordure/60"
        >
          Filtrer
        </button>
      </form>

      {(!tickets || tickets.length === 0) && (
        <div className="rounded-lg border border-dashed border-bordure p-8 text-center text-sm text-texte-secondaire">
          Aucun ticket ne correspond.
        </div>
      )}

      {tickets && tickets.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-bordure text-xs font-medium uppercase tracking-wide text-texte-secondaire">
              <tr>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Automatisation</th>
                <th className="px-4 py-3">Priorité</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {tickets.map((t) => {
                const automatisation = Array.isArray(t.automatisations)
                  ? t.automatisations[0]
                  : t.automatisations;
                return (
                  <tr key={t.id} className="hover:bg-bordure/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/tickets/${t.id}`}
                        className="font-medium text-encre hover:underline"
                      >
                        {t.titre}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-texte-secondaire">{automatisation?.nom ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITE_TICKET_BADGE[t.priorite as PrioriteTicket]}`}
                      >
                        {PRIORITE_TICKET_LABEL[t.priorite as PrioriteTicket]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_TICKET_BADGE[t.statut as StatutTicket]}`}
                      >
                        {STATUT_TICKET_LABEL[t.statut as StatutTicket]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-texte-secondaire">{formatDate(t.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
