"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/parametres", label: "Paramètres" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {LIENS.map((lien) => {
        const actif =
          lien.href === "/dashboard" ? pathname === lien.href : pathname.startsWith(lien.href);
        return (
          <li key={lien.href}>
            <Link
              href={lien.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                actif
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {lien.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
