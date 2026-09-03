import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import type { StatutTicket, PrioriteTicket } from "@/lib/crm/statuts";
import { ClientTabs } from "./ClientTabs";

const NB_MESSAGES_HISTORIQUE = 30;

function debutMoisISO() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString();
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function anciennete(dateCreation: string) {
  const jours = Math.floor((Date.now() - new Date(dateCreation).getTime()) / (24 * 60 * 60 * 1000));
  if (jours < 30) return `${jours} jour${jours > 1 ? "s" : ""}`;
  const mois = Math.floor(jours / 30);
  return `${mois} mois`;
}

export default async function AdminFicheClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: profil } = await supabase
    .from("profils")
    .select("id, nom, telephone, created_at, notes, est_admin")
    .eq("id", id)
    .maybeSingle();

  if (!profil || profil.est_admin) notFound();

  const debutMois = debutMoisISO();

  const [
    { data: authUser },
    { data: parametresCompte },
    { data: automatisations },
    { data: tickets },
    { count: nbContacts },
    { count: nbMessagesCeMois },
    { count: nbTicketsOuverts },
    { data: historiqueBrut },
  ] = await Promise.all([
    supabase.auth.admin.getUserById(id),
    supabase.from("parametres_compte").select("plan").eq("gestionnaire_id", id).maybeSingle(),
    supabase.from("automatisations").select("id, nom, type, statut, description").eq("gestionnaire_id", id),
    supabase
      .from("tickets")
      .select("id, titre, statut, priorite, created_at")
      .eq("gestionnaire_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("gestionnaire_id", id),
    supabase
      .from("conversations_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("gestionnaire_id", id)
      .gte("created_at", debutMois),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("gestionnaire_id", id)
      .in("statut", ["ouvert", "en_cours"]),
    supabase
      .from("conversations_whatsapp")
      .select("id, direction, contenu, created_at, contacts(nom, telephone)")
      .eq("gestionnaire_id", id)
      .order("created_at", { ascending: false })
      .limit(NB_MESSAGES_HISTORIQUE),
  ]);

  const email = authUser?.user?.email ?? "";
  const plan = parametresCompte?.plan ?? "Essentiel";
  const estActif = (automatisations ?? []).some((a) => a.statut === "actif");

  const historique = (historiqueBrut ?? []).map((m) => {
    const contact = Array.isArray(m.contacts) ? m.contacts[0] : m.contacts;
    return {
      id: m.id as string,
      direction: m.direction as "entrant" | "sortant",
      contenu: m.contenu as string | null,
      createdAt: m.created_at as string,
      contactNom: (contact?.nom as string | null) ?? null,
      contactTelephone: (contact?.telephone as string) ?? "",
    };
  });

  const kpis = [
    { label: "Contacts (total)", valeur: nbContacts ?? 0 },
    { label: "Messages (ce mois)", valeur: nbMessagesCeMois ?? 0 },
    { label: "Tickets ouverts", valeur: nbTicketsOuverts ?? 0 },
    { label: "Ancienneté", valeur: anciennete(profil.created_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/clients" className="text-sm text-texte-secondaire hover:text-encre">
          ← Clients
        </Link>
      </div>

      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-encre">{profil.nom || "—"}</h1>
            <p className="text-sm text-texte-secondaire">
              {email || "—"}
              {profil.telephone && ` · ${profil.telephone}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-neutre-pastel px-2 py-0.5 text-xs font-medium text-neutre-pastel-texte">
              {plan}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                estActif ? "bg-succes-pastel text-succes-pastel-texte" : "bg-bordure text-texte-secondaire"
              }`}
            >
              {estActif ? "Actif" : "Inactif"}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-texte-secondaire">Client depuis le {formatDate(profil.created_at)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
            <p className="text-sm text-texte-secondaire">{kpi.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-encre tabular-nums">{kpi.valeur}</p>
          </div>
        ))}
      </div>

      <ClientTabs
        gestionnaireId={id}
        automatisations={(automatisations ?? []).map((a) => ({
          id: a.id,
          nom: a.nom,
          type: a.type,
          statut: a.statut as "actif" | "inactif" | "erreur",
          description: a.description,
        }))}
        tickets={(tickets ?? []).map((t) => ({
          id: t.id,
          titre: t.titre,
          statut: t.statut as StatutTicket,
          priorite: t.priorite as PrioriteTicket,
          createdAt: t.created_at,
        }))}
        historique={historique}
        notesInitiales={profil.notes ?? ""}
      />
    </div>
  );
}
