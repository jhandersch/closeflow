"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";

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

const DEFAULT_TIMEZONE = "Europe/Berlin";

const formatDateTime = (value: string, timeZone: string) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
};

export default function MonitoringPage() {
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [items, setItems] = useState<MonitoringItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadTimezone = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      const userTimezone =
        typeof user?.user_metadata?.timezone === "string"
          ? user.user_metadata.timezone
          : DEFAULT_TIMEZONE;

      try {
        Intl.DateTimeFormat("en-US", {
          timeZone: userTimezone,
        });
        setTimezone(userTimezone);
      } catch {
        setTimezone(DEFAULT_TIMEZONE);
      }
    };

    void loadTimezone();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const response = await fetch(
          "/api/monitoring/errors?limit=100"
        );

        if (!response.ok) {
          setItems([]);
          return;
        }

        const data = (await response.json()) as {
          items?: MonitoringItem[];
        };

        setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
            Settings
          </p>

          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Error Monitoring
          </h1>

          <p className="mt-2 text-sm text-foreground/65">
            Recent application and API errors captured for this workspace.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-foreground/60">
            Loading errors...
          </p>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-sm text-foreground/65">
            No errors captured yet.
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
            <table className="min-w-full divide-y divide-border-subtle text-sm">
              <thead>
                <tr className="text-left text-foreground/60">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Path</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-subtle">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 text-foreground/75">
                      {formatDateTime(item.created_at, timezone)}
                    </td>

                    <td className="px-4 py-3 text-foreground/85">
                      {item.payload?.source ||
                        item.event_type.replace("error.", "")}
                    </td>

                    <td className="px-4 py-3 text-foreground/85">
                      {item.payload?.level || "error"}
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {item.payload?.message || "Unknown error"}
                    </td>

                    <td className="px-4 py-3 text-foreground/70">
                      {item.payload?.pathname || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
