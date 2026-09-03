import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminActuel } from "@/lib/auth/admin-actuel";
import { envoyerEmailReponseTicket } from "@/lib/email/resend";
import { ajouterUnMois, genererNumeroFacture } from "@/lib/admin/facturation";
import { STATUTS_LEAD } from "@/lib/admin/leads";
import { POSTES_INFRA } from "@/lib/admin/finances";

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
const PLANS_ESTIMES = ["Essentiel", "Croissance", "Pro"] as const;

function estString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function estDateISO(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function estMontantValide(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

// Distinct de estMontantValide : un poste de coût d'infra ou une dépense
// d'acquisition peut légitimement valoir 0 (ex: twilio non utilisé un
// mois donné), contrairement à un montant d'abonnement/facture.
function estMontantNonNegatif(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
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

    case "abonnement.create": {
      if (
        !estString(body.gestionnaireId) ||
        !estMontantValide(body.montantMensuel) ||
        !estDateISO(body.dateSignature) ||
        !estDateISO(body.dateProchainPaiement)
      ) {
        return erreur("Requête invalide.");
      }
      const { error: err } = await supabase.from("abonnements").insert({
        gestionnaire_id: body.gestionnaireId,
        montant_mensuel: body.montantMensuel,
        date_signature: body.dateSignature,
        date_prochain_paiement: body.dateProchainPaiement,
      });
      if (err) {
        // Contrainte unique sur gestionnaire_id : un seul abonnement par client.
        if (err.code === "23505") return erreur("Ce client a déjà un abonnement enregistré.");
        return erreur(err.message, 500);
      }
      return ok(undefined);
    }

    case "abonnement.updateMontant": {
      if (!estString(body.gestionnaireId) || !estMontantValide(body.montantMensuel)) {
        return erreur("Requête invalide.");
      }
      const { error: err } = await supabase
        .from("abonnements")
        .update({ montant_mensuel: body.montantMensuel, updated_at: new Date().toISOString() })
        .eq("gestionnaire_id", body.gestionnaireId);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "abonnement.marquerPaye": {
      if (!estString(body.gestionnaireId) || !estDateISO(body.dateEncaissement)) {
        return erreur("Requête invalide.");
      }
      if (body.montant !== undefined && !estMontantValide(body.montant)) {
        return erreur("Montant invalide.");
      }

      const { data: abonnement } = await supabase
        .from("abonnements")
        .select("montant_mensuel")
        .eq("gestionnaire_id", body.gestionnaireId)
        .maybeSingle();
      if (!abonnement) return erreur("Abonnement introuvable.", 404);

      const montant = estMontantValide(body.montant) ? body.montant : abonnement.montant_mensuel;
      const annee = Number(body.dateEncaissement.slice(0, 4));

      // Numérotation simple par comptage (pas de séquence dédiée) : ce
      // backoffice n'a qu'un seul admin, le risque de collision concurrente
      // est négligeable pour ce chantier.
      const { count: nbFacturesAnnee } = await supabase
        .from("factures")
        .select("id", { count: "exact", head: true })
        .like("numero", `FACT-${annee}-%`);
      const numero = genererNumeroFacture(annee, (nbFacturesAnnee ?? 0) + 1);

      const { error: erreurFacture } = await supabase.from("factures").insert({
        gestionnaire_id: body.gestionnaireId,
        numero,
        montant,
        statut: "payee",
        date_emission: body.dateEncaissement,
        // Pas de date d'échéance distincte pour un paiement déjà encaissé —
        // la colonne est NOT NULL, on reprend la date d'encaissement.
        date_echeance: body.dateEncaissement,
      });
      if (erreurFacture) return erreur(erreurFacture.message, 500);

      const { error: erreurAbonnement } = await supabase
        .from("abonnements")
        .update({
          date_prochain_paiement: ajouterUnMois(body.dateEncaissement),
          statut_paiement: "a_jour",
          updated_at: new Date().toISOString(),
        })
        .eq("gestionnaire_id", body.gestionnaireId);
      if (erreurAbonnement) return erreur(erreurAbonnement.message, 500);

      return ok({ numero });
    }

    case "abonnement.resilier": {
      if (!estString(body.gestionnaireId) || !estString(body.raison)) {
        return erreur("La raison de la résiliation est requise.");
      }

      const { error: erreurAbonnement } = await supabase
        .from("abonnements")
        .update({ statut_paiement: "resilie", updated_at: new Date().toISOString() })
        .eq("gestionnaire_id", body.gestionnaireId);
      if (erreurAbonnement) return erreur(erreurAbonnement.message, 500);

      const { data: profil } = await supabase
        .from("profils")
        .select("notes")
        .eq("id", body.gestionnaireId)
        .maybeSingle();
      const ligneResiliation = `[Résiliation ${new Date().toLocaleDateString("fr-FR")}] ${body.raison.trim()}`;
      const notes = profil?.notes ? `${profil.notes}\n${ligneResiliation}` : ligneResiliation;

      const { error: erreurNotes } = await supabase
        .from("profils")
        .update({ notes })
        .eq("id", body.gestionnaireId);
      if (erreurNotes) return erreur(erreurNotes.message, 500);

      return ok(undefined);
    }

    case "lead.create": {
      if (!estString(body.nom)) return erreur("Le nom est requis.");
      if (body.planEstime !== undefined && body.planEstime !== null && !PLANS_ESTIMES.includes(body.planEstime)) {
        return erreur("Plan estimé invalide.");
      }
      const { error: err } = await supabase.from("leads").insert({
        nom: body.nom.trim(),
        entreprise: estString(body.entreprise) ? body.entreprise.trim() : null,
        telephone: estString(body.telephone) ? body.telephone.trim() : null,
        email: estString(body.email) ? body.email.trim() : null,
        source: estString(body.source) ? body.source.trim() : null,
        plan_estime: body.planEstime ?? null,
      });
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "lead.update": {
      if (!estString(body.leadId) || !estString(body.nom)) return erreur("Requête invalide.");
      if (body.planEstime !== undefined && body.planEstime !== null && !PLANS_ESTIMES.includes(body.planEstime)) {
        return erreur("Plan estimé invalide.");
      }
      const { error: err } = await supabase
        .from("leads")
        .update({
          nom: body.nom.trim(),
          entreprise: estString(body.entreprise) ? body.entreprise.trim() : null,
          telephone: estString(body.telephone) ? body.telephone.trim() : null,
          email: estString(body.email) ? body.email.trim() : null,
          source: estString(body.source) ? body.source.trim() : null,
          plan_estime: body.planEstime ?? null,
          notes: estString(body.notes) ? body.notes.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.leadId);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "lead.updateStatut": {
      if (!estString(body.leadId) || !STATUTS_LEAD.includes(body.statut)) {
        return erreur("Requête invalide.");
      }
      // 'perdu' passe toujours par lead.marquerPerdu (raison obligatoire) —
      // jamais par ce chemin, même en cas d'appel direct à l'API.
      if (body.statut === "perdu") return erreur("Utilisez lead.marquerPerdu pour passer un lead à 'Perdu'.");
      const { error: err } = await supabase
        .from("leads")
        .update({ statut: body.statut, updated_at: new Date().toISOString() })
        .eq("id", body.leadId);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "lead.marquerPerdu": {
      if (!estString(body.leadId) || !estString(body.raison)) {
        return erreur("La raison de la perte est requise.");
      }
      const { error: err } = await supabase
        .from("leads")
        .update({ statut: "perdu", raison_perte: body.raison.trim(), updated_at: new Date().toISOString() })
        .eq("id", body.leadId);
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "lead.convertir": {
      if (
        !estString(body.leadId) ||
        !estString(body.email) ||
        !estString(body.nom) ||
        !estString(body.telephone)
      ) {
        return erreur("Email, nom et téléphone sont requis.");
      }

      const { data: lead } = await supabase
        .from("leads")
        .select("id, statut, plan_estime, gestionnaire_id_converti")
        .eq("id", body.leadId)
        .maybeSingle();
      if (!lead) return erreur("Lead introuvable.", 404);
      if (lead.statut !== "gagne") {
        return erreur("Seul un lead au statut 'Gagné' peut être converti en client.");
      }
      // Garde-fou serveur : empêche une double conversion (double clic, deux
      // onglets, ou état local du Kanban pas encore resynchronisé côté
      // client) qui créerait deux comptes pour le même lead.
      if (lead.gestionnaire_id_converti) {
        return erreur("Ce lead a déjà été converti en client.");
      }

      // 1. Crée le compte Supabase Auth via l'API admin (service_role) —
      // mot de passe généré aléatoirement, renvoyé une seule fois à
      // l'admin pour transmission au client.
      const motDePasse = randomBytes(9).toString("base64url");
      const { data: authData, error: erreurAuth } = await supabase.auth.admin.createUser({
        email: body.email.trim(),
        password: motDePasse,
        email_confirm: true,
      });
      if (erreurAuth || !authData.user) {
        return erreur(erreurAuth?.message ?? "Échec de la création du compte.", 500);
      }

      // 2. insert profils -> cascade automatique vers parametres_compte +
      // l'automatisation "Assistant WhatsApp" par défaut, via le trigger
      // existant (migration_002/migration_010) — même mécanisme que pour
      // toute création manuelle de compte jusqu'ici.
      const { error: erreurProfil } = await supabase.from("profils").insert({
        id: authData.user.id,
        nom: body.nom.trim(),
        telephone: body.telephone.trim(),
      });
      if (erreurProfil) {
        // Le compte Auth existe déjà à ce stade sans profil applicatif : on
        // le supprime pour ne pas laisser un compte orphelin inutilisable.
        await supabase.auth.admin.deleteUser(authData.user.id);
        return erreur(erreurProfil.message, 500);
      }

      // 3. Si un plan a été estimé sur le lead, l'applique au nouveau
      // compte plutôt que de laisser le défaut 'Essentiel'.
      if (lead.plan_estime) {
        await supabase
          .from("parametres_compte")
          .update({ plan: lead.plan_estime })
          .eq("gestionnaire_id", authData.user.id);
      }

      const { error: erreurLead } = await supabase
        .from("leads")
        .update({ gestionnaire_id_converti: authData.user.id, updated_at: new Date().toISOString() })
        .eq("id", body.leadId);
      if (erreurLead) return erreur(erreurLead.message, 500);

      return ok({ gestionnaireId: authData.user.id, motDePasse });
    }

    case "finances.saveCoutsInfra": {
      if (!estDateISO(body.mois) || typeof body.montants !== "object" || body.montants === null) {
        return erreur("Requête invalide.");
      }
      const montants = body.montants as Record<string, unknown>;
      for (const poste of POSTES_INFRA) {
        if (!estMontantNonNegatif(montants[poste])) {
          return erreur(`Montant invalide pour le poste "${poste}".`);
        }
      }
      const lignes = POSTES_INFRA.map((poste) => ({
        mois: body.mois,
        poste,
        montant: montants[poste] as number,
      }));
      const { error: err } = await supabase.from("couts_infrastructure").upsert(lignes, { onConflict: "mois,poste" });
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    case "finances.saveDepenseAcquisition": {
      if (!estDateISO(body.mois) || !estMontantNonNegatif(body.montant)) {
        return erreur("Requête invalide.");
      }
      const { error: err } = await supabase
        .from("depenses_acquisition")
        .upsert(
          { mois: body.mois, montant: body.montant, updated_at: new Date().toISOString() },
          { onConflict: "mois" }
        );
      if (err) return erreur(err.message, 500);
      return ok(undefined);
    }

    default:
      return erreur("Action inconnue.");
  }
}
