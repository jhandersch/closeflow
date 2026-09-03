"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import type { Lead } from "@/types";
type AILeadSummaryProps = {
    lead: Lead;
};
type FollowUp = {
    subject: string;
    email: string;
    reason: string;
    next_action: string;
};
export default function AILeadSummary({ lead, }: AILeadSummaryProps) {
    const { language } = useAppPreferences();
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [followUp, setFollowUp] = useState<FollowUp | null>(null);
    const [followLoading, setFollowLoading] = useState(false);
    const [followCopied, setFollowCopied] = useState(false);
    const generateAnalysis = async () => {
        try {
            setLoading(true);
            const { data: { session }, } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error("Please sign in again to generate AI analysis.");
            }
            const response = await fetch(`/api/leads/${lead.id}/ai-analysis`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("AI API ERROR:", errorText);
                throw new Error(errorText);
            }
            const data = await response.json();
            setAnalysis(typeof data.analysis === "string"
                ? data.analysis
                : JSON.stringify(data.analysis, null, 2));
        }
        catch (error) {
            console.error(error);
            setAnalysis("Could not generate AI analysis.");
        }
        finally {
            setLoading(false);
        }
    };
    const generateFollowUp = async () => {
        try {
            setFollowLoading(true);
            setFollowCopied(false);
            const { data: { session }, } = await supabase.auth.getSession();
            const response = await fetch(`/api/leads/${lead.id}/follow-up-ai`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("FOLLOW UP AI ERROR:", errorText);
                throw new Error(errorText);
            }
            const data = await response.json();
            setFollowUp(data);
        }
        catch (error) {
            console.error(error);
        }
        finally {
            setFollowLoading(false);
        }
    };
    const copyFollowUp = async () => {
        if (!followUp)
            return;
        await navigator.clipboard.writeText(`${followUp.subject}\n\n${followUp.email}`);
        setFollowCopied(true);
        window.setTimeout(() => {
            setFollowCopied(false);
        }, 2000);
    };
    return (<section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400">
            {"AI Insights"}
          </p>

          <h2 className="mt-2 text-xl font-bold text-foreground">
            {"Deal Analysis"}
          </h2>

          <p className="mt-2 text-sm text-foreground/70">
            {"Get AI-powered recommendations for this opportunity."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void generateAnalysis()} disabled={loading} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50">
            {loading ? ("Analyzing...") : ("Analyze")}
          </button>

          <button type="button" onClick={() => void generateFollowUp()} disabled={followLoading} className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-50">
            {followLoading ? ("Writing...") : ("Generate Follow-up")}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border-subtle bg-surface-2/60 p-4">
        {analysis ? (<p className="whitespace-pre-line text-sm leading-7 text-foreground/80">
            {analysis}
          </p>) : (<p className="text-sm text-foreground/50">
            {"No AI analysis generated yet."}
          </p>)}
      </div>

      {followUp && (<div className="mt-5 space-y-4 rounded-xl border border-purple-500/20 bg-surface-2/60 p-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-purple-300">
              {"Follow-up draft"}
            </p>
            <h3 className="mt-2 text-base font-semibold text-foreground">
              {followUp.subject}
            </h3>
          </div>

          <div className="space-y-3 text-sm text-foreground/80">
            <p>
              <span className="font-semibold text-foreground">{"Reason:"}</span>{" "}
              {followUp.reason}
            </p>
            <p>
              <span className="font-semibold text-foreground">{"Next action:"}</span>{" "}
              {followUp.next_action}
            </p>
          </div>

          <textarea readOnly value={followUp.email} className="h-48 w-full rounded-xl border border-border-subtle bg-surface-1 p-4 text-sm leading-7 text-foreground"/>

          <button type="button" onClick={() => void copyFollowUp()} className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20">
            {followCopied ? ("Copied") : ("Copy Follow-up")}
          </button>
        </div>)}
    </section>);
}
