"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const COULEUR_MRR = "#3F7D58"; // succès
const COULEUR_COUTS = "#B23A34"; // erreur
const COULEUR_GRILLE = "#E8E2D6"; // bordure
const COULEUR_AXE = "#6E6A60"; // texte secondaire

const NOMS: Record<string, string> = { mrr: "MRR", couts: "Coûts" };

export function MrrVsCoutsChart({ data }: { data: { mois: string; mrr: number; couts: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COULEUR_GRILLE} vertical={false} />
        <XAxis dataKey="mois" tick={{ fill: COULEUR_AXE, fontSize: 11 }} axisLine={{ stroke: COULEUR_GRILLE }} tickLine={false} />
        <YAxis
          tick={{ fill: COULEUR_AXE, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={50}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip
          formatter={(valeur, nom) => [`${Number(valeur).toLocaleString("fr-FR")} FCFA`, NOMS[String(nom)] ?? String(nom)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: COULEUR_GRILLE }}
        />
        <Legend
          formatter={(valeur: string) => <span className="text-xs text-texte-secondaire">{NOMS[valeur] ?? valeur}</span>}
          iconType="circle"
          iconSize={8}
        />
        <Line type="monotone" dataKey="mrr" stroke={COULEUR_MRR} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="couts" stroke={COULEUR_COUTS} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
