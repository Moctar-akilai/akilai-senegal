import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import {
  STATUT_TICKET_BADGE,
  STATUT_TICKET_LABEL,
  PRIORITE_TICKET_BADGE,
  PRIORITE_TICKET_LABEL,
  type StatutTicket,
  type PrioriteTicket,
} from "@/lib/crm/statuts";

const STATUTS: StatutTicket[] = ["ouvert", "en_cours", "resolu", "ferme"];
const PRIORITES: PrioriteTicket[] = ["basse", "normale", "haute", "urgente"];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; priorite?: string }>;
}) {
  const { q, statut: statutParam, priorite: prioriteParam } = await searchParams;
  const recherche = (q ?? "").trim().toLowerCase();
  const filtreStatut = STATUTS.includes(statutParam as StatutTicket) ? (statutParam as StatutTicket) : "";
  const filtrePriorite = PRIORITES.includes(prioriteParam as PrioriteTicket) ? (prioriteParam as PrioriteTicket) : "";

  const supabase = createServiceClient();

  let requete = supabase
    .from("tickets")
    .select("id, titre, statut, priorite, created_at, profils(nom), automatisations(nom)")
    .order("created_at", { ascending: true });

  if (filtreStatut) requete = requete.eq("statut", filtreStatut);
  if (filtrePriorite) requete = requete.eq("priorite", filtrePriorite);

  const { data: ticketsBruts } = await requete;

  let tickets = (ticketsBruts ?? []).map((t) => {
    const profil = Array.isArray(t.profils) ? t.profils[0] : t.profils;
    const automatisation = Array.isArray(t.automatisations) ? t.automatisations[0] : t.automatisations;
    return {
      id: t.id as string,
      titre: t.titre as string,
      statut: t.statut as StatutTicket,
      priorite: t.priorite as PrioriteTicket,
      createdAt: t.created_at as string,
      gestionnaireNom: (profil?.nom as string | null) ?? "—",
      automatisationNom: (automatisation?.nom as string | null) ?? null,
    };
  });

  if (recherche) {
    tickets = tickets.filter(
      (t) => t.titre.toLowerCase().includes(recherche) || t.gestionnaireNom.toLowerCase().includes(recherche)
    );
  }

  // Tickets ouverts en premier (les plus anciens en tête), reste ensuite —
  // déjà trié par created_at ascendant en base, un tri stable suffit.
  tickets.sort((a, b) => {
    const rang = (s: StatutTicket) => (s === "ouvert" ? 0 : 1);
    return rang(a.statut) - rang(b.statut);
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-encre">Support</h1>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Recherche</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Gestionnaire ou titre…"
            className="w-64 rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
          />
        </div>
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
          className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile"
        >
          Filtrer
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bordure text-xs uppercase tracking-wide text-texte-secondaire">
            <tr>
              <th className="px-4 py-3">Gestionnaire</th>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Priorité</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Automatisation liée</th>
              <th className="px-4 py-3">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-texte-secondaire">
                  Aucun ticket ne correspond à ces filtres.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="border-b border-bordure last:border-0 hover:bg-bordure/30">
                  <td className="px-4 py-3 text-texte-secondaire">{t.gestionnaireNom}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${t.id}`} className="font-medium text-encre hover:underline">
                      {t.titre}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITE_TICKET_BADGE[t.priorite]}`}>
                      {PRIORITE_TICKET_LABEL[t.priorite]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_TICKET_BADGE[t.statut]}`}>
                      {STATUT_TICKET_LABEL[t.statut]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-texte-secondaire">{t.automatisationNom ?? "—"}</td>
                  <td className="px-4 py-3 text-texte-secondaire">{formatDate(t.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
