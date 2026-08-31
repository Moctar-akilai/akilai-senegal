// Petit client pour /api/dashboard/write — voir le commentaire en haut de
// ce fichier de route pour le contexte complet (contournement temporaire
// de l'authentification).
export type ResultatEcriture<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function ecrireDashboard<T = undefined>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<ResultatEcriture<T>> {
  try {
    const reponse = await fetch("/api/dashboard/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const corps = await reponse.json().catch(() => null);
    if (!reponse.ok || !corps?.ok) {
      return { ok: false, error: corps?.error ?? "Une erreur est survenue." };
    }
    return { ok: true, data: corps.data as T };
  } catch {
    return { ok: false, error: "Impossible de contacter le serveur." };
  }
}
