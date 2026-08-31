import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { FOURNISSEURS_CLE_API, type Fournisseur } from "@/lib/integrations/fournisseurs";
import { chiffrerCleApi, apercuMasqueCleApi } from "@/lib/integrations/chiffrement";
import { verifierCleApi } from "@/lib/integrations/verification";

// ⚠️ Contournement temporaire de l'authentification — même raison que
// /api/dashboard/write (voir le commentaire en haut de ce fichier) :
// service_role côté serveur avec gestionnaire_id venant explicitement de
// getGestionnaireActuel(), jamais une valeur fournie par le client. À
// fusionner dans /api/dashboard/write ou migrer vers une Server Action une
// fois la vraie authentification réactivée.
//
// La clé API en clair ne transite que dans le corps de cette requête ; elle
// est chiffrée (AES-256-GCM, src/lib/integrations/chiffrement.ts) avant
// tout stockage et n'est jamais renvoyée telle quelle — seul un aperçu
// masqué (apercuMasqueCleApi) repart vers le navigateur.

type Reponse = { ok: true; data: { statut: string; apercu: string; messageErreur: string | null } } | { ok: false; error: string };

function erreur(message: string, status = 400) {
  return NextResponse.json<Reponse>({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.fournisseur !== "string" || typeof body.cleApi !== "string") {
    return erreur("Requête invalide.");
  }

  const fournisseur = body.fournisseur as Fournisseur;
  const cleApi = body.cleApi.trim();

  if (!cleApi) return erreur("La clé API est requise.");
  if (!FOURNISSEURS_CLE_API.includes(fournisseur)) {
    return erreur("Ce fournisseur ne se connecte pas par clé API.");
  }

  const gestionnaire = await getGestionnaireActuel();
  const supabase = createServiceClient();

  const verification = await verifierCleApi(fournisseur, cleApi);
  const statut = verification.tentee && !verification.ok ? "erreur" : "connecte";
  const messageErreur = verification.tentee && !verification.ok ? verification.erreur : null;

  let cleApiChiffree: string;
  try {
    cleApiChiffree = chiffrerCleApi(cleApi);
  } catch (erreurChiffrement) {
    console.error("[integrations/connecter] Échec du chiffrement de la clé API:", erreurChiffrement);
    return erreur("Erreur serveur lors du chiffrement de la clé.", 500);
  }

  const { error: err } = await supabase.from("integrations").upsert(
    {
      gestionnaire_id: gestionnaire.id,
      fournisseur,
      statut,
      connecte_le: statut === "connecte" ? new Date().toISOString() : null,
      cle_api_chiffree: cleApiChiffree,
      derniere_verification: verification.tentee ? new Date().toISOString() : null,
      message_erreur: messageErreur,
    },
    { onConflict: "gestionnaire_id,fournisseur" }
  );

  if (err) return erreur(err.message, 500);

  return NextResponse.json<Reponse>({
    ok: true,
    data: { statut, apercu: apercuMasqueCleApi(cleApi), messageErreur },
  });
}
