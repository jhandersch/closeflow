"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
type RevenueChartProps = {
    data: Array<{
        month: string;
        value: number;
    }>;
};
export default function RevenueChart({ data }: RevenueChartProps) {
    return (<section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="mb-4">
        <p className="text-sm uppercase tracking-widest text-cyan-400">Revenue · last 6 months</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Monatliche Einnahmen</h2>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="rgba(148,163,184,0.12)" />
            <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `€${Number(value).toLocaleString("en-US")}`} width={76} />
            <Tooltip
              cursor={{ fill: "rgba(34, 211, 238, 0.08)" }}
              contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}
              labelStyle={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: "#67e8f9" }}
              formatter={(value) => [`€${Number(value).toLocaleString("en-US")}`, "Revenue"]}
            />
            <Bar dataKey="value" name="Revenue" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={44} activeBar={{ fill: "#67e8f9", stroke: "#a5f3fc", strokeWidth: 1 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>);
}
