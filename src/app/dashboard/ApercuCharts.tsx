"use client";

import {
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";

const COULEUR_LIGNE = "#2a78d6"; // palette catégorielle, slot 1 (bleu)
const COULEUR_GRILLE = "#e1e0d9";
const COULEUR_AXE = "#898781";

const STATUT_COULEURS: Record<string, string> = {
  actif: "#0ca30c", // status good
  inactif: "#c3c2b7", // gris neutre
  erreur: "#d03b3b", // status critical
};

const STATUT_LABELS: Record<string, string> = {
  actif: "Actif",
  inactif: "Inactif",
  erreur: "Erreur",
};

export function MessagesParJourChart({ data }: { data: { date: string; messages: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={COULEUR_GRILLE} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: COULEUR_AXE, fontSize: 11 }}
          axisLine={{ stroke: COULEUR_GRILLE }}
          tickLine={false}
          interval={4}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: COULEUR_AXE, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          formatter={(valeur) => [`${valeur}`, "Messages"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: COULEUR_GRILLE }}
        />
        <Line
          type="monotone"
          dataKey="messages"
          stroke={COULEUR_LIGNE}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatutsAutomatisationsChart({
  data,
}: {
  data: { statut: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-neutral-500">
        Aucune automatisation pour l&apos;instant.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="statut"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={data.length > 1 ? 3 : 0}
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((entree) => (
              <Cell key={entree.statut} fill={STATUT_COULEURS[entree.statut] ?? "#c3c2b7"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(valeur, nom) => [`${valeur}`, STATUT_LABELS[String(nom)] ?? String(nom)]}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: COULEUR_GRILLE }}
          />
          <Legend
            formatter={(valeur: string) => (
              <span className="text-xs text-neutral-600">{STATUT_LABELS[valeur] ?? valeur}</span>
            )}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
