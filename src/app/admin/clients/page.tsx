import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { PRIX_PLANS } from "@/lib/admin/plans";

const PLANS = Object.keys(PRIX_PLANS);

function debutMoisISO() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString();
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; statut?: string }>;
}) {
  const { q, plan: filtrePlanParam, statut: filtreStatutParam } = await searchParams;
  const recherche = (q ?? "").trim().toLowerCase();
  const filtrePlan = PLANS.includes(filtrePlanParam ?? "") ? filtrePlanParam! : "";
  const filtreStatut = filtreStatutParam === "actif" || filtreStatutParam === "inactif" ? filtreStatutParam : "";

  const supabase = createServiceClient();

  const { data: profilsClients } = await supabase
    .from("profils")
    .select("id, nom, telephone, created_at")
    .eq("est_admin", false)
    .order("created_at", { ascending: false });
  const idsClients = (profilsClients ?? []).map((p) => p.id);

  const debutMois = debutMoisISO();

  const [{ data: parametresComptes }, { data: automatisations }, { data: contacts }, { data: messagesCeMois }] =
    await Promise.all([
      supabase.from("parametres_compte").select("gestionnaire_id, plan").in("gestionnaire_id", idsClients),
      supabase.from("automatisations").select("gestionnaire_id, statut").in("gestionnaire_id", idsClients),
      supabase.from("contacts").select("gestionnaire_id").in("gestionnaire_id", idsClients),
      supabase
        .from("conversations_whatsapp")
        .select("gestionnaire_id")
        .in("gestionnaire_id", idsClients)
        .gte("created_at", debutMois),
    ]);

  // Emails : pas stockés sur profils, uniquement sur auth.users — un seul
  // appel groupé (jusqu'à 1000 comptes) plutôt qu'un appel par client.
  const { data: listeUtilisateurs } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailParId = new Map((listeUtilisateurs?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const planParId = new Map((parametresComptes ?? []).map((pc) => [pc.gestionnaire_id, pc.plan]));
  const gestionnairesActifs = new Set(
    (automatisations ?? []).filter((a) => a.statut === "actif").map((a) => a.gestionnaire_id)
  );

  const contactsParId = new Map<string, number>();
  for (const c of contacts ?? []) {
    contactsParId.set(c.gestionnaire_id, (contactsParId.get(c.gestionnaire_id) ?? 0) + 1);
  }
  const messagesParId = new Map<string, number>();
  for (const m of messagesCeMois ?? []) {
    messagesParId.set(m.gestionnaire_id, (messagesParId.get(m.gestionnaire_id) ?? 0) + 1);
  }

  let lignes = (profilsClients ?? []).map((p) => ({
    id: p.id,
    nom: p.nom || "—",
    email: emailParId.get(p.id) ?? "",
    plan: planParId.get(p.id) ?? "Essentiel",
    actif: gestionnairesActifs.has(p.id),
    createdAt: p.created_at,
    nbContacts: contactsParId.get(p.id) ?? 0,
    nbMessagesCeMois: messagesParId.get(p.id) ?? 0,
  }));

  if (recherche) {
    lignes = lignes.filter(
      (l) => l.nom.toLowerCase().includes(recherche) || l.email.toLowerCase().includes(recherche)
    );
  }
  if (filtrePlan) {
    lignes = lignes.filter((l) => l.plan === filtrePlan);
  }
  if (filtreStatut) {
    lignes = lignes.filter((l) => (filtreStatut === "actif" ? l.actif : !l.actif));
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-encre">Clients</h1>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Recherche</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nom ou email…"
            className="w-64 rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Plan</label>
          <select
            name="plan"
            defaultValue={filtrePlan}
            className="rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
          >
            <option value="">Tous</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Statut</label>
          <select
            name="statut"
            defaultValue={filtreStatut}
            className="rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
          >
            <option value="">Tous</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
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
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Créé le</th>
              <th className="px-4 py-3">Contacts</th>
              <th className="px-4 py-3">Messages (ce mois)</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-texte-secondaire">
                  Aucun client ne correspond à ces filtres.
                </td>
              </tr>
            ) : (
              lignes.map((l) => (
                <tr key={l.id} className="border-b border-bordure last:border-0 hover:bg-bordure/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clients/${l.id}`} className="font-medium text-encre hover:underline">
                      {l.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-texte-secondaire">{l.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutre-pastel px-2 py-0.5 text-xs font-medium text-neutre-pastel-texte">
                      {l.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.actif ? "bg-succes-pastel text-succes-pastel-texte" : "bg-bordure text-texte-secondaire"
                      }`}
                    >
                      {l.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-texte-secondaire">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-3 tabular-nums">{l.nbContacts}</td>
                  <td className="px-4 py-3 tabular-nums">{l.nbMessagesCeMois}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
