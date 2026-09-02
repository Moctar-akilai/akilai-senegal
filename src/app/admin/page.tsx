import { createServiceClient } from "@/lib/supabase/service";
import { PRIX_PLANS } from "@/lib/admin/plans";
import { MessagesBarChart, RepartitionPlansChart } from "./AdminCharts";
import { StatutsAutomatisationsChart } from "@/app/dashboard/ApercuCharts";
import { AlertesAdmin, type Alerte } from "./AlertesAdmin";

const NB_JOURS_GRAPHIQUE = 30;
const HEURES_ALERTE_TICKET = 48;
const JOURS_INACTIVITE_CLIENT = 30;

function debutMoisISO() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString();
}

function ilYaNJoursISO(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function ilYaNHeuresISO(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

function jourISO(date: Date) {
  return date.toISOString().slice(0, 10);
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

export default async function AdminVueEnsemblePage() {
  const supabase = createServiceClient();

  // Les comptes admin (est_admin=true) ne sont pas des "clients" : exclus
  // de toutes les statistiques ci-dessous.
  const { data: profilsClients } = await supabase.from("profils").select("id, created_at").eq("est_admin", false);
  const idsClients = (profilsClients ?? []).map((p) => p.id);

  const debutMois = debutMoisISO();
  const debut30Jours = ilYaNJoursISO(NB_JOURS_GRAPHIQUE);
  const cutoffInactivite = ilYaNJoursISO(JOURS_INACTIVITE_CLIENT);
  const cutoffTicket48h = ilYaNHeuresISO(HEURES_ALERTE_TICKET);

  const [
    { data: parametresComptes },
    { data: automatisations },
    { count: ticketsOuverts },
    { count: messagesCeMois },
    { data: messages30Jours },
    { data: gestionnairesActifsMois },
    { data: ticketsAnciensOuverts },
    { data: automatisationsErreur },
  ] = await Promise.all([
    supabase.from("parametres_compte").select("gestionnaire_id, plan").in("gestionnaire_id", idsClients),
    supabase.from("automatisations").select("gestionnaire_id, statut").in("gestionnaire_id", idsClients),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("statut", ["ouvert", "en_cours"]),
    supabase
      .from("conversations_whatsapp")
      .select("id", { count: "exact", head: true })
      .in("gestionnaire_id", idsClients)
      .gte("created_at", debutMois),
    supabase
      .from("conversations_whatsapp")
      .select("created_at")
      .in("gestionnaire_id", idsClients)
      .gte("created_at", debut30Jours),
    supabase
      .from("conversations_whatsapp")
      .select("gestionnaire_id")
      .in("gestionnaire_id", idsClients)
      .gte("created_at", cutoffInactivite),
    supabase
      .from("tickets")
      .select("id, titre, gestionnaire_id, created_at, profils(nom)")
      .eq("statut", "ouvert")
      .lt("created_at", cutoffTicket48h),
    supabase
      .from("automatisations")
      .select("id, nom, gestionnaire_id, profils(nom)")
      .in("gestionnaire_id", idsClients)
      .eq("statut", "erreur"),
  ]);

  // ---- Clients actifs / total ----
  const gestionnairesAvecAutomatisationActive = new Set(
    (automatisations ?? []).filter((a) => a.statut === "actif").map((a) => a.gestionnaire_id)
  );
  const nbClientsActifs = gestionnairesAvecAutomatisationActive.size;
  const nbClientsTotal = idsClients.length;

  // ---- MRR estimé ----
  const mrrEstime = (parametresComptes ?? []).reduce((total, pc) => total + (PRIX_PLANS[pc.plan] ?? 0), 0);

  // ---- Nouveaux clients ce mois ----
  const nbNouveauxClients = (profilsClients ?? []).filter((p) => p.created_at >= debutMois).length;

  const kpis = [
    { label: "Clients actifs / total", valeur: `${nbClientsActifs} / ${nbClientsTotal}` },
    { label: "MRR estimé (FCFA)", valeur: mrrEstime.toLocaleString("fr-FR") },
    { label: "Tickets ouverts non résolus", valeur: ticketsOuverts ?? 0 },
    { label: "Messages WhatsApp (ce mois)", valeur: messagesCeMois ?? 0 },
    { label: "Nouveaux clients (ce mois)", valeur: nbNouveauxClients },
  ];

  // ---- Graphique messages / jour (30 jours, tous clients) ----
  const compteParJour = new Map<string, number>();
  for (const m of messages30Jours ?? []) {
    const jour = jourISO(new Date(m.created_at));
    compteParJour.set(jour, (compteParJour.get(jour) ?? 0) + 1);
  }
  const donneesMessages = derniersNJours(NB_JOURS_GRAPHIQUE).map((jour) => ({
    date: formatJourCourt(jour),
    messages: compteParJour.get(jour) ?? 0,
  }));

  // ---- Donut répartition clients par plan ----
  const compteParPlan = new Map<string, number>();
  for (const pc of parametresComptes ?? []) {
    compteParPlan.set(pc.plan, (compteParPlan.get(pc.plan) ?? 0) + 1);
  }
  const donneesPlans = Array.from(compteParPlan.entries())
    .map(([plan, count]) => ({ plan, count }))
    .filter((e) => e.count > 0);

  // ---- Donut statuts automatisations (tous clients) ----
  const compteParStatutAuto = new Map<string, number>();
  for (const a of automatisations ?? []) {
    compteParStatutAuto.set(a.statut, (compteParStatutAuto.get(a.statut) ?? 0) + 1);
  }
  const donneesStatutsAuto = ["actif", "inactif", "erreur"]
    .map((statut) => ({ statut, count: compteParStatutAuto.get(statut) ?? 0 }))
    .filter((e) => e.count > 0);

  // ---- Alertes ----
  const alertes: Alerte[] = [];

  for (const t of ticketsAnciensOuverts ?? []) {
    const profil = Array.isArray(t.profils) ? t.profils[0] : t.profils;
    alertes.push({
      titre: `Ticket "${t.titre}" sans réponse depuis plus de ${HEURES_ALERTE_TICKET}h`,
      description: `Client : ${profil?.nom ?? "—"}`,
      lien: `/admin/tickets/${t.id}`,
    });
  }

  for (const a of automatisationsErreur ?? []) {
    const profil = Array.isArray(a.profils) ? a.profils[0] : a.profils;
    alertes.push({
      titre: `Automatisation "${a.nom}" en erreur`,
      description: `Client : ${profil?.nom ?? "—"}`,
      lien: `/admin/clients/${a.gestionnaire_id}`,
    });
  }

  // Clients sans message récent — une requête séparée pour leur nom est
  // plus simple qu'un join manuel ici.
  const gestionnairesActifsSet = new Set((gestionnairesActifsMois ?? []).map((m) => m.gestionnaire_id));
  const idsClientsInactifs = (profilsClients ?? [])
    .filter((p) => !gestionnairesActifsSet.has(p.id))
    .map((p) => p.id);
  if (idsClientsInactifs.length > 0) {
    const { data: clientsInactifs } = await supabase
      .from("profils")
      .select("id, nom")
      .in("id", idsClientsInactifs);
    for (const c of clientsInactifs ?? []) {
      alertes.push({
        titre: `${c.nom || "Client"} inactif depuis plus de ${JOURS_INACTIVITE_CLIENT} jours`,
        description: "Aucun message WhatsApp échangé récemment.",
        lien: `/admin/clients/${c.id}`,
      });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-encre">Vue d&apos;ensemble</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5"
          >
            <p className="h-10 line-clamp-2 text-sm text-texte-secondaire">{kpi.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-encre tabular-nums">{kpi.valeur}</p>
          </div>
        ))}
      </div>
      <p className="-mt-4 text-xs text-texte-secondaire">
        MRR estimé à partir du plan déclaré de chaque client (parametres_compte.plan) — aucun suivi de
        paiement réel n&apos;existe encore en base, ce chiffre est indicatif.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-medium text-encre">Volume de messages WhatsApp (30 jours)</h2>
          <MessagesBarChart data={donneesMessages} />
        </div>
        <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
          <h2 className="mb-2 text-sm font-medium text-encre">Clients par plan</h2>
          <RepartitionPlansChart data={donneesPlans} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
          <h2 className="mb-2 text-sm font-medium text-encre">Statuts des automatisations (tous clients)</h2>
          <StatutsAutomatisationsChart data={donneesStatutsAuto} />
        </div>
        <AlertesAdmin alertes={alertes} />
      </div>
    </div>
  );
}
