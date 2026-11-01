"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { readApiError } from "@/lib/apiError";
import { translateText } from "@/lib/i18n";

type IntegrationStatus = {
  google: {
    available: boolean;
    connected: boolean;
    email: string | null;
    gmail: boolean;
    calendar: boolean;
  };
};

const callbackMessages: Record<string, { ok: boolean; text: string }> = {
  google_connected: { ok: true, text: "Google connected" },
  google_denied: { ok: false, text: "Google connection was cancelled" },
  google_failed: { ok: false, text: "Google connection failed. Please try again." },
};

export function IntegrationsSettings() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    if (!response.ok) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setStatus((await response.json()) as IntegrationStatus);
  }, []);

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const result = callbackMessages[params.get("integration") ?? ""];
    if (result) {
      (result.ok ? toast.success : toast.error)(translateText(result.text));
      window.history.replaceState(null, "", "/settings#integrations");
    }
  }, [load]);

  const connectGoogle = async () => {
    setBusy(true);
    const response = await fetch("/api/integrations/google", { cache: "no-store" });
    if (!response.ok) {
      toast.error(await readApiError(response, "Could not start the Google connection"));
      setBusy(false);
      return;
    }
    const { url } = (await response.json()) as { url: string };
    window.location.href = url;
  };

  const disconnect = async () => {
    setBusy(true);
    const response = await fetch("/api/integrations/google", { method: "DELETE" });
    if (!response.ok) {
      toast.error(await readApiError(response, "Could not disconnect"));
    } else {
      toast.success(translateText("Disconnected"));
      await load();
    }
    setBusy(false);
  };

  const buttonClass =
    "rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-60";
  const badge = (on: boolean) => (
    <span className={on ? "text-emerald-500" : "text-foreground/50"}>
      {translateText(on ? "Connected" : "Not connected")}
    </span>
  );

  return (
    <div id="integrations" className="scroll-mt-24 rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <h2 className="text-xl font-semibold text-foreground">{translateText("Integrations")}</h2>
      <p className="mt-2 text-sm text-foreground/65">
        {translateText("Connect your communication and calendar stack.")}
      </p>

      {loadFailed ? (
        <p className="mt-4 text-sm text-foreground/65">
          {translateText("Integrations could not be loaded.")}
        </p>
      ) : null}

      {status ? (
        <div className="mt-5 space-y-4">
          <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-2/70 p-4 text-sm text-foreground/80">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-foreground">{translateText("Google")}</span>
              {badge(status.google.connected)}
            </div>
            {status.google.connected ? (
              <>
                {status.google.email ? <p className="text-foreground/65">{status.google.email}</p> : null}
                <p>
                  {translateText("Gmail")}: {badge(status.google.gmail)} · {translateText("Calendar")}:{" "}
                  {badge(status.google.calendar)}
                </p>
                <p className="text-foreground/65">
                  {translateText("Emails to leads are sent via your Gmail. New meetings are added to your Google Calendar.")}
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={busy || !status.google.available} onClick={connectGoogle} className={buttonClass}>
                    {translateText("Reconnect")}
                  </button>
                  <button type="button" disabled={busy} onClick={disconnect} className={buttonClass}>
                    {translateText("Disconnect")}
                  </button>
                </div>
              </>
            ) : status.google.available ? (
              <button type="button" disabled={busy} onClick={connectGoogle} className={buttonClass}>
                {translateText("Connect Google (Gmail + Calendar)")}
              </button>
            ) : (
              <p className="text-foreground/65">{translateText("Not available yet.")}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
