"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppPreferences } from "@/components/AppPreferencesProvider";

type RevenueForecastChartProps = {
  data: Array<{
    month: string;
    conservative: number;
    expected: number;
    optimistic: number;
  }>;
};

export default function RevenueForecastChart({
  data,
}: RevenueForecastChartProps) {
  const { t } = useAppPreferences();
  const locale = "en-US";
  const latest = data[data.length - 1];

  return (
    <section
      className="
        rounded-2xl
        border
        border-border-subtle
        bg-surface-1
        p-6
      "
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground/65">
            {t(
              "dashboard.revenueIntelligence",
              "Revenue intelligence"
            )}
          </p>

          <h2 className="text-lg font-semibold text-foreground">
            Possible forecast paths
          </h2>
          <p className="mt-1 text-sm text-foreground/60">Cumulative estimated deal value after listed costs · next six months</p>
        </div>

        <div
          className="
            rounded-full
            border
            border-emerald-500/20
            bg-emerald-500/10
            px-3
            py-1
            text-sm
            text-emerald-300
          "
        >
          Three scenarios
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ScenarioValue title="Conservative" value={latest?.conservative ?? 0} color="text-rose-300" />
        <ScenarioValue title="Expected" value={latest?.expected ?? 0} color="text-cyan-300" />
        <ScenarioValue title="Optimistic" value={latest?.optimistic ?? 0} color="text-emerald-300" />
      </div>

      <div className="mt-6 h-80">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart data={data}>
            <CartesianGrid
              stroke="#94a3b8"
              opacity={0.10}
              vertical={false}
            />

            <XAxis
              dataKey="month"
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickLine={false}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value) =>
                `€${value / 1000}k`
              }
            />

            <Tooltip
              cursor={{ stroke: "rgba(148, 163, 184, 0.35)", strokeDasharray: "4 4" }}
              contentStyle={{
                background: "var(--surface-1)",
                border:
                  "1px solid var(--border-subtle)",
                borderRadius: "12px",
                boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
              }}
              labelStyle={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: "#cbd5e1" }}
              formatter={(value, name) => [
                `€${Number(value ?? 0).toLocaleString(
                  locale
                )}`,
                String(name),
              ]}
            />
            <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12, paddingTop: 8 }} />
            <Line type="monotone" dataKey="conservative" name="Conservative" stroke="#fb7185" strokeWidth={2} dot={false} activeDot={{ r: 5 }} animationDuration={900} />
            <Line type="monotone" dataKey="expected" name="Expected" stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 5 }} animationDuration={1100} />
            <Line type="monotone" dataKey="optimistic" name="Optimistic" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{ r: 5 }} animationDuration={1300} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-surface-2/70 text-xs uppercase tracking-wide text-foreground/55">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3 text-rose-300">Conservative</th>
              <th className="px-4 py-3 text-cyan-300">Expected</th>
              <th className="px-4 py-3 text-emerald-300">Optimistic</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className="border-t border-border-subtle text-foreground/75">
                <td className="px-4 py-3 font-medium text-foreground">{row.month}</td>
                <td className="px-4 py-3">€{Number(row.conservative || 0).toLocaleString(locale)}</td>
                <td className="px-4 py-3">€{Number(row.expected || 0).toLocaleString(locale)}</td>
                <td className="px-4 py-3">€{Number(row.optimistic || 0).toLocaleString(locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/50 p-4 text-sm text-foreground/65">
        <p className="font-medium text-foreground/80">How to read these paths</p>
        <p className="mt-1">The expected path uses each open deal's close probability. The conservative path lowers it by 10–25 points based on risk; the optimistic path raises it by the same amount. Deals without a future close date are placed using their pipeline stage. Listed personal costs are deducted before values are weighted.</p>
      </div>
    </section>
  );
}

function ScenarioValue({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
      <p className={`text-sm ${color}`}>{title} · month 6</p>
      <p className="mt-1 text-xl font-semibold text-foreground">€{value.toLocaleString("en-US")}</p>
    </div>
  );
}
