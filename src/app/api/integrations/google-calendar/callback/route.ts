import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { chiffrerCleApi } from "@/lib/integrations/chiffrement";
import { echangerCodeContreTokens, verifierState, type ConfigGoogleCalendar } from "@/lib/integrations/google-calendar";

// Retour du flux OAuth Google Calendar. Route publique côté Next.js (aucune
// session requise ici — Google redirige le navigateur depuis son propre
// domaine) : le gestionnaire concerné est identifié uniquement via le state
// signé généré par /api/integrations/google-calendar/autoriser, jamais fait
// confiance à autre chose dans la requête.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erreurGoogle = url.searchParams.get("error");

  function redirection(params: Record<string, string>) {
    const destination = new URL("/dashboard/integrations", url.origin);
    for (const [k, v] of Object.entries(params)) destination.searchParams.set(k, v);
    return NextResponse.redirect(destination);
  }

  if (erreurGoogle) {
    return redirection({ google_calendar: "erreur", message: erreurGoogle });
  }

  const gestionnaireId = state ? verifierState(state) : null;
  if (!code || !gestionnaireId) {
    return redirection({ google_calendar: "erreur", message: "Requête invalide ou expirée, réessayez." });
  }

  const supabase = createServiceClient();

  try {
    const { accessToken, refreshToken, expiryDate } = await echangerCodeContreTokens(code);

    // Google ne renvoie un refresh_token que si prompt=consent force un
    // nouveau consentement (notre cas) — mais par sécurité, s'il manquait,
    // on garde celui déjà stocké plutôt que de casser une connexion
    // existante avec un token qu'on ne pourra plus jamais rafraîchir.
    let refreshTokenChiffre: string;
    if (refreshToken) {
      refreshTokenChiffre = chiffrerCleApi(refreshToken);
    } else {
      const { data: existant } = await supabase
        .from("integrations")
        .select("config")
        .eq("gestionnaire_id", gestionnaireId)
        .eq("fournisseur", "google_calendar")
        .maybeSingle();
      const configExistante = (existant?.config as ConfigGoogleCalendar | null) ?? null;
      if (!configExistante?.refresh_token_chiffre) {
        return redirection({
          google_calendar: "erreur",
          message:
            "Google n'a pas fourni de jeton de rafraîchissement. Révoquez l'accès AkilAI dans votre compte Google (myaccount.google.com/permissions) puis réessayez.",
        });
      }
      refreshTokenChiffre = configExistante.refresh_token_chiffre;
    }

    const config: ConfigGoogleCalendar = {
      access_token_chiffre: chiffrerCleApi(accessToken),
      refresh_token_chiffre: refreshTokenChiffre,
      expiry_date: expiryDate,
      calendar_id: "primary",
    };

    const { error: err } = await supabase.from("integrations").upsert(
      {
        gestionnaire_id: gestionnaireId,
        fournisseur: "google_calendar",
        statut: "connecte",
        connecte_le: new Date().toISOString(),
        message_erreur: null,
        config,
      },
      { onConflict: "gestionnaire_id,fournisseur" }
    );
    if (err) {
      console.error("[google-calendar/callback] Échec de l'enregistrement de la config:", err);
      return redirection({ google_calendar: "erreur", message: "Erreur serveur lors de l'enregistrement." });
    }

    return redirection({ google_calendar: "succes" });
  } catch (erreur) {
    console.error("[google-calendar/callback] Échec de l'échange du code d'autorisation:", erreur);
    return redirection({
      google_calendar: "erreur",
      message: erreur instanceof Error ? erreur.message : "Échec de la connexion à Google Calendar.",
    });
  }
}
