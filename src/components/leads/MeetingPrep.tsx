"use client";
import { formatTextForLanguage, translateText } from "@/lib/i18n";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
type Props = {
    lead: any;
};
export default function MeetingPrep({ lead }: Props) {
    const { language } = useAppPreferences();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const generate = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("/api/ai/meeting-prep", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ lead, language }),
        });
        setResult(await response.json());
        setLoading(false);
    };
    return (<section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400">{translateText("Meeting-Vorbereitung")}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{translateText("Meeting vorbereiten")}</h3>
        </div>
        <button type="button" onClick={() => void generate()} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
          {loading ? translateText("Vorbereitung...") : translateText("Meeting vorbereiten")}
        </button>
      </div>

      {result ? (<div className="mt-4 space-y-3 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">{translateText("Summary:")}</span> {formatTextForLanguage(result.customer_summary || "", language)}</p>
          <p><span className="font-semibold text-foreground">{translateText("Important points:")}</span> {(result.important_points || []).map((item: string) => formatTextForLanguage(item, language)).join(", ")}</p>
          <p><span className="font-semibold text-foreground">{translateText("Questions:")}</span> {(result.questions || []).map((item: string) => formatTextForLanguage(item, language)).join(", ")}</p>
          <p><span className="font-semibold text-foreground">{translateText("Risks:")}</span> {(result.risks || []).map((item: string) => formatTextForLanguage(item, language)).join(", ")}</p>
          <p><span className="font-semibold text-foreground">{translateText("Next steps:")}</span> {(result.next_steps || []).map((item: string) => formatTextForLanguage(item, language)).join(", ")}</p>
        </div>) : null}
    </section>);
}
