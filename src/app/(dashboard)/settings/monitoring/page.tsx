"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
type MonitoringItem = {
    id: string;
    actor_user_id: string | null;
    event_type: string;
    payload: {
        level?: string;
        source?: string;
        message?: string;
        pathname?: string;
    } | null;
    created_at: string;
};
export default function MonitoringPage() {
    const { language } = useAppPreferences();
    const locale = "en-US";
    const [items, setItems] = useState<MonitoringItem[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const response = await fetch("/api/monitoring/errors?limit=100");
            if (!response.ok) {
                setItems([]);
                setLoading(false);
                return;
            }
            const data = (await response.json()) as {
                items?: MonitoringItem[];
            };
            setItems(Array.isArray(data.items) ? data.items : []);
            setLoading(false);
        };
        void load();
    }, []);
    return (<AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{"Monitoring"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{"Error Monitoring"}</h1>
          <p className="mt-2 text-sm text-foreground/65">{"Recent application and API errors captured for this workspace."}</p>
        </div>

        {loading ? <p className="text-sm text-foreground/60">{"Loading errors..."}</p> : null}

        {!loading && items.length === 0 ? (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-sm text-foreground/65">
            {"No errors captured yet."}
          </div>) : null}

        {items.length > 0 ? (<div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
            <table className="min-w-full divide-y divide-border-subtle text-sm">
              <thead>
                <tr className="text-left text-foreground/60">
                  <th className="px-4 py-3">{"Time"}</th>
                  <th className="px-4 py-3">{"Source"}</th>
                  <th className="px-4 py-3">{"Level"}</th>
                  <th className="px-4 py-3">{"Message"}</th>
                  <th className="px-4 py-3">{"Path"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {items.map((item) => (<tr key={item.id} className="align-top">
                    <td className="px-4 py-3 text-foreground/75">{new Date(item.created_at).toLocaleString(locale)}</td>
                    <td className="px-4 py-3 text-foreground/85">{item.payload?.source || item.event_type.replace("error.", "")}</td>
                    <td className="px-4 py-3 text-foreground/85">{item.payload?.level || ("error")}</td>
                    <td className="px-4 py-3 text-foreground">{item.payload?.message || ("Unknown error")}</td>
                    <td className="px-4 py-3 text-foreground/70">{item.payload?.pathname || "-"}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>) : null}
      </div>
    </AuthGuard>);
}
