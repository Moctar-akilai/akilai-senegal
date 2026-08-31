import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";

// ============================================================================
// ⚠️ CONTOURNEMENT TEMPORAIRE DE L'AUTHENTIFICATION — À RETIRER ⚠️
// ============================================================================
// Toutes les écritures du dashboard (formulaires, toggles, création de
// ressources) passaient par le client Supabase anon côté navigateur
// (@/lib/supabase/client), donc soumises au RLS — bloquées de la même
// façon que les lectures l'étaient tant que le bypass d'authentification
// (voir src/lib/auth/gestionnaire-actuel.ts) est actif : auth.uid() est
// null côté base sans vraie session.
//
// La clé service_role ne doit jamais être exposée au navigateur : cette
// route API sert donc d'intermédiaire. Chaque composant client envoie une
// action à cette seule route, qui exécute l'écriture ici côté serveur avec
// createServiceClient() (contourne le RLS) et gestionnaire_id venant
// explicitement de getGestionnaireActuel() — jamais une valeur fournie par
// le client — pour scoper chaque écriture au bon compte.
//
// Pour réactiver l'authentification normale :
//   1. Chaque composant client peut revenir à des appels directs via le
//      client anon (@/lib/supabase/client) — RLS redevient fiable une fois
//      qu'une vraie session existe — ou, mieux, être migré vers des Server
//      Actions / routes API classiques utilisant le client anon +
//      auth.getUser() côté serveur (approche standard Next.js, à préférer
//      à ce shim générique).
//   2. Supprimer ce fichier une fois toutes les écritures migrées.
// ============================================================================

type Reponse<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function erreur(message: string, status = 400) {
  return NextResponse.json<Reponse>({ ok: false, error: message }, { status });
}

function ok<T>(data: T) {
  return NextResponse.json<Reponse<T>>({ ok: true, data });
}

const STATUTS_CONTACT = ["prospect", "contacte", "client", "inactif"] as const;
const STATUTS_AUTOMATISATION = ["actif", "inactif"] as const;
const STATUTS_INTEGRATION = ["non_connecte", "connecte", "erreur"] as const;
const PRIORITES_TICKET = ["basse", "normale", "haute", "urgente"] as const;
const TONS_ASSISTANT = ["professionnel", "amical", "decontracte"] as const;

