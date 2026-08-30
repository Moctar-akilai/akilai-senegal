import type { SupabaseClient } from "@supabase/supabase-js";
import { envoyerMessageWhatsApp, messageQuittance, messageRelance } from "./twilio";
import { formatMois } from "@/lib/data/paiements";

type ResultatEnvoi = { succes: true } | { succes: false; erreur: string };

async function recupererPaiementAvecDetails(supabase: SupabaseClient, paiementId: string) {
  const { data } = await supabase
    .from("paiements")
    .select("id, mois, montant, baux(biens(adresse), locataires(nom, telephone))")
    .eq("id", paiementId)
    .maybeSingle();

  const bail = data?.baux?.[0];
  const bien = bail?.biens?.[0];
  const locataire = bail?.locataires?.[0];
  if (!data || !bien || !locataire) return null;

  return {
    mois: data.mois as string,
    montant: data.montant as number,
    adresseBien: bien.adresse as string,
    locataireNom: locataire.nom as string,
    locataireTelephone: locataire.telephone as string,
  };
}

export async function envoyerQuittance(
  supabase: SupabaseClient,
  paiementId: string
): Promise<ResultatEnvoi> {
  const details = await recupererPaiementAvecDetails(supabase, paiementId);
  if (!details) return { succes: false, erreur: "Paiement introuvable." };

  try {
    await envoyerMessageWhatsApp(
      details.locataireTelephone,
      messageQuittance({
        locataireNom: details.locataireNom,
        mois: formatMois(details.mois),
        montant: details.montant,
        adresseBien: details.adresseBien,
      })
    );
  } catch (e) {
    return { succes: false, erreur: e instanceof Error ? e.message : "Échec de l'envoi WhatsApp." };
  }

  const { error } = await supabase
    .from("paiements")
    .update({ quittance_envoyee: true })
    .eq("id", paiementId);

  if (error) return { succes: false, erreur: error.message };
  return { succes: true };
}

export async function envoyerRelance(
  supabase: SupabaseClient,
  paiementId: string
): Promise<ResultatEnvoi> {
  const details = await recupererPaiementAvecDetails(supabase, paiementId);
  if (!details) return { succes: false, erreur: "Paiement introuvable." };

  try {
    await envoyerMessageWhatsApp(
      details.locataireTelephone,
      messageRelance({
        locataireNom: details.locataireNom,
        mois: formatMois(details.mois),
        montant: details.montant,
        adresseBien: details.adresseBien,
      })
    );
  } catch (e) {
    return { succes: false, erreur: e instanceof Error ? e.message : "Échec de l'envoi WhatsApp." };
  }

  const { error } = await supabase
    .from("paiements")
    .update({
      relance_envoyee: true,
      statut: "retard",
      derniere_relance_at: new Date().toISOString(),
    })
    .eq("id", paiementId);

  if (error) return { succes: false, erreur: error.message };
  return { succes: true };
}
