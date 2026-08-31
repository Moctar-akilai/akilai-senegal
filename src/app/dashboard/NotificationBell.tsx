"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

export type NotificationDashboard = {
  id: string;
  type: string;
  titre: string;
  message: string | null;
  lien: string | null;
  lu: boolean;
  created_at: string;
};

function formatRelatif(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures}h`;
  const jours = Math.floor(heures / 24);
  if (jours < 7) return `il y a ${jours}j`;
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function NotificationBell({
  notificationsInitiales,
}: {
  notificationsInitiales: NotificationDashboard[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [notifications, setNotifications] = useState(notificationsInitiales);

  const nonLues = notifications.filter((n) => !n.lu).length;

  // ⚠️ Contournement temporaire de l'authentification — écrit via
  // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
  // tant que le bypass est actif. Voir le commentaire en haut de cette
  // route API.
  async function ouvrirNotification(n: NotificationDashboard) {
    setOuvert(false);
    if (!n.lu) {
      setNotifications((liste) => liste.map((x) => (x.id === n.id ? { ...x, lu: true } : x)));
      await ecrireDashboard("notification.markRead", { id: n.id });
    }
    if (n.lien) router.push(n.lien);
    router.refresh();
  }

  async function toutMarquerLu() {
    setNotifications((liste) => liste.map((n) => ({ ...n, lu: true })));
    await ecrireDashboard("notification.markAllRead", {});
    router.refresh();
  }

  async function supprimer(id: string) {
    setNotifications((liste) => liste.filter((n) => n.id !== id));
    await ecrireDashboard("notification.delete", { id });
    router.refresh();
  }

  async function viderTout() {
    setNotifications([]);
    await ecrireDashboard("notification.deleteAll", {});
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="relative rounded-lg p-2 text-texte-secondaire transition-colors hover:bg-bordure/60 hover:text-encre"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        {nonLues > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-argile px-1 text-[10px] font-medium text-white">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOuvert(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-bordure bg-carte shadow-[var(--shadow-flottant)]">
            <div className="flex items-center justify-between border-b border-bordure px-4 py-2.5">
              <span className="text-sm font-medium text-encre">Notifications</span>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={toutMarquerLu}
                  className="text-xs text-texte-secondaire transition-colors hover:text-encre"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-texte-secondaire">
                  Aucune notification.
                </p>
              ) : (
                <ul className="divide-y divide-bordure">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`group flex items-start gap-2 px-4 py-3 hover:bg-bordure/60 ${
                        !n.lu ? "bg-attention-pastel/40" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => ouvrirNotification(n)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="flex items-center gap-1.5 text-sm font-medium text-encre">
                          {!n.lu && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-argile" />}
                          {n.titre}
                        </p>
                        {n.message && (
                          <p className="mt-0.5 truncate text-xs text-texte-secondaire">{n.message}</p>
                        )}
                        <p className="mt-0.5 text-xs text-texte-secondaire">{formatRelatif(n.created_at)}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => supprimer(n.id)}
                        className="shrink-0 rounded p-1 text-texte-secondaire opacity-0 transition-colors hover:bg-bordure hover:text-encre group-hover:opacity-100"
                        aria-label="Supprimer"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-bordure px-4 py-2">
                <button
                  type="button"
                  onClick={viderTout}
                  className="w-full text-center text-xs text-texte-secondaire transition-colors hover:text-erreur"
                >
                  Vider tout
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
