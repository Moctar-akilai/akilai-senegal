import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { MessagesParJourChart, StatutsAutomatisationsChart } from "./ApercuCharts";

const NB_JOURS_GRAPHIQUE = 30;

function debutMoisISO() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString();
}

function ilYaNJoursISO(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function jourISO(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function derniersNJours(n: number) {
  const jours: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    jours.push(jourISO(d));
  }
  return jours;
}

function formatJourCourt(jourISOStr: string) {
  const [, mois, jour] = jourISOStr.split("-");
  return `${jour}/${mois}`;
}

export default async function DashboardPage() {
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Client service_role (contourne le RLS) au lieu du client anon : sans
  // vraie session, auth.uid() est null côté base et les policies RLS
  // bloqueraient toute lecture même avec un gestionnaire_id valide. Le
  // filtrage par gestionnaire est fait explicitement ci-dessous. Remettre
  // le client anon (@/lib/supabase/server) + auth.getUser() une fois
  // l'authentification réelle réactivée.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const debut30Jours = ilYaNJoursISO(NB_JOURS_GRAPHIQUE);
  const debut7Jours = ilYaNJoursISO(7);
  const debut24h = ilYaNJoursISO(1);

  const [
    { count: totalContacts },
    { count: conversationsActives },
    { count: messagesCeMois },
    { count: messagesCetteSemaine },
    { data: messages30Jours },
    { data: automatisations },
    { data: derniersMessages },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("gestionnaire_id", user.id),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("gestionnaire_id", user.id)
      .gte("derniere_interaction", debut7Jours),
    supabase
      .from("conversations_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("gestionnaire_id", user.id)
      .gte("created_at", debutMoisISO()),
    supabase
      .from("conversations_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("gestionnaire_id", user.id)
      .gte("created_at", debut7Jours),
    supabase
      .from("conversations_whatsapp")
      .select("created_at")
      .eq("gestionnaire_id", user.id)
      .gte("created_at", debut30Jours),
    supabase.from("automatisations").select("statut").eq("gestionnaire_id", user.id),
    // Utilisé pour repérer les contacts sans réponse depuis > 24h : on
    // prend les messages récents et on ne garde en JS que le dernier par
    // contact (PostgREST ne fait pas de "top 1 par groupe" nativement).
    supabase
      .from("conversations_whatsapp")
      .select("contact_id, direction, created_at, contacts(nom, telephone)")
      .eq("gestionnaire_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  // ---- Contacts distincts cette semaine (résumé de la période) ----
  const { data: contactsSemaine } = await supabase
    .from("conversations_whatsapp")
    .select("contact_id")
    .eq("gestionnaire_id", user.id)
    .gte("created_at", debut7Jours);
  const nbContactsDistinctsSemaine = new Set((contactsSemaine ?? []).map((m) => m.contact_id)).size;

  // ---- Taux d'escalade ----
  // Aucun suivi structuré des déclenchements de "transfert humain" pour
  // l'instant (pas de colonne dédiée sur conversations_whatsapp) : le
  // numérateur reste à 0 tant que cette donnée n'existe pas.
  const conversationsEscaladees = 0;
  const tauxEscalade =
    (totalContacts ?? 0) > 0 ? Math.round((conversationsEscaladees / (totalContacts ?? 1)) * 100) : 0;

  const kpis = [
    { label: "Messages WhatsApp (ce mois)", valeur: messagesCeMois ?? 0 },
    { label: "Contacts (total)", valeur: totalContacts ?? 0 },
    { label: "Conversations actives (7 derniers jours)", valeur: conversationsActives ?? 0 },
    { label: "Taux d'escalade", valeur: `${tauxEscalade}%` },
  ];

  // ---- Graphique messages / jour (30 jours) ----
  const compteParJour = new Map<string, number>();
  for (const m of messages30Jours ?? []) {
    const jour = jourISO(new Date(m.created_at));
    compteParJour.set(jour, (compteParJour.get(jour) ?? 0) + 1);
  }
  const donneesGraphique = derniersNJours(NB_JOURS_GRAPHIQUE).map((jour) => ({
    date: formatJourCourt(jour),
    messages: compteParJour.get(jour) ?? 0,
  }));

  // ---- Donut statuts automatisations ----
  const compteParStatut = new Map<string, number>();
  for (const a of automatisations ?? []) {
    compteParStatut.set(a.statut, (compteParStatut.get(a.statut) ?? 0) + 1);
  }
  const donneesStatuts = ["actif", "inactif", "erreur"]
    .map((statut) => ({ statut, count: compteParStatut.get(statut) ?? 0 }))
    .filter((entree) => entree.count > 0);

  // ---- Contacts sans réponse depuis plus de 24h ----
  const dernierMessageParContact = new Map<
    string,
    { direction: string; created_at: string; nom: string | null; telephone: string }
  >();
  for (const m of derniersMessages ?? []) {
    if (!dernierMessageParContact.has(m.contact_id)) {
      const contact = Array.isArray(m.contacts) ? m.contacts[0] : m.contacts;
      dernierMessageParContact.set(m.contact_id, {
        direction: m.direction,
        created_at: m.created_at,
        nom: contact?.nom ?? null,
        telephone: contact?.telephone ?? "",
      });
    }
  }
  const contactsSansReponse = Array.from(dernierMessageParContact.values()).filter(
    (m) => m.direction === "entrant" && m.created_at < debut24h
  );

  // ---- Résumé de la période ----
  const resume = `Cette semaine, vous avez échangé ${messagesCetteSemaine ?? 0} message${
    (messagesCetteSemaine ?? 0) > 1 ? "s" : ""
  } avec ${nbContactsDistinctsSemaine} contact${
    nbContactsDistinctsSemaine > 1 ? "s" : ""
  }. ${conversationsActives ?? 0} conversation${
    (conversationsActives ?? 0) > 1 ? "s sont actuellement actives" : " est actuellement active"
  }.`;

  // ---- Recommandations AkilAI ----
  const recommandations: string[] = [];
  if ((messagesCetteSemaine ?? 0) === 0) {
    recommandations.push(
      "Aucun message envoyé cette semaine — vérifiez que l'assistant est bien activé."
    );
  }
  if (contactsSansReponse.length > 0) {
    recommandations.push(
      `Vous avez ${contactsSansReponse.length} contact${
        contactsSansReponse.length > 1 ? "s" : ""
      } sans réponse depuis plus de 24h.`
    );
  }
  if (recommandations.length === 0) {
    recommandations.push(
      "Tout fonctionne normalement — continuez à surveiller vos conversations pour rester réactif."
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Vue d&apos;ensemble</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">{kpi.valeur}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-medium text-neutral-900">
            Messages WhatsApp (30 jours)
          </h2>
          <MessagesParJourChart data={donneesGraphique} />
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-medium text-neutral-900">Statuts automatisations</h2>
          <StatutsAutomatisationsChart data={donneesStatuts} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-medium text-neutral-900">Résumé de la période</h2>
          <p className="text-sm text-neutral-700">{resume}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-medium text-neutral-900">Recommandations AkilAI</h2>
          <ul className="space-y-2">
            {recommandations.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-neutral-700">
                <span className="text-neutral-400">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
