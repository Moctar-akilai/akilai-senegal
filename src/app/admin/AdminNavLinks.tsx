"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LifeBuoy, Receipt, type LucideIcon } from "lucide-react";

const LIENS: { href: string; label: string; icone: LucideIcon }[] = [
  { href: "/admin", label: "Vue d'ensemble", icone: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icone: Users },
  { href: "/admin/tickets", label: "Support", icone: LifeBuoy },
  { href: "/admin/facturation", label: "Facturation & Paiements", icone: Receipt },
];

export function AdminNavLinks({ nbTicketsOuverts }: { nbTicketsOuverts: number }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {LIENS.map((lien) => {
        const actif = lien.href === "/admin" ? pathname === lien.href : pathname.startsWith(lien.href);
        const Icone = lien.icone;
        return (
          <li key={lien.href}>
            <Link
              href={lien.href}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                actif ? "bg-indigo-moyen text-blanc-casse" : "text-nav-inactif hover:bg-white/5 hover:text-blanc-casse"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icone className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{lien.label}</span>
              </span>
              {lien.href === "/admin/tickets" && nbTicketsOuverts > 0 && (
                <span className="shrink-0 rounded-full bg-erreur px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                  {nbTicketsOuverts}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
