import { createClient } from "@/lib/supabase/server";

function debutMoisISO() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString();
}

function ilYA7JoursISO() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: totalContacts }, { count: conversationsActives }, { count: messagesCeMois }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("gestionnaire_id", user!.id),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("gestionnaire_id", user!.id)
        .gte("derniere_interaction", ilYA7JoursISO()),
      supabase
        .from("conversations_whatsapp")
        .select("id", { count: "exact", head: true })
        .eq("gestionnaire_id", user!.id)
        .gte("created_at", debutMoisISO()),
    ]);

  const kpis = [
    { label: "Contacts au total", valeur: totalContacts ?? 0 },
    { label: "Conversations actives (7 derniers jours)", valeur: conversationsActives ?? 0 },
    { label: "Messages échangés ce mois-ci", valeur: messagesCeMois ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">{kpi.valeur}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
