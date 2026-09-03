"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
type FeedbackItem = {
    id: string;
    rating: number;
    comment?: string;
    contact_name?: string;
    contact_email?: string;
    submitted_at: string;
};
const npsCategory = (rating: number) => {
    if (rating >= 9)
        return { label: "Promoter", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25" };
    if (rating >= 7)
        return { label: "Passive", color: "text-amber-300 bg-amber-500/10 border-amber-500/25" };
    return { label: "Detractor", color: "text-rose-300 bg-rose-500/10 border-rose-500/25" };
};
const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0)
        return "today";
    if (d === 1)
        return "yesterday";
    return `${d}d ago`;
};
export default function FeedbackInboxPage() {
    const { language } = useAppPreferences();
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token)
                headers.Authorization = `Bearer ${session.access_token}`;
            const response = await fetch("/api/feedback", { headers });
            if (response.ok) {
                const data = (await response.json()) as {
                    items: FeedbackItem[];
                    workspace_id: string | null;
                };
                setItems(Array.isArray(data.items) ? data.items : []);
                setWorkspaceId(data.workspace_id || null);
            }
            setLoading(false);
        };
        void load();
    }, []);
    const avgRating = items.length > 0
        ? Math.round((items.reduce((s, i) => s + i.rating, 0) / items.length) * 10) / 10
        : null;
    const npsScore = items.length > 0
        ? Math.round(((items.filter((i) => i.rating >= 9).length - items.filter((i) => i.rating <= 6).length) / items.length) * 100)
        : null;
    const feedbackUrl = workspaceId
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/feedback/${workspaceId}`
        : null;
    return (<AuthGuard>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{"Feedback"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{"Customer Feedback Inbox"}</h1>
          <p className="mt-1 text-sm text-foreground/60">{"Collect and review feedback from your customers."}</p>
        </div>

        {/* Share link */}
        {feedbackUrl ? (<div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">{"Your feedback link"}</p>
            <p className="mt-1 break-all text-sm font-mono text-foreground/85">{feedbackUrl}</p>
            <button onClick={() => void navigator.clipboard.writeText(feedbackUrl)} className="mt-2 rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/15">
              {"Copy link"}
            </button>
          </div>) : null}

        {/* KPIs */}
        {items.length > 0 ? (<div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
              <p className="text-xs text-foreground/55">{"Total responses"}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
              <p className="text-xs text-foreground/55">{"Avg rating"}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{avgRating}/10</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
              <p className="text-xs text-foreground/55">NPS Score</p>
              <p className={`mt-2 text-2xl font-bold ${npsScore !== null && npsScore >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {npsScore !== null ? (npsScore >= 0 ? `+${npsScore}` : String(npsScore)) : "—"}
              </p>
            </div>
          </div>) : null}

        {loading ? <p className="text-sm text-foreground/60">{"Loading feedback..."}</p> : null}

        {!loading && items.length === 0 ? (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center text-sm text-foreground/50">
            {"No feedback received yet. Share your feedback link with customers to get started."}
          </div>) : null}

        <div className="space-y-3">
          {items.map((item) => {
            const cat = npsCategory(item.rating);
            return (<div key={item.id} className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-xl font-bold text-foreground">
                      {item.rating}
                    </div>
                    <div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${cat.color}`}>
                        {cat.label}
                      </span>
                      {item.contact_name ? (<p className="mt-1 text-sm font-medium text-foreground">{item.contact_name}</p>) : null}
                      {item.contact_email ? (<p className="text-xs text-foreground/50">{item.contact_email}</p>) : null}
                    </div>
                  </div>
                  <span className="text-xs text-foreground/45">{relativeTime(item.submitted_at)}</span>
                </div>
                {item.comment ? (<p className="mt-3 text-sm leading-7 text-foreground/75">{item.comment}</p>) : null}
              </div>);
        })}
        </div>
      </div>
    </AuthGuard>);
}
