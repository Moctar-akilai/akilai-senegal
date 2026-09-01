import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { type StatutContact } from "@/lib/crm/statuts";
import { ContactInfoForm } from "./ContactInfoForm";
import { dechiffrerCleApi } from "@/lib/integrations/chiffrement";
import { recupererPageNotion, mapperPageNotionEnContact, type ContactNotion } from "@/lib/integrations/notion";
import type { ConfigIntegration, CrmActif } from "@/lib/integrations/fournisseurs";

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

// Fiche contact simplifiée pour un contact Notion : lecture seule, pas de
// section notes/statut modifiable (statut vient de Notion) ni d'historique
// WhatsApp/tickets (l'id est une page Notion, pas un contact_id de notre
// base — ces sections n'ont pas de sens ici).
async function FicheContactNotion({ gestionnaireId, pageId }: { gestionnaireId: string; pageId: string }) {
  const supabase = createServiceClient();

  const { data: integration } = await supabase
    .from("integrations")
    .select("cle_api_chiffree, config")
    .eq("gestionnaire_id", gestionnaireId)
    .eq("fournisseur", "notion")
    .maybeSingle();

  const config = (integration?.config as ConfigIntegration | null) ?? null;
  if (!integration?.cle_api_chiffree || !config?.mapping?.nom || !config.mapping?.telephone) {
    notFound();
  }

  let contact: ContactNotion | null = null;
  let erreurLecture: string | null = null;
  try {
    const cleApi = dechiffrerCleApi(integration.cle_api_chiffree);
    const page = await recupererPageNotion(cleApi, pageId);
    contact = mapperPageNotionEnContact(page, config.mapping);
  } catch (erreur) {
    console.error("[crm/[id]] Échec de la lecture de la page Notion:", erreur);
    erreurLecture =
      erreur instanceof Error ? erreur.message : "La page a peut-être été supprimée ou déplacée.";
  }

  if (erreurLecture || !contact) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/crm" className="text-sm text-texte-secondaire hover:text-encre">
            ← CRM
          </Link>
        </div>
        <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-8 text-center">
          <p className="text-sm font-medium text-encre">Impossible de lire ce contact Notion</p>
          <p className="mt-1 text-sm text-texte-secondaire">{erreurLecture}</p>
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/crm" className="text-sm text-texte-secondaire hover:text-encre">
          ← CRM
        </Link>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-encre">
          {contact.nom || `Contact sans nom (${contact.telephone || contact.id})`}
        </h1>
        <p className="text-sm text-texte-secondaire">Lu en direct depuis Notion — lecture seule.</p>
      </div>

      <div className="max-w-md rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-texte-secondaire">Nom</dt>
            <dd className="text-encre">{contact.nom || "—"}</dd>
          </div>
          <div>
            <dt className="text-texte-secondaire">Téléphone</dt>
            <dd className="text-encre">{contact.telephone || "—"}</dd>
          </div>
          <div>
            <dt className="text-texte-secondaire">Email</dt>
            <dd className="text-encre">{contact.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-texte-secondaire">Statut (Notion)</dt>
            <dd>
              {contact.statut ? (
                <span className="inline-block rounded-full bg-neutre-pastel px-2 py-0.5 text-xs font-medium text-neutre-pastel-texte">
                  {contact.statut}
                </span>
              ) : (
                <span className="text-encre">—</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    return <FicheContactNotion gestionnaireId={user.id} pageId={id} />;
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, nom, telephone, email, statut, notes")
    .eq("id", id)
    .eq("gestionnaire_id", user.id)
    .maybeSingle();

  if (!contact) notFound();

  const { data: historique } = await supabase
    .from("conversations_whatsapp")
    .select("id, direction, contenu, created_at")
    .eq("contact_id", id)
    .eq("gestionnaire_id", user.id)
    .order("created_at", { ascending: false })
    .limit(NB_MESSAGES_HISTORIQUE);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/crm" className="text-sm text-texte-secondaire hover:text-encre">
          ← CRM
        </Link>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-encre">
          {contact.nom || `Contact sans nom (${contact.telephone})`}
        </h1>
        <p className="text-sm text-texte-secondaire">
          {contact.telephone}
          {contact.email && ` · ${contact.email}`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-medium text-encre">Informations</h2>
          <ContactInfoForm
            contactId={contact.id}
            statutInitial={contact.statut as StatutContact}
            notesInitial={contact.notes ?? ""}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-encre">Historique WhatsApp</h2>
              <Link
                href={`/dashboard/messages/${contact.id}`}
                className="text-xs text-texte-secondaire hover:text-encre"
              >
                Voir la conversation complète →
              </Link>
            </div>
            {!historique || historique.length === 0 ? (
              <p className="text-sm text-texte-secondaire">Aucun message échangé pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2">
                {historique.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span
                        className={`mr-2 rounded-full px-2 py-0.5 text-xs ${
                          m.direction === "sortant"
                            ? "bg-bordure text-texte-secondaire"
                            : "bg-neutre-pastel text-neutre-pastel-texte"
                        }`}
                      >
                        {m.direction === "sortant" ? "Envoyé" : "Reçu"}
                      </span>
                      <span className="text-encre">{extrait(m.contenu)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-texte-secondaire">
                      {formatDateHeure(m.created_at)}
                    </span>
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
