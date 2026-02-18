"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; sales: number };

export function SalesChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
          <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#737373" />
          <YAxis tick={{ fontSize: 12 }} stroke="#737373" />
          <Tooltip
            cursor={{ fill: "rgba(251,191,36,0.08)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
            formatter={(value) => [`RM ${((Number(value) || 0) / 100).toFixed(2)}`, "Sales"]}
          />
          <Bar dataKey="sales" radius={[8, 8, 0, 0]} fill="#D4AF37" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
