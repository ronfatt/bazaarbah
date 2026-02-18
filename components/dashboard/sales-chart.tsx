"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; sales: number };

export function SalesChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} stroke="#2a4e45" />
          <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} stroke="#2a4e45" />
          <Tooltip
            cursor={{ fill: "rgba(0,194,168,0.08)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, background: "#112E27", color: "#F3F4F6" }}
            formatter={(value) => [`RM ${((Number(value) || 0) / 100).toFixed(2)}`, "Sales"]}
          />
          <Bar dataKey="sales" radius={[8, 8, 0, 0]} fill="#C9A227" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
