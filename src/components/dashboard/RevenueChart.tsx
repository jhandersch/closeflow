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
        <p className="text-sm uppercase tracking-widest text-cyan-400">Revenue Chart</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Monatliche Einnahmen</h2>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)"/>
            <XAxis dataKey="month" stroke="rgba(148,163,184,0.7)" tickLine={false} axisLine={false}/>
            <YAxis stroke="rgba(148,163,184,0.7)" tickLine={false} axisLine={false}/>
            <Tooltip formatter={(value) => [`€${Number(value).toLocaleString("en-US")}`, "Revenue"]}/>
            <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>);
}
