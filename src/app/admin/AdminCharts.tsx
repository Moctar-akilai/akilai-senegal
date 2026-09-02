"use client";

import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell, Legend } from "recharts";

const COULEUR_BARRE = "#A45628"; // argile forte — accent principal
const COULEUR_GRILLE = "#E8E2D6"; // bordure
const COULEUR_AXE = "#6E6A60"; // texte secondaire

const PLAN_COULEURS: Record<string, string> = {
  Starter: "#C9C2B4", // sable foncé neutre
  Business: "#A45628", // argile forte
  Premium: "#1B2440", // indigo profond
};

export function MessagesBarChart({ data }: { data: { date: string; messages: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
        <Bar dataKey="messages" fill={COULEUR_BARRE} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RepartitionPlansChart({ data }: { data: { plan: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-texte-secondaire">
        Aucun client pour l&apos;instant.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="plan"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={data.length > 1 ? 3 : 0}
          stroke="#ffffff"
          strokeWidth={2}
        >
          {data.map((entree) => (
            <Cell key={entree.plan} fill={PLAN_COULEURS[entree.plan] ?? "#c3c2b7"} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: COULEUR_GRILLE }} />
        <Legend
          formatter={(valeur: string) => <span className="text-xs text-texte-secondaire">{valeur}</span>}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
