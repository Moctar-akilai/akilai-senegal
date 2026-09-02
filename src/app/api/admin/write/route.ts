import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminActuel } from "@/lib/auth/admin-actuel";
import { envoyerEmailReponseTicket } from "@/lib/email/resend";

// ============================================================================
// Route d'écriture générique du backoffice admin
// ============================================================================
// Même architecture que /api/dashboard/write (voir son commentaire), mais
// gatée par getAdminActuel() (session + profils.est_admin=true) au lieu de
// getGestionnaireActuel() seul : le middleware protège déjà /admin/*, cette
// vérification est une défense en profondeur pour cette route API.
// Contrairement à /api/dashboard/write, gestionnaire_id est fourni
// explicitement par le corps de la requête (l'admin agit sur N'IMPORTE
// QUEL compte, pas seulement le sien).
// ============================================================================

type Reponse<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function erreur(message: string, status = 400) {
  return NextResponse.json<Reponse>({ ok: false, error: message }, { status });
}

function ok<T>(data: T) {
  return NextResponse.json<Reponse<T>>({ ok: true, data });
}

const STATUTS_AUTOMATISATION = ["actif", "inactif"] as const;
const STATUTS_TICKET = ["ouvert", "en_cours", "resolu", "ferme"] as const;
const PRIORITES_TICKET = ["basse", "normale", "haute", "urgente"] as const;

function estString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return erreur("Requête invalide.");
  }

  try {
    await getAdminActuel();
  } catch {
    return erreur("Accès refusé.", 403);
  }

  const supabase = createServiceClient();
  const action = body.action as string;

  switch (action) {
    case "automatisation.setStatut": {
      if (
        !estString(body.automatisationId) ||
        !estString(body.gestionnaireId) ||
        !STATUTS_AUTOMATISATION.includes(body.statut)
      ) {
        return erreur("Requête invalide.");
      }
      // Le sens inverse (statut → assistant_whatsapp_actif) est déjà géré
      // par le trigger existant (migration_002) : rien à faire de plus ici.
      const { error: err } = await supabase
        .from("automatisations")
        .update({ statut: body.statut })
        .eq("id", body.automatisationId)
        .eq("gestionnaire_id", body.gestionnaireId);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "client.updateNotes": {
      if (!estString(body.gestionnaireId)) return erreur("Requête invalide.");
      const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
      const { error: err } = await supabase
        .from("profils")
        .update({ notes })
        .eq("id", body.gestionnaireId);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "ticket.updateStatutPriorite": {
      if (!estString(body.ticketId)) return erreur("Requête invalide.");
      const patch: Record<string, string> = {};
      if (body.statut !== undefined) {
        if (!STATUTS_TICKET.includes(body.statut)) return erreur("Statut invalide.");
        patch.statut = body.statut;
      }
      if (body.priorite !== undefined) {
        if (!PRIORITES_TICKET.includes(body.priorite)) return erreur("Priorité invalide.");
        patch.priorite = body.priorite;
      }
      if (Object.keys(patch).length === 0) return erreur("Rien à mettre à jour.");
      patch.updated_at = new Date().toISOString();

      const { error: err } = await supabase.from("tickets").update(patch).eq("id", body.ticketId);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "ticket.addMessageSupport": {
      if (!estString(body.ticketId) || !estString(body.contenu)) {
        return erreur("Requête invalide.");
      }

      const { data: ticket } = await supabase
        .from("tickets")
        .select("id, titre, gestionnaire_id")
        .eq("id", body.ticketId)
        .maybeSingle();
      if (!ticket) return erreur("Ticket introuvable.", 404);

      const { error: erreurMessage } = await supabase.from("ticket_messages").insert({
        ticket_id: body.ticketId,
        auteur: "support",
        contenu: body.contenu.trim(),
      });
      if (erreurMessage) return erreur(erreurMessage.message, 500);

      const { error: erreurTicket } = await supabase
        .from("tickets")
        .update({ lu_par_gestionnaire: false, updated_at: new Date().toISOString() })
        .eq("id", body.ticketId);
      if (erreurTicket) {
        console.error(
          "[admin/write] Échec de la mise à jour de lu_par_gestionnaire pour ticket_id=",
          body.ticketId,
          ":",
          erreurTicket
        );
      }

      // Notification email best-effort : ne doit jamais faire échouer
      // l'enregistrement de la réponse support elle-même — c'était un TODO
      // resté en suspens depuis la construction initiale des tickets.
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(ticket.gestionnaire_id);
        const email = authUser?.user?.email;
        if (email) {
          await envoyerEmailReponseTicket(email, ticket.titre, ticket.id);
        } else {
          console.error(
            "[admin/write] Aucun email trouvé pour gestionnaire_id=",
            ticket.gestionnaire_id,
            "— notification non envoyée."
          );
        }
      } catch (erreurEmail) {
        console.error(
          "[admin/write] Échec de l'envoi de l'email de notification pour ticket_id=",
          ticket.id,
          ":",
          erreurEmail
        );
      }

      return ok(undefined);
    }

    default:
      return erreur("Action inconnue.");
  }
}
