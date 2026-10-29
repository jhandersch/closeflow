"use client";
import { translateText } from "@/lib/i18n";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { loadDemoData } from "@/lib/demoData";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
export default function DemoPage() {
    const { language } = useAppPreferences();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const startDemo = async (reload = false) => {
        setLoading(true);
        try {
            const result = await loadDemoData({ reload, language });
            const warning = result.warnings?.length ? ` ${translateText("Warnings:")} ${result.warnings.map((item) => translateText(item)).join(" ")}` : "";
            setMessage(`${translateText(result.message)} ${translateText("Leads:")} ${result.inserted_leads}, ${translateText("Activities:")} ${result.inserted_activities}, ${translateText("Tasks:")} ${result.inserted_tasks}.${warning}`);
        }
        catch (error) {
            setMessage(translateText(error instanceof Error ? error.message : "Failed to start demo"));
        }
        finally {
            setLoading(false);
        }
    };
    return (<AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{translateText("Demo")}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{translateText("Load a demo workspace")}</h1>
          <p className="mt-2 text-sm text-foreground/65">{translateText("Spin up a sample dataset to explore CloseFlow instantly.")}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => void startDemo(false)} disabled={loading} className="cf-btn-primary">
            {loading ? translateText("Loading...") : translateText("Load demo data")}
          </button>
          <button onClick={() => void startDemo(true)} disabled={loading} className="rounded-xl border border-border-subtle bg-surface-1 px-5 py-3 font-semibold text-foreground disabled:opacity-60">
            {loading ? translateText("Reloading...") : translateText("Reload demo data")}
          </button>
        </div>

        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </div>
    </AuthGuard>);
}
