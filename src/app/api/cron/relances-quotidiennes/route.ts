import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { envoyerRelance } from "@/lib/whatsapp/notifications";
import { moisCourantISO } from "@/lib/data/paiements";

const JOURS_AVANT_RELANCE = 5;
const JOURS_ENTRE_RELANCES = 7;

// Appelée quotidiennement par un scheduler externe (ex: cron-job.org).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const autorisation = request.headers.get("authorization");
    if (autorisation !== `Bearer ${secret}`) {
      return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
    }
  }

  const mois = moisCourantISO();
  const dateLimite = new Date(mois);
  dateLimite.setUTCDate(dateLimite.getUTCDate() + JOURS_AVANT_RELANCE);

  if (new Date() < dateLimite) {
    return NextResponse.json({ traites: 0, message: "Échéance du mois pas encore en retard." });
  }

  const supabase = createServiceClient();

  const { data: paiements, error } = await supabase
    .from("paiements")
    .select("id, derniere_relance_at")
    .eq("mois", mois)
    .in("statut", ["en_attente", "retard"]);

  if (error) {
    return NextResponse.json({ erreur: error.message }, { status: 500 });
  }

  const maintenant = Date.now();
  const seuilMs = JOURS_ENTRE_RELANCES * 24 * 60 * 60 * 1000;

  const aRelancer = (paiements ?? []).filter((p) => {
    if (!p.derniere_relance_at) return true;
    return maintenant - new Date(p.derniere_relance_at).getTime() >= seuilMs;
  });

  const resultats = await Promise.all(aRelancer.map((p) => envoyerRelance(supabase, p.id)));

  const envoyees = resultats.filter((r) => r.succes).length;

  return NextResponse.json({
    traites: resultats.length,
    envoyees,
    echecs: resultats.length - envoyees,
  });
}
