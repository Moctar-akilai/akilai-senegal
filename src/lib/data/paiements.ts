import type { SupabaseClient } from "@supabase/supabase-js";

const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function formatMois(dateISO: string) {
  const d = new Date(dateISO);
  return `${MOIS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function moisCourantISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

// Génère l'échéance du mois en cours pour un bail si elle n'existe pas encore
export async function assurerEcheanceMoisCourant(
  supabase: SupabaseClient,
  bailId: string,
  montantLoyer: number
) {
  const mois = moisCourantISO();
  const { data: existant } = await supabase
    .from("paiements")
    .select("id")
    .eq("bail_id", bailId)
    .eq("mois", mois)
    .maybeSingle();

  if (!existant) {
    await supabase.from("paiements").insert({
      bail_id: bailId,
      mois,
      montant: montantLoyer,
      statut: "en_attente",
    });
  }
}
