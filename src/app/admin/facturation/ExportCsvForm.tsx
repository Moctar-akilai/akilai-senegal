"use client";

import { useState } from "react";

function debutMoisISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function aujourdHuiISO() {
  return new Date().toISOString().slice(0, 10);
}

// Navigation directe (pas de fetch) : le navigateur télécharge le CSV
// renvoyé par la route avec son Content-Disposition.
export function ExportCsvForm() {
  const [debut, setDebut] = useState(debutMoisISO());
  const [fin, setFin] = useState(aujourdHuiISO());

  return (
    <form
      action="/api/admin/facturation/export"
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-bordure bg-carte p-4 shadow-[var(--shadow-carte)]"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-texte-secondaire">Du</label>
        <input
          type="date"
          name="debut"
          value={debut}
          onChange={(e) => setDebut(e.target.value)}
          className="rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-texte-secondaire">Au</label>
        <input
          type="date"
          name="fin"
          value={fin}
          onChange={(e) => setFin(e.target.value)}
          className="rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg border border-bordure px-4 py-2 text-sm font-medium text-encre hover:bg-bordure/60"
      >
        Exporter en CSV
      </button>
    </form>
  );
}
