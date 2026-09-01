import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { dechiffrerCleApi } from "@/lib/integrations/chiffrement";
import { recupererProprietesBaseNotion } from "@/lib/integrations/notion";

// Utilisée par ConfigurerBaseNotionModal pour lister les propriétés d'une
// base Notion (databases.retrieve) et peupler les 4 selects de
// correspondance. Même architecture que les autres routes d'intégrations :
// service_role côté serveur, gestionnaire_id résolu depuis la session
// réelle, clé API déchiffrée uniquement ici — jamais transmise en clair.

type Reponse =
  | { ok: true; data: { proprietes: { nom: string; type: string }[] } }
  | { ok: false; error: string };

function erreur(message: string, status = 400) {
  return NextResponse.json<Reponse>({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.databaseId !== "string" || !body.databaseId.trim()) {
    return erreur("L'identifiant de la base Notion est requis.");
  }

  let gestionnaire: { id: string };
  try {
    gestionnaire = await getGestionnaireActuel();
  } catch {
    return erreur("Non authentifié.", 401);
  }
  const supabase = createServiceClient();

  const { data: integration } = await supabase
    .from("integrations")
    .select("cle_api_chiffree")
    .eq("gestionnaire_id", gestionnaire.id)
    .eq("fournisseur", "notion")
    .maybeSingle();

  if (!integration?.cle_api_chiffree) {
    return erreur("Notion n'est pas connecté.", 400);
  }

  let cleApi: string;
  try {
    cleApi = dechiffrerCleApi(integration.cle_api_chiffree);
  } catch (erreurDechiffrement) {
    console.error("[notion/proprietes] Échec du déchiffrement de la clé:", erreurDechiffrement);
    return erreur("Erreur serveur.", 500);
  }

  try {
    const proprietes = await recupererProprietesBaseNotion(cleApi, body.databaseId.trim());
    return NextResponse.json<Reponse>({ ok: true, data: { proprietes } });
  } catch (erreurNotion) {
    return erreur(
      erreurNotion instanceof Error ? erreurNotion.message : "Échec de la lecture de la base Notion.",
      502
    );
  }
}
