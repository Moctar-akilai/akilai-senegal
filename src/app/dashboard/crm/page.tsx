import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { STATUT_CONTACT_BADGE, STATUT_CONTACT_LABEL, type StatutContact } from "@/lib/crm/statuts";
import { NouveauContactModal } from "./NouveauContactModal";
import { LogoAvecRepli } from "../integrations/LogoAvecRepli";
import { dechiffrerCleApi } from "@/lib/integrations/chiffrement";
import { interrogerBaseNotion, mapperPageNotionEnContact, type ContactNotion } from "@/lib/integrations/notion";
import type { ConfigIntegration, CrmActif } from "@/lib/integrations/fournisseurs";

function debutMoisISO() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString();
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUTS: StatutContact[] = ["prospect", "contacte", "client", "inactif"];

// ---------------------------------------------------------------------
// CRM lu en direct depuis Notion (lecture seule — voir
// src/lib/integrations/notion.ts). Rendu séparé du CRM natif ci-dessous :
// pas les mêmes données (KPIs, recherche/filtre par statut) donc pas de
// sens à les partager telles quelles.
// ---------------------------------------------------------------------
async function CrmNotion({ gestionnaireId }: { gestionnaireId: string }) {
  const supabase = createServiceClient();

  const { data: integration } = await supabase
    .from("integrations")
    .select("cle_api_chiffree, config")
    .eq("gestionnaire_id", gestionnaireId)
    .eq("fournisseur", "notion")
    .maybeSingle();

  const config = (integration?.config as ConfigIntegration | null) ?? null;

  const messageConfiguration =
    "La connexion Notion n'est pas encore configurée pour afficher un CRM. Choisissez une base et faites correspondre ses colonnes depuis Intégrations.";

  if (!integration?.cle_api_chiffree || !config?.database_id || !config.mapping?.nom || !config.mapping?.telephone) {
    return <EtatCrmNotion titre="Configuration Notion requise" message={messageConfiguration} />;
  }

  let contacts: ContactNotion[];
  try {
    const cleApi = dechiffrerCleApi(integration.cle_api_chiffree);
    const pages = await interrogerBaseNotion(cleApi, config.database_id);
    contacts = pages.map((page) => mapperPageNotionEnContact(page, config.mapping));
  } catch (erreur) {
    console.error("[crm] Échec de la lecture de la base Notion:", erreur);
    return (
      <EtatCrmNotion
        titre="Impossible de lire la base Notion"
        message={
          erreur instanceof Error
            ? erreur.message
            : "La clé API a peut-être été révoquée, ou la base supprimée/déplacée."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-encre">CRM</h1>
      </div>

      <BandeauNotion />

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-bordure p-8 text-center text-sm text-texte-secondaire">
          Aucune ligne trouvée dans cette base Notion.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-bordure text-xs font-medium uppercase tracking-wide text-texte-secondaire">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Dernière modification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-bordure/60">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/crm/${c.id}`} className="font-medium text-encre hover:underline">
                      {c.nom || `Contact sans nom (${c.telephone || c.id})`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-texte-secondaire">{c.telephone || "—"}</td>
                  <td className="px-4 py-3 text-texte-secondaire">{c.email || "—"}</td>
                  <td className="px-4 py-3">
                    {c.statut ? (
                      <span className="rounded-full bg-neutre-pastel px-2 py-0.5 text-xs font-medium text-neutre-pastel-texte">
                        {c.statut}
                      </span>
                    ) : (
                      <span className="text-texte-secondaire">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-texte-secondaire">{formatDate(c.derniereModification)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BandeauNotion() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-bordure bg-neutre-pastel/40 px-4 py-3">
      <LogoAvecRepli src="/logos/notion.png" initiales="NO" />
      <p className="text-sm text-encre">
        Données synchronisées en direct depuis Notion — lecture seule, le statut affiché est celui de
        Notion.
      </p>
    </div>
  );
}

function EtatCrmNotion({ titre, message }: { titre: string; message: string }) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-encre">CRM</h1>
      <BandeauNotion />
      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-8 text-center">
        <p className="text-sm font-medium text-encre">{titre}</p>
        <p className="mt-1 text-sm text-texte-secondaire">{message}</p>
        <Link
          href="/dashboard/integrations"
          className="mt-4 inline-block rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile"
        >
          Aller à Intégrations
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// CRM natif AkilAI (table contacts) — comportement inchangé.
// ---------------------------------------------------------------------
export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const { q, statut } = await searchParams;
  const recherche = (q ?? "").trim();
  const filtreStatut = statut && STATUTS.includes(statut as StatutContact) ? (statut as StatutContact) : "";

  // Client service_role (contourne le RLS) avec gestionnaire_id venant de
  // getGestionnaireActuel() (résolu depuis la session réelle) — même
  // architecture que le reste du dashboard.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const { data: parametresCompte } = await supabase
    .from("parametres_compte")
    .select("crm_actif")
    .eq("gestionnaire_id", user.id)
    .maybeSingle();
  const crmActif = (parametresCompte?.crm_actif ?? "crm_akilai") as CrmActif;

  if (crmActif === "notion") {
    return <CrmNotion gestionnaireId={user.id} />;
  }

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
        <h1 className="font-display text-2xl font-semibold text-encre">CRM</h1>
        <NouveauContactModal />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
            <p className="h-10 line-clamp-2 text-sm text-texte-secondaire">{kpi.label}</p>
            <p className="mt-2 font-display text-4xl font-semibold text-encre tabular-nums">{kpi.valeur}</p>
          </div>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Recherche</label>
          <input
            type="text"
            name="q"
            defaultValue={recherche}
            placeholder="Nom, téléphone ou email…"
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
                {STATUT_CONTACT_LABEL[s]}
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

      {(!contacts || contacts.length === 0) && (
        <div className="rounded-lg border border-dashed border-bordure p-8 text-center text-sm text-texte-secondaire">
          Aucun contact ne correspond.
        </div>
      )}

      {contacts && contacts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-bordure text-xs font-medium uppercase tracking-wide text-texte-secondaire">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Dernière interaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-bordure/60">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/crm/${c.id}`} className="font-medium text-encre hover:underline">
                      {c.nom || `Contact sans nom (${c.telephone})`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-texte-secondaire">{c.telephone}</td>
                  <td className="px-4 py-3 text-texte-secondaire">{c.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_CONTACT_BADGE[c.statut as StatutContact]}`}
                    >
                      {STATUT_CONTACT_LABEL[c.statut as StatutContact]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-texte-secondaire">{formatDate(c.derniere_interaction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
