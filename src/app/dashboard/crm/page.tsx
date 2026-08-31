import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { STATUT_CONTACT_BADGE, STATUT_CONTACT_LABEL, type StatutContact } from "@/lib/crm/statuts";
import { NouveauContactModal } from "./NouveauContactModal";

function debutMoisISO() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString();
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUTS: StatutContact[] = ["prospect", "contacte", "client", "inactif"];

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const { q, statut } = await searchParams;
  const recherche = (q ?? "").trim();
  const filtreStatut = statut && STATUTS.includes(statut as StatutContact) ? (statut as StatutContact) : "";

  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  const debutMois = debutMoisISO();

  const [{ count: totalContacts }, { count: nouveauxContacts }, { count: clientsActifs }, { count: messagesCeMois }] =
    await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("gestionnaire_id", user.id),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("gestionnaire_id", user.id)
        .gte("created_at", debutMois),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("gestionnaire_id", user.id)
        .eq("statut", "client"),
      supabase
        .from("conversations_whatsapp")
        .select("id", { count: "exact", head: true })
        .eq("gestionnaire_id", user.id)
        .gte("created_at", debutMois),
    ]);

  let requete = supabase
    .from("contacts")
    .select("id, nom, telephone, email, statut, derniere_interaction")
    .eq("gestionnaire_id", user.id)
    .order("derniere_interaction", { ascending: false, nullsFirst: false });

  if (recherche) {
    requete = requete.or(`nom.ilike.%${recherche}%,telephone.ilike.%${recherche}%,email.ilike.%${recherche}%`);
  }
  if (filtreStatut) {
    requete = requete.eq("statut", filtreStatut);
  }

  const { data: contacts } = await requete;

  const kpis = [
    { label: "Total contacts", valeur: totalContacts ?? 0 },
    { label: "Nouveaux contacts (ce mois)", valeur: nouveauxContacts ?? 0 },
    { label: "Clients actifs", valeur: clientsActifs ?? 0 },
    { label: "Messages échangés ce mois", valeur: messagesCeMois ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">CRM</h1>
        <NouveauContactModal gestionnaireId={user.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">{kpi.valeur}</p>
          </div>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Recherche</label>
          <input
            type="text"
            name="q"
            defaultValue={recherche}
            placeholder="Nom, téléphone ou email…"
            className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Statut</label>
          <select
            name="statut"
            defaultValue={filtreStatut}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value="">Tous</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_CONTACT_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Filtrer
        </button>
      </form>

      {(!contacts || contacts.length === 0) && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Aucun contact ne correspond.
        </div>
      )}

      {contacts && contacts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs font-medium uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Dernière interaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/crm/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                      {c.nom || `Contact sans nom (${c.telephone})`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.telephone}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_CONTACT_BADGE[c.statut as StatutContact]}`}
                    >
                      {STATUT_CONTACT_LABEL[c.statut as StatutContact]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(c.derniere_interaction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
