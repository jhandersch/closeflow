"use client";
import { getIntlLocale, translateText  } from "@/lib/i18n";


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
  return new Intl.DateTimeFormat(getIntlLocale(), {
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
        Intl.DateTimeFormat(getIntlLocale(), {
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

  const [auditItems, setAuditItems] = useState<MonitoringItem[]>([]);

  useEffect(() => {
    fetch("/api/audit-logs?limit=50")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data: { items?: MonitoringItem[] }) =>
        setAuditItems(Array.isArray(data.items) ? data.items : []),
      )
      .catch(() => setAuditItems([]));
  }, []);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
            {translateText("Settings")}</p>

          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {translateText("Error Monitoring")}</h1>

          <p className="mt-2 text-sm text-foreground/65">
            {translateText("Recent application and API errors captured for this workspace.")}</p>
        </div>

        {loading ? (
          <p className="text-sm text-foreground/60">
            {translateText("Loading errors...")}</p>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-sm text-foreground/65">
            {translateText("No errors captured yet.")}</div>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
            <table className="min-w-full divide-y divide-border-subtle text-sm">
              <thead>
                <tr className="text-left text-foreground/60">
                  <th className="px-4 py-3">{translateText("Time")}</th>
                  <th className="px-4 py-3">{translateText("Source")}</th>
                  <th className="px-4 py-3">{translateText("Level")}</th>
                  <th className="px-4 py-3">{translateText("Message")}</th>
                  <th className="px-4 py-3">{translateText("Path")}</th>
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
                      {item.payload?.level || translateText("error")}
                    </td>

                    <td className="px-4 py-3 text-foreground">
                      {item.payload?.message || translateText("Unknown error")}
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

        {auditItems.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {translateText("Audit log")}</h2>
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
              <table className="min-w-full divide-y divide-border-subtle text-sm">
                <thead>
                  <tr className="text-left text-foreground/60">
                    <th className="px-4 py-3">{translateText("Time")}</th>
                    <th className="px-4 py-3">{translateText("Event")}</th>
                    <th className="px-4 py-3">{translateText("Details")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {auditItems.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-3 text-foreground/75">
                        {formatDateTime(item.created_at, timezone)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{item.event_type}</td>
                      <td className="px-4 py-3 text-foreground/70">
                        {Object.entries(item.payload || {})
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(", ") || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
