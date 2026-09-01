import { NextResponse, type NextRequest } from "next/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { construireUrlAutorisationGoogle, signerState } from "@/lib/integrations/google-calendar";

// Point d'entrée du bouton "Connecter" Google Calendar (navigation complète
// du navigateur, pas un fetch) : génère un state signé pour ce gestionnaire
// puis redirige vers l'écran de consentement Google. Voir
// src/lib/integrations/google-calendar.ts pour la génération du state et
// /api/integrations/google-calendar/callback pour le retour.
export async function GET(request: NextRequest) {
  let gestionnaire: { id: string };
  try {
    gestionnaire = await getGestionnaireActuel();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = signerState(gestionnaire.id);
  return NextResponse.redirect(construireUrlAutorisationGoogle(state));
}