function estString(v: unknown): v is string {
  return typeof v === "string";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return erreur("Requête invalide.");
  }

  const gestionnaire = await getGestionnaireActuel();
  const supabase = createServiceClient();
  const action = body.action as string;

  switch (action) {
    case "compte.update": {
      if (!estString(body.nom) || !estString(body.telephone)) {
        return erreur("Nom et téléphone sont requis.");
      }
      const numeroWhatsapp =
        body.numeroWhatsapp === null || body.numeroWhatsapp === undefined
          ? null
          : String(body.numeroWhatsapp).trim() || null;

      const [{ error: erreurProfil }, { error: erreurParametres }] = await Promise.all([
        supabase
          .from("profils")
          .update({ nom: body.nom, telephone: body.telephone })
          .eq("id", gestionnaire.id),
        supabase
          .from("parametres_compte")
          .update({ numero_whatsapp: numeroWhatsapp })
          .eq("gestionnaire_id", gestionnaire.id),
      ]);
      const err = erreurProfil || erreurParametres;
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "compte.updatePassword": {
      if (!estString(body.motDePasse) || body.motDePasse.length < 6) {
        return erreur("Le mot de passe doit contenir au moins 6 caractères.");
      }
      const { error: err } = await supabase.auth.admin.updateUserById(gestionnaire.id, {
        password: body.motDePasse,
      });
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "assistant.update": {
      const ton = body.assistant_ton;
      if (!TONS_ASSISTANT.includes(ton)) return erreur("Ton invalide.");
      if (!estString(body.assistant_nom) || !estString(body.langue) || !estString(body.assistant_prompt)) {
        return erreur("Champs manquants.");
      }
      const { error: err } = await supabase
        .from("parametres_compte")
        .update({
          assistant_nom: body.assistant_nom,
          langue: body.langue,
          assistant_prompt: body.assistant_prompt,
          assistant_ton: ton,
          outil_faq_actif: Boolean(body.outil_faq_actif),
          outil_prise_rdv_actif: Boolean(body.outil_prise_rdv_actif),
          outil_transfert_humain_actif: Boolean(body.outil_transfert_humain_actif),
          outil_infos_pratiques_actif: Boolean(body.outil_infos_pratiques_actif),
        })
        .eq("gestionnaire_id", gestionnaire.id);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "automatisation.setStatut": {
      if (!estString(body.id) || !STATUTS_AUTOMATISATION.includes(body.statut)) {
        return erreur("Requête invalide.");
      }
      const { error: err } = await supabase
        .from("automatisations")
        .update({ statut: body.statut })
        .eq("id", body.id)
        .eq("gestionnaire_id", gestionnaire.id);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "programmation.save": {
      if (
        !estString(body.automatisationId) ||
        !Array.isArray(body.joursActifs) ||
        !estString(body.heureDebut) ||
        !estString(body.heureFin)
      ) {
        return erreur("Requête invalide.");
      }
      // L'automatisation ciblée doit appartenir au gestionnaire — table
      // sans colonne gestionnaire_id directe, donc vérifiée via jointure.
      const { data: automatisation } = await supabase
        .from("automatisations")
        .select("id")
        .eq("id", body.automatisationId)
        .eq("gestionnaire_id", gestionnaire.id)
        .maybeSingle();
      if (!automatisation) return erreur("Automatisation introuvable.", 404);

      const { error: err } = await supabase.from("programmations").upsert(
        {
          automatisation_id: body.automatisationId,
          jours_actifs: body.joursActifs,
          heure_debut: body.heureDebut,
          heure_fin: body.heureFin,
          actif: Boolean(body.actif),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "automatisation_id" }
      );
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "contact.create": {
      if (!estString(body.telephone) || !body.telephone.trim()) {
        return erreur("Le téléphone est requis.");
      }
      const statut = STATUTS_CONTACT.includes(body.statut) ? body.statut : "prospect";
      const { error: err } = await supabase.from("contacts").insert({
        gestionnaire_id: gestionnaire.id,
        nom: estString(body.nom) ? body.nom.trim() || null : null,
        telephone: body.telephone.trim(),
        email: estString(body.email) ? body.email.trim() || null : null,
        statut,
        notes: estString(body.notes) ? body.notes.trim() || null : null,
      });
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "contact.updateStatut": {
      if (!estString(body.id) || !STATUTS_CONTACT.includes(body.statut)) {
        return erreur("Requête invalide.");
      }
      const { error: err } = await supabase
        .from("contacts")
        .update({ statut: body.statut })
        .eq("id", body.id)
        .eq("gestionnaire_id", gestionnaire.id);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "contact.updateNotes": {
      if (!estString(body.id)) return erreur("Requête invalide.");
      const notes = estString(body.notes) ? body.notes.trim() || null : null;
      const { error: err } = await supabase
        .from("contacts")
        .update({ notes })
        .eq("id", body.id)
        .eq("gestionnaire_id", gestionnaire.id);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "ticket.create": {
      if (!estString(body.titre) || !body.titre.trim()) return erreur("Le titre est requis.");
      const priorite = PRIORITES_TICKET.includes(body.priorite) ? body.priorite : "normale";
      const automatisationId = estString(body.automatisationId) ? body.automatisationId : null;

      if (automatisationId) {
        const { data: automatisation } = await supabase
          .from("automatisations")
          .select("id")
          .eq("id", automatisationId)
          .eq("gestionnaire_id", gestionnaire.id)
          .maybeSingle();
        if (!automatisation) return erreur("Automatisation introuvable.", 404);
      }

      const { data, error: err } = await supabase
        .from("tickets")
        .insert({
          gestionnaire_id: gestionnaire.id,
          automatisation_id: automatisationId,
          titre: body.titre.trim(),
          description: estString(body.description) ? body.description.trim() || null : null,
          priorite,
        })
        .select("id")
        .single();
      if (err || !data) return erreur(err?.message ?? "Impossible de créer le ticket.", 500);
      return ok({ id: data.id as string });
    }

    case "ticket.updatePriorite": {
      if (!estString(body.id) || !PRIORITES_TICKET.includes(body.priorite)) {
        return erreur("Requête invalide.");
      }
      const { error: err } = await supabase
        .from("tickets")
        .update({ priorite: body.priorite, updated_at: new Date().toISOString() })
        .eq("id", body.id)
        .eq("gestionnaire_id", gestionnaire.id);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "ticket.addMessage": {
      if (!estString(body.ticketId) || !estString(body.contenu) || !body.contenu.trim()) {
        return erreur("Requête invalide.");
      }
      const { data: ticket } = await supabase
        .from("tickets")
        .select("id")
        .eq("id", body.ticketId)
        .eq("gestionnaire_id", gestionnaire.id)
        .maybeSingle();
      if (!ticket) return erreur("Ticket introuvable.", 404);

      const { error: err } = await supabase.from("ticket_messages").insert({
        ticket_id: body.ticketId,
        auteur: "client",
        contenu: body.contenu.trim(),
      });
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "integration.disconnect": {
      if (!estString(body.fournisseur)) return erreur("Requête invalide.");
      const { error: err } = await supabase
        .from("integrations")
        .update({
          statut: "non_connecte",
          connecte_le: null,
          cle_api_chiffree: null,
          derniere_verification: null,
          message_erreur: null,
        })
        .eq("gestionnaire_id", gestionnaire.id)
        .eq("fournisseur", body.fournisseur);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "integration.devToggle": {
      // Réservé au développement — le bouton qui déclenche cette action
      // n'est déjà rendu que si process.env.NODE_ENV === "development"
      // côté client (éliminé du bundle de prod), mais on revérifie aussi
      // côté serveur par défense en profondeur : cette route pourrait
      // sinon être appelée directement en production.
      if (process.env.NODE_ENV !== "development") {
        return erreur("Non disponible en production.", 403);
      }
      if (!estString(body.fournisseur) || !STATUTS_INTEGRATION.includes(body.nouveauStatut)) {
        return erreur("Requête invalide.");
      }
      const { error: err } = await supabase.from("integrations").upsert(
        {
          gestionnaire_id: gestionnaire.id,
          fournisseur: body.fournisseur,
          statut: body.nouveauStatut,
          connecte_le: body.nouveauStatut === "connecte" ? new Date().toISOString() : null,
        },
        { onConflict: "gestionnaire_id,fournisseur" }
      );
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "notification.markRead": {
      if (!estString(body.id)) return erreur("Requête invalide.");
      const { error: err } = await supabase
        .from("notifications")
        .update({ lu: true })
        .eq("id", body.id)
        .eq("gestionnaire_id", gestionnaire.id);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "notification.markAllRead": {
      const { error: err } = await supabase
        .from("notifications")
        .update({ lu: true })
        .eq("gestionnaire_id", gestionnaire.id)
        .eq("lu", false);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "notification.delete": {
      if (!estString(body.id)) return erreur("Requête invalide.");
      const { error: err } = await supabase
        .from("notifications")
        .delete()
        .eq("id", body.id)
        .eq("gestionnaire_id", gestionnaire.id);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "notification.deleteAll": {
      const { error: err } = await supabase
        .from("notifications")
        .delete()
        .eq("gestionnaire_id", gestionnaire.id);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    default:
      return erreur("Action inconnue.");
  }
}
