"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    Building2,
    Check,
    CircleDollarSign,
    KanbanSquare,
    Sparkles,
    Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type QuickStartMode = "lead" | "demo";
type OnboardingDraft = {
    step?: number;
    quickStartMode?: QuickStartMode;
    companyName?: string;
    industry?: string;
    teamSize?: string;
    leadName?: string;
    leadCompany?: string;
    leadValue?: string;
    leadStatus?: string;
};

const ONBOARDING_DRAFT_KEY = "closeflow-onboarding-draft-v1";
const steps = ["Workspace", "Quick start"];

const sanitizeNextPath = (nextPath: string | null) => {
    if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) return null;
    return nextPath;
};

export default function OnboardingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = sanitizeNextPath(searchParams.get("next"));

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [draftReady, setDraftReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quickStartMode, setQuickStartMode] = useState<QuickStartMode>("lead");
    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [leadName, setLeadName] = useState("");
    const [leadCompany, setLeadCompany] = useState("");
    const [leadValue, setLeadValue] = useState("");
    const [leadStatus, setLeadStatus] = useState("new");

    useEffect(() => {
        let active = true;
        const checkUser = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (!active) return;
            if (authError || !user) {
                const loginTarget = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
                router.replace(loginTarget);
                return;
            }
            if (user.user_metadata?.onboarding_completed) {
                router.replace(nextPath || "/dashboard");
                return;
            }
            setLoading(false);
        };
        void checkUser();
        return () => { active = false; };
    }, [nextPath, router]);

    useEffect(() => {
        if (loading) return;
        let active = true;
        const restoreDraft = () => {
            if (!active) return;
            try {
                const saved = localStorage.getItem(ONBOARDING_DRAFT_KEY);
                if (saved) {
                    const draft = JSON.parse(saved) as OnboardingDraft;
                    setStep(typeof draft.step === "number" && draft.step > 0 ? 1 : 0);
                    setQuickStartMode(draft.quickStartMode === "demo" ? "demo" : "lead");
                    setCompanyName(draft.companyName || "");
                    setIndustry(draft.industry || "");
                    setTeamSize(draft.teamSize || "");
                    setLeadName(draft.leadName || "");
                    setLeadCompany(draft.leadCompany || "");
                    setLeadValue(draft.leadValue || "");
                    setLeadStatus(draft.leadStatus || "new");
                }
            } catch {
                try { localStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch { /* Storage may be unavailable. */ }
            } finally {
                if (active) setDraftReady(true);
            }
        };
        queueMicrotask(restoreDraft);
        return () => { active = false; };
    }, [loading]);

    useEffect(() => {
        if (loading || !draftReady) return;
        try {
            localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({
                step, quickStartMode, companyName, industry, teamSize,
                leadName, leadCompany, leadValue, leadStatus,
            } satisfies OnboardingDraft));
        } catch { /* The onboarding flow remains usable if storage is disabled. */ }
    }, [companyName, draftReady, industry, leadCompany, leadName, leadStatus, leadValue, loading, quickStartMode, step, teamSize]);

    const validWorkspace = companyName.trim().length >= 2
        && Number.isInteger(Number(teamSize))
        && Number(teamSize) >= 1
        && Number(teamSize) <= 20;
    const validLead = quickStartMode === "demo" || (
        Boolean(leadName.trim())
        && Boolean(leadCompany.trim())
        && (!leadValue.trim() || (Number.isFinite(Number(leadValue)) && Number(leadValue) >= 0))
    );
    const canContinue = step === 0 ? validWorkspace : validLead;
    const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

    const handleFinish = async () => {
        setSaving(true);
        setError(null);
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session?.access_token) throw new Error("Please sign in again to finish setting up your workspace.");

            const response = await fetch("/api/onboarding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    companyName: companyName.trim(),
                    industry: industry.trim(),
                    teamSize: teamSize.trim(),
                    quickStartMode,
                    leadName: leadName.trim(),
                    leadCompany: leadCompany.trim(),
                    leadValue: leadValue.trim(),
                    leadStatus,
                }),
            });
            const result = await response.json().catch(() => null) as { error?: string } | null;
            if (!response.ok) throw new Error(result?.error || "We couldn't finish setting up your workspace.");

            const { error: metadataError } = await supabase.auth.updateUser({
                data: { onboarding_completed: true, onboarding_completed_at: new Date().toISOString() },
            });
            if (metadataError) throw metadataError;
            try { localStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch { /* Ignore unavailable storage. */ }
            router.replace(nextPath || "/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong while finishing setup.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !draftReady) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
                <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-8" aria-label="Loading onboarding">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-cyan-500/30" />
                    <div className="mt-6 space-y-3">
                        <div className="h-4 w-full animate-pulse rounded-full bg-foreground/10" />
                        <div className="h-4 w-5/6 animate-pulse rounded-full bg-foreground/10" />
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <header className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">CloseFlow setup</p>
                            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Make your workspace yours</h1>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/65 sm:text-base">
                                A couple of details, then choose whether to add your first lead or explore a ready-made workspace.
                            </p>
                        </div>
                        <div className="w-full md:max-w-xs" aria-label={`Step ${step + 1} of ${steps.length}`}>
                            <div className="flex justify-between text-sm text-foreground/65">
                                <span>{steps[step]}</span><span>Step {step + 1} of {steps.length}</span>
                            </div>
                            <div className="mt-3 h-2 rounded-full bg-foreground/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                                <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="mt-3 flex gap-2" aria-hidden="true">
                                {steps.map((item, index) => <span key={item} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-cyan-400" : "bg-foreground/10"}`} />)}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
                    <section className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8" aria-labelledby="step-title">
                        {step === 0 ? (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300"><Building2 className="h-5 w-5" /></div>
                                    <h2 id="step-title" className="mt-4 text-2xl font-semibold">Your workspace</h2>
                                    <p className="mt-2 text-sm leading-6 text-foreground/65">These details help organize your CRM. You can update them later in Settings.</p>
                                </div>
                                <label className="block text-sm">
                                    <span className="mb-2 block font-medium">Company or workspace name <span className="text-cyan-300">*</span></span>
                                    <input autoFocus value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={80} autoComplete="organization" placeholder="e.g. Northstar Studio" className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none transition focus:border-cyan-400/60" />
                                </label>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block text-sm">
                                        <span className="mb-2 block font-medium">Industry <span className="text-foreground/40">(optional)</span></span>
                                        <select value={industry} onChange={(event) => setIndustry(event.target.value)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/60">
                                            <option value="">Choose an industry</option>
                                            <option value="Technology">Technology</option><option value="Consulting">Consulting</option><option value="Marketing">Marketing</option><option value="Finance">Finance</option><option value="Real estate">Real estate</option><option value="Healthcare">Healthcare</option><option value="Education">Education</option><option value="Other">Other</option>
                                        </select>
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-2 block font-medium">Team size</span>
                                        <select value={teamSize} onChange={(event) => setTeamSize(event.target.value)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/60">
                                            <option value="">Select team size</option><option value="1">Just me</option><option value="2">2 people</option><option value="3">3 people</option><option value="4">4 people</option><option value="5">5 people</option><option value="6">6–10 people</option><option value="20">11–20 people</option>
                                        </select>
                                        <span className="mt-2 block text-xs leading-5 text-foreground/50">This is workspace context. It does not select or change your subscription.</span>
                                    </label>
                                </div>
                                <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4 text-sm leading-6 text-foreground/65">
                                    Your workspace starts on Free: one team member, up to 50 active leads, 10 AI requests and 5 exports per month. You can compare plans any time.
                                    <Link href="/pricing" className="ml-1 font-medium text-cyan-300 underline decoration-cyan-300/30 underline-offset-4 hover:text-cyan-200">Compare plans</Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300"><Sparkles className="h-5 w-5" /></div>
                                    <h2 id="step-title" className="mt-4 text-2xl font-semibold">How would you like to start?</h2>
                                    <p className="mt-2 text-sm leading-6 text-foreground/65">Choose a useful first step. You can change everything once you are inside CloseFlow.</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <button type="button" aria-pressed={quickStartMode === "lead"} onClick={() => setQuickStartMode("lead")} className={`rounded-2xl border p-5 text-left transition ${quickStartMode === "lead" ? "border-cyan-400/50 bg-cyan-500/10" : "border-border-subtle bg-surface-2 hover:border-foreground/20"}`}>
                                        <div className="flex items-center justify-between"><Users className="h-5 w-5 text-cyan-300" />{quickStartMode === "lead" && <Check className="h-4 w-4 text-cyan-300" />}</div>
                                        <p className="mt-4 font-semibold">Add my first lead</p><p className="mt-1 text-xs leading-5 text-foreground/60">Start with a real opportunity in your pipeline.</p>
                                    </button>
                                    <button type="button" aria-pressed={quickStartMode === "demo"} onClick={() => setQuickStartMode("demo")} className={`rounded-2xl border p-5 text-left transition ${quickStartMode === "demo" ? "border-cyan-400/50 bg-cyan-500/10" : "border-border-subtle bg-surface-2 hover:border-foreground/20"}`}>
                                        <div className="flex items-center justify-between"><KanbanSquare className="h-5 w-5 text-cyan-300" />{quickStartMode === "demo" && <Check className="h-4 w-4 text-cyan-300" />}</div>
                                        <p className="mt-4 font-semibold">Explore demo data</p><p className="mt-1 text-xs leading-5 text-foreground/60">See an example pipeline, tasks and activities.</p>
                                    </button>
                                </div>
                                {quickStartMode === "lead" ? (
                                    <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface-2/60 p-5">
                                        <div><h3 className="font-medium">First lead details</h3><p className="mt-1 text-xs text-foreground/55">You can add more details and activities later.</p></div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="text-sm"><span className="mb-2 block">Contact name <span className="text-cyan-300">*</span></span><input autoFocus value={leadName} onChange={(event) => setLeadName(event.target.value)} maxLength={120} autoComplete="name" placeholder="Jordan Lee" className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/60" /></label>
                                            <label className="text-sm"><span className="mb-2 block">Company <span className="text-cyan-300">*</span></span><input value={leadCompany} onChange={(event) => setLeadCompany(event.target.value)} maxLength={120} autoComplete="organization" placeholder="Northstar" className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/60" /></label>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="text-sm"><span className="mb-2 block">Estimated deal value <span className="text-foreground/40">(optional)</span></span><input type="number" min="0" step="0.01" inputMode="decimal" value={leadValue} onChange={(event) => setLeadValue(event.target.value)} placeholder="12000" className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/60" /></label>
                                            <label className="text-sm"><span className="mb-2 block">Pipeline stage</span><select value={leadStatus} onChange={(event) => setLeadStatus(event.target.value)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/60"><option value="new">New</option><option value="contacted">Contacted</option><option value="proposal">Proposal</option><option value="won">Won</option></select></label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5 text-sm leading-6 text-foreground/75">We will add sample leads, activities and tasks to this new workspace so you can explore the dashboard right away.</div>
                                )}
                            </div>
                        )}

                        {error && <div role="alert" className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
                        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
                            <button type="button" onClick={() => { setError(null); setStep(0); }} disabled={step === 0 || saving} className="rounded-2xl border border-border-subtle px-4 py-2.5 text-sm font-medium transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40">Back</button>
                            {step === 0 ? (
                                <button type="button" onClick={() => { setError(null); setStep(1); }} disabled={!canContinue || saving} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45">Continue <ArrowRight className="h-4 w-4" /></button>
                            ) : (
                                <button type="button" onClick={() => void handleFinish()} disabled={!canContinue || saving} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Setting up…" : "Create my workspace"}{!saving && <ArrowRight className="h-4 w-4" />}</button>
                            )}
                        </div>
                        <p className="mt-3 text-right text-xs text-foreground/45">Your progress is saved on this device.</p>
                    </section>

                    <aside className="space-y-4">
                        <section className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Included in CloseFlow</p>
                            <h2 className="mt-2 text-lg font-semibold">A clear view of every opportunity</h2>
                            <ul className="mt-5 space-y-4 text-sm text-foreground/70">
                                <li className="flex gap-3"><KanbanSquare className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span><strong className="text-foreground">Leads and pipeline</strong><br />Keep contacts, deal stages and customers together.</span></li>
                                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span><strong className="text-foreground">Tasks and activities</strong><br />Track follow-ups and keep your next action visible.</span></li>
                                <li className="flex gap-3"><BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span><strong className="text-foreground">Analytics and forecasts</strong><br />Understand pipeline progress and expected revenue.</span></li>
                                <li className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span><strong className="text-foreground">AI deal insights</strong><br />Get help prioritizing opportunities and next steps.</span></li>
                            </ul>
                        </section>
                        <section className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
                            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300"><CircleDollarSign className="h-5 w-5" /></div><div><h2 className="font-semibold">Start free</h2><p className="text-sm text-foreground/55">No payment details needed</p></div></div>
                            <p className="mt-4 text-sm leading-6 text-foreground/65">Free includes one member, 50 active leads, 10 AI requests and 5 exports each month.</p>
                            <Link href="/pricing" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:text-cyan-200">View all plans <ArrowRight className="h-4 w-4" /></Link>
                        </section>
                    </aside>
                </div>
                <footer className="mx-auto mt-6 max-w-6xl text-center text-xs text-foreground/40">Already started? Your setup draft stays on this device until you finish.</footer>
            </div>
        </main>
    );
}
