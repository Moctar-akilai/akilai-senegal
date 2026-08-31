import type { Fournisseur } from "./fournisseurs";

export type ResultatConnexion =
  | { ok: true; data: { statut: string; apercu: string; messageErreur: string | null } }
  | { ok: false; error: string };

// Client pour /api/integrations/connecter — voir le commentaire en haut de
// ce fichier de route pour le contexte complet (contournement temporaire
// de l'authentification, chiffrement de la clé côté serveur).
export async function connecterIntegration(
  fournisseur: Fournisseur,
  cleApi: string
): Promise<ResultatConnexion> {
  try {
    const reponse = await fetch("/api/integrations/connecter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fournisseur, cleApi }),
    });
    const corps = await reponse.json().catch(() => null);
    if (!reponse.ok || !corps?.ok) {
      return { ok: false, error: corps?.error ?? "Une erreur est survenue." };
    }
    return { ok: true, data: corps.data };
  } catch {
    return { ok: false, error: "Impossible de contacter le serveur." };
  }
}
