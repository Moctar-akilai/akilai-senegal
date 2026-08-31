"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  MessageCircle,
  Bot,
  CalendarClock,
  Plug,
  Calendar,
  Users,
  Ticket,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

const LIENS: { href: string; label: string; icone: LucideIcon }[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icone: LayoutDashboard },
  { href: "/dashboard/automatisations", label: "Automatisations", icone: Workflow },
  { href: "/dashboard/messages", label: "Historique de conversation", icone: MessageCircle },
  { href: "/dashboard/whatsapp-ia", label: "Configuration assistant", icone: Bot },
  { href: "/dashboard/programmation", label: "Programmation", icone: CalendarClock },
  { href: "/dashboard/integrations", label: "Intégrations", icone: Plug },
  { href: "/dashboard/agenda", label: "Agenda", icone: Calendar },
  { href: "/dashboard/crm", label: "CRM", icone: Users },
  { href: "/dashboard/tickets", label: "Tickets", icone: Ticket },
  { href: "/dashboard/factures", label: "Mes factures", icone: Receipt },
  { href: "/dashboard/parametres", label: "Paramètres", icone: Settings },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {LIENS.map((lien) => {
        const actif =
          lien.href === "/dashboard" ? pathname === lien.href : pathname.startsWith(lien.href);
        const Icone = lien.icone;
        return (
          <li key={lien.href}>
            <Link
              href={lien.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                actif
                  ? "bg-indigo-moyen text-blanc-casse"
                  : "text-nav-inactif hover:bg-white/5 hover:text-blanc-casse"
              }`}
            >
              <Icone className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">{lien.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
