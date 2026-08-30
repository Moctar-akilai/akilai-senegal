import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { envoyerRelance } from "@/lib/whatsapp/notifications";

export async function POST(request: Request) {
  const corps = await request.json().catch(() => null);
  const paiementId = corps?.paiement_id;

  if (!paiementId) {
    return NextResponse.json({ erreur: "paiement_id manquant." }, { status: 400 });
  }

  const supabase = await createClient();
  const resultat = await envoyerRelance(supabase, paiementId);

  if (!resultat.succes) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
