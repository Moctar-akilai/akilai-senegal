// Petit client pour /api/admin/write — même schéma que
// src/lib/dashboard/ecrire.ts, pour les actions du backoffice admin.
export type ResultatEcriture<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function ecrireAdmin<T = undefined>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<ResultatEcriture<T>> {
  try {
    const reponse = await fetch("/api/admin/write", {
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
