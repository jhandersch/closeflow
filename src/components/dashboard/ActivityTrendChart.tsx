"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
type ActivityTrendChartProps = {
    data: Array<{
        label: string;
        value: number;
    }>;
};
export default function ActivityTrendChart({ data }: ActivityTrendChartProps) {
    const { t } = useAppPreferences();
    return (<section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground/65">{t("dashboard.activityVolume", "Activity volume")}</p>
          <h2 className="text-lg font-semibold text-foreground">{t("dashboard.activityTrend", "Activity trend")}</h2>
        </div>

        <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-300">
          {t("dashboard.last8Weeks", "Last 8 weeks")}
        </div>
      </div>

      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="currentColor" opacity={0.08} vertical={false}/>

            <XAxis dataKey="label" stroke="currentColor" opacity={0.5} tickLine={false}/>

            <YAxis stroke="currentColor" opacity={0.5} tickLine={false} allowDecimals={false}/>

            <Tooltip contentStyle={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
        }} formatter={(value) => [String(value), t("dashboard.activities", "Activities")]}/>

            <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={3} dot={{ r: 3, fill: "#a78bfa" }} activeDot={{ r: 5 }} animationDuration={1200}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>);
}
