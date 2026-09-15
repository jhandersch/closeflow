"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Building2,
    Compass,
    Sparkles,
    Users,
    Check,
} from "lucide-react";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
import { loadDemoData } from "@/lib/demoData";

type QuickStartMode = "lead" | "demo";
type Plan = "free" | "pro" | "business";

const ONBOARDING_DRAFT_KEY = "closeflow-onboarding-draft-v1";

const sanitizeNextPath = (nextPath: string | null) => {
    if (!nextPath) return null;
    if (!nextPath.startsWith("/")) return null;
    if (nextPath.startsWith("//")) return null;
    return nextPath;
};

const getRecommendedPlan = (teamSize: string): Plan => {
    const size = Number(teamSize);

    if (!Number.isInteger(size) || size <= 1) {
        return "free";
    }

    if (size <= 5) {
        return "pro";
    }

    return "business";
};

const planDetails: Record<
    Plan,
    {
        name: string;
        price: string;
        seats: string;
        description: string;
    }
> = {
    free: {
        name: "Free",
        price: "€0/month",
        seats: "1 team member",
        description: "For individuals getting started with CloseFlow.",
    },
    pro: {
        name: "Pro",
        price: "€49/month",
        seats: "Up to 5 team members",
        description: "For growing sales teams that need more capacity.",
    },
    business: {
        name: "Business",
        price: "€149/month",
        seats: "Up to 20 team members",
        description: "For larger teams with maximum CRM capacity.",
    },
};

export default function OnboardingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useAppPreferences();

    const nextPath = sanitizeNextPath(searchParams.get("next"));

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [quickStartMode, setQuickStartMode] =
        useState<QuickStartMode>("lead");

    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [teamSize, setTeamSize] = useState("");

    const [selectedPlan, setSelectedPlan] =
        useState<Plan>("free");

    const [leadName, setLeadName] = useState("");
    const [leadCompany, setLeadCompany] = useState("");
    const [leadValue, setLeadValue] = useState("");
    const [leadStatus, setLeadStatus] = useState("new");

    const steps = useMemo(
        () => [
            {
                id: 1,
                title: t("onboarding.stepWelcome", "Welcome"),
            },
            {
                id: 2,
                title: t(
                    "onboarding.stepCompany",
                    "Company & team",
                ),
            },
            {
                id: 3,
                title: t(
                    "onboarding.stepPlan",
                    "Choose your plan",
                ),
            },
            {
                id: 4,
                title: t(
                    "onboarding.stepLead",
                    "Quick start",
                ),
            },
            {
                id: 5,
                title: t(
                    "onboarding.stepDashboard",
                    "Understand dashboard",
                ),
            },
        ],
        [t],
    );

    const recommendedPlan = useMemo(
        () => getRecommendedPlan(teamSize),
        [teamSize],
    );

    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                const loginTarget = nextPath
                    ? `/login?next=${encodeURIComponent(nextPath)}`
                    : "/login";

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
    }, [nextPath, router]);

    useEffect(() => {
        if (loading) return;

        try {
            const saved = localStorage.getItem(
                ONBOARDING_DRAFT_KEY,
            );

            if (!saved) return;

            const draft = JSON.parse(saved) as {
                step?: number;
                quickStartMode?: QuickStartMode;
                companyName?: string;
                industry?: string;
                teamSize?: string;
                selectedPlan?: Plan;
                leadName?: string;
                leadCompany?: string;
                leadValue?: string;
                leadStatus?: string;
            };

            setStep(
                typeof draft.step === "number"
                    ? Math.min(
                          Math.max(
                              draft.step,
                              0,
                          ),
                          4,
                      )
                    : 0,
            );

            setQuickStartMode(
                draft.quickStartMode === "demo"
                    ? "demo"
                    : "lead",
            );

            setCompanyName(
                draft.companyName || "",
            );

            setIndustry(
                draft.industry || "",
            );

            setTeamSize(
                draft.teamSize || "",
            );

            setSelectedPlan(
                draft.selectedPlan === "pro" ||
                    draft.selectedPlan === "business"
                    ? draft.selectedPlan
                    : "free",
            );

            setLeadName(
                draft.leadName || "",
            );

            setLeadCompany(
                draft.leadCompany || "",
            );

            setLeadValue(
                draft.leadValue || "",
            );

            setLeadStatus(
                draft.leadStatus || "new",
            );
        } catch {
            localStorage.removeItem(
                ONBOARDING_DRAFT_KEY,
            );
        }
    }, [loading]);

    useEffect(() => {
        if (loading) return;

        const payload = {
            step,
            quickStartMode,
            companyName,
            industry,
            teamSize,
            selectedPlan,
            leadName,
            leadCompany,
            leadValue,
            leadStatus,
        };

        localStorage.setItem(
            ONBOARDING_DRAFT_KEY,
            JSON.stringify(payload),
        );
    }, [
        companyName,
        industry,
        leadCompany,
        leadName,
        leadStatus,
        leadValue,
        loading,
        quickStartMode,
        selectedPlan,
        step,
        teamSize,
    ]);

    useEffect(() => {
        if (!teamSize.trim()) {
            setSelectedPlan("free");
            return;
        }

        setSelectedPlan((current) => {
            if (current !== "free") {
                return current;
            }

            return recommendedPlan;
        });
    }, [recommendedPlan, teamSize]);

    const progress = useMemo(
        () =>
            ((step + 1) /
                steps.length) *
            100,
        [step, steps.length],
    );

    const canContinue = useMemo(() => {
        if (step === 1) {
            const parsedTeamSize =
                Number(teamSize);

            return (
                companyName.trim()
                    .length >= 2 &&
                Number.isInteger(
                    parsedTeamSize,
                ) &&
                parsedTeamSize >= 1 &&
                parsedTeamSize <= 20
            );
        }

        if (step === 2) {
            const parsedTeamSize =
                Number(teamSize);

            if (
                !Number.isInteger(
                    parsedTeamSize,
                ) ||
                parsedTeamSize < 1 ||
                parsedTeamSize > 20
            ) {
                return false;
            }

            if (
                parsedTeamSize === 1 &&
                selectedPlan !== "free"
            ) {
                return false;
            }

            if (
                parsedTeamSize >= 2 &&
                parsedTeamSize <= 5 &&
                selectedPlan === "free"
            ) {
                return false;
            }

            if (
                parsedTeamSize >= 6 &&
                selectedPlan !== "business"
            ) {
                return false;
            }
        }

        if (
            step === 3 &&
            quickStartMode === "lead"
        ) {
            if (
                !leadName.trim() ||
                !leadCompany.trim()
            ) {
                return false;
            }

            if (
                leadValue.trim() &&
                Number.isNaN(
                    Number(leadValue),
                )
            ) {
                return false;
            }
        }

        return true;
    }, [
        companyName,
        leadCompany,
        leadName,
        leadValue,
        quickStartMode,
        selectedPlan,
        step,
        teamSize,
    ]);

    const startCheckout = async (
        plan: "pro" | "business",
    ) => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error(
                "No active session found.",
            );
        }

        const response = await fetch(
            "/api/stripe/create-checkout",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    plan,
                }),
            },
        );

        const result =
            (await response
                .json()
                .catch(() => null)) as {
                checkoutUrl?: string | null;
                error?: string;
                message?: string;
            } | null;

        if (!response.ok) {
            throw new Error(
                result?.error ||
                    result?.message ||
                    "Could not start checkout.",
            );
        }

        if (!result?.checkoutUrl) {
            throw new Error(
                "Stripe checkout is not configured.",
            );
        }

        window.location.href =
            result.checkoutUrl;
    };

    const handleFinish = async () => {
        setSaving(true);
        setError(null);

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "You need to be signed in to complete onboarding.",
                );
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error(
                    "No active session found.",
                );
            }

            const response = await fetch(
                "/api/onboarding",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        companyName:
                            companyName.trim(),
                        industry:
                            industry.trim(),
                        teamSize:
                            teamSize.trim(),
                        quickStartMode,
                        leadName:
                            leadName.trim(),
                        leadCompany:
                            leadCompany.trim(),
                        leadValue:
                            leadValue.trim(),
                        leadStatus,
                    }),
                },
            );

            const result =
                (await response
                    .json()
                    .catch(() => null)) as {
                    error?: string;
                } | null;

            if (!response.ok) {
                throw new Error(
                    result?.error ||
                        "Onboarding failed.",
                );
            }

            if (
                selectedPlan === "pro" ||
                selectedPlan === "business"
            ) {
                await startCheckout(
                    selectedPlan,
                );

                return;
            }

            localStorage.removeItem(
                ONBOARDING_DRAFT_KEY,
            );

            router.replace(
                nextPath || "/dashboard",
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while finishing onboarding.",
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
                <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-8">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-cyan-500/30" />

                    <div className="mt-6 space-y-3">
                        <div className="h-4 w-full animate-pulse rounded-full bg-foreground/10" />
                        <div className="h-4 w-5/6 animate-pulse rounded-full bg-foreground/10" />
                        <div className="h-4 w-4/6 animate-pulse rounded-full bg-foreground/10" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
                                {t(
                                    "onboarding.label",
                                    "Onboarding",
                                )}
                            </p>

                            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                                {t(
                                    "onboarding.welcomeTitle",
                                    "Welcome to CloseFlow",
                                )}
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/65 sm:text-base">
                                {t(
                                    "onboarding.welcomeBody",
                                    "Let's set up your CRM workspace and create your first momentum in just a few minutes.",
                                )}
                            </p>
                        </div>

                        <div className="w-full max-w-xs rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                            <div className="flex items-center justify-between text-sm text-foreground/65">
                                <span>
                                    {t(
                                        "onboarding.progress",
                                        "Progress",
                                    )}
                                </span>

                                <span>
                                    {Math.round(
                                        progress,
                                    )}
                                    %
                                </span>
                            </div>

                            <div className="mt-3 h-2 rounded-full bg-foreground/10">
                                <div
                                    className="h-2 rounded-full bg-cyan-400 transition-all"
                                    style={{
                                        width: `${progress}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-5">
                        {steps.map(
                            (
                                item,
                                index,
                            ) => {
                                const current =
                                    index ===
                                    step;
                                const done =
                                    index <
                                    step;

                                return (
                                    <div
                                        key={
                                            item.id
                                        }
                                        className={`rounded-2xl border px-4 py-3 text-sm ${
                                            done
                                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                                : current
                                                    ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                                                    : "border-border-subtle bg-surface-2/70 text-foreground/65"
                                        }`}
                                    >
                                        <p className="font-medium">
                                            {
                                                item.title
                                            }
                                        </p>
                                    </div>
                                );
                            },
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8">
                        {step === 0 && (
                            <div className="space-y-6">
                                <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                                    <Sparkles className="mt-1 h-5 w-5 text-cyan-300" />

                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            Welcome to CloseFlow
                                        </h2>

                                        <p className="mt-2 text-sm leading-7 text-foreground/80">
                                            We will set up your workspace, choose the right plan for your team, create your first lead, and then show you the dashboard.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5">
                                    <h3 className="text-lg font-semibold">
                                        What happens next
                                    </h3>

                                    <ul className="mt-4 space-y-3 text-sm text-foreground/65">
                                        <li>
                                            - Set up company and team context
                                        </li>
                                        <li>
                                            - Choose the right plan
                                        </li>
                                        <li>
                                            - Create your first lead or explore demo data
                                        </li>
                                        <li>
                                            - Understand the dashboard
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-2xl font-semibold">
                                        Set up company
                                    </h2>

                                    <p className="mt-2 text-sm leading-7 text-foreground/65">
                                        These details personalize your CRM.
                                    </p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="text-sm">
                                        <span className="mb-2 block">
                                            Company name
                                        </span>

                                        <input
                                            value={
                                                companyName
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setCompanyName(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Acme Labs"
                                            className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/50"
                                        />
                                    </label>

                                    <label className="text-sm">
                                        <span className="mb-2 block">
                                            Industry
                                        </span>

                                        <input
                                            value={
                                                industry
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setIndustry(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="SaaS"
                                            className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/50"
                                        />
                                    </label>
                                </div>

                                <label className="block text-sm">
                                    <span className="mb-2 block">
                                        Team size
                                    </span>

                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        step={1}
                                        value={
                                            teamSize
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setTeamSize(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="1-20"
                                        className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/50"
                                    />

                                    <p className="mt-2 text-xs text-foreground/50">
                                        Free: 1 · Pro: up to 5 · Business: up to 20
                                    </p>
                                </label>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-2xl font-semibold">
                                        Choose your plan
                                    </h2>

                                    <p className="mt-2 text-sm leading-7 text-foreground/65">
                                        We recommend a plan based on your team size. You can change your plan later in Billing.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm">
                                    <span className="font-semibold text-cyan-300">
                                        Recommended:
                                    </span>{" "}
                                    <span className="text-foreground/80">
                                        {
                                            planDetails[
                                                recommendedPlan
                                            ].name
                                        }
                                    </span>
                                </div>

                                <div className="grid gap-4">
                                    {(
                                        [
                                            "free",
                                            "pro",
                                            "business",
                                        ] as Plan[]
                                    ).map(
                                        (
                                            plan,
                                        ) => {
                                            const selected =
                                                selectedPlan ===
                                                plan;

                                            const disabled =
                                                plan ===
                                                    "free"
                                                    ? Number(
                                                          teamSize,
                                                      ) >
                                                      1
                                                    : plan ===
                                                        "pro"
                                                        ? Number(
                                                              teamSize,
                                                          ) >
                                                          5 ||
                                                          Number(
                                                              teamSize,
                                                          ) <
                                                              2
                                                        : Number(
                                                              teamSize,
                                                          ) >
                                                          20 ||
                                                          Number(
                                                              teamSize,
                                                          ) <
                                                              6;

                                            return (
                                                <button
                                                    key={
                                                        plan
                                                    }
                                                    type="button"
                                                    disabled={
                                                        disabled
                                                    }
                                                    onClick={() =>
                                                        setSelectedPlan(
                                                            plan,
                                                        )
                                                    }
                                                    className={`rounded-2xl border p-5 text-left transition ${
                                                        selected
                                                            ? "border-cyan-400/40 bg-cyan-500/10"
                                                            : "border-border-subtle bg-surface-2/60 hover:bg-surface-2"
                                                    } ${
                                                        disabled
                                                            ? "cursor-not-allowed opacity-35"
                                                            : ""
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-lg font-semibold">
                                                                    {
                                                                        planDetails[
                                                                            plan
                                                                        ].name
                                                                    }
                                                                </h3>

                                                                {recommendedPlan ===
                                                                    plan && (
                                                                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-300">
                                                                        Recommended
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="mt-1 text-sm text-foreground/60">
                                                                {
                                                                    planDetails[
                                                                        plan
                                                                    ].description
                                                                }
                                                            </p>
                                                        </div>

                                                        {selected && (
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-black">
                                                                <Check
                                                                    size={
                                                                        16
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 flex items-end justify-between gap-4">
                                                        <div>
                                                            <p className="text-xl font-bold">
                                                                {
                                                                    planDetails[
                                                                        plan
                                                                    ].price
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-xs text-foreground/50">
                                                                {
                                                                    planDetails[
                                                                        plan
                                                                    ].seats
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-2xl font-semibold">
                                        Quick start
                                    </h2>

                                    <p className="mt-2 text-sm leading-7 text-foreground/65">
                                        Choose the fastest path to your first CloseFlow moment.
                                    </p>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setQuickStartMode(
                                                "lead",
                                            )
                                        }
                                        className={`rounded-2xl border px-4 py-5 text-left ${
                                            quickStartMode ===
                                            "lead"
                                                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                                                : "border-border-subtle bg-surface-2 text-foreground/75"
                                        }`}
                                    >
                                        <p className="font-semibold">
                                            Create my first lead
                                        </p>

                                        <p className="mt-1 text-xs">
                                            Best path for a productive start.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setQuickStartMode(
                                                "demo",
                                            )
                                        }
                                        className={`rounded-2xl border px-4 py-5 text-left ${
                                            quickStartMode ===
                                            "demo"
                                                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                                                : "border-border-subtle bg-surface-2 text-foreground/75"
                                        }`}
                                    >
                                        <p className="font-semibold">
                                            Start with demo data
                                        </p>

                                        <p className="mt-1 text-xs">
                                            Instantly populated pipeline for exploration.
                                        </p>
                                    </button>
                                </div>

                                {quickStartMode ===
                                "lead" ? (
                                    <>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <label className="text-sm">
                                                <span className="mb-2 block">
                                                    Name
                                                </span>

                                                <input
                                                    value={
                                                        leadName
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setLeadName(
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    placeholder="Jordan Lee"
                                                    className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/50"
                                                />
                                            </label>

                                            <label className="text-sm">
                                                <span className="mb-2 block">
                                                    Company
                                                </span>

                                                <input
                                                    value={
                                                        leadCompany
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setLeadCompany(
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    placeholder="Northstar"
                                                    className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/50"
                                                />
                                            </label>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <label className="text-sm">
                                                <span className="mb-2 block">
                                                    Deal value
                                                </span>

                                                <input
                                                    type="number"
                                                    value={
                                                        leadValue
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setLeadValue(
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    placeholder="12000"
                                                    className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none focus:border-cyan-400/50"
                                                />
                                            </label>

                                            <label className="text-sm">
                                                <span className="mb-2 block">
                                                    Status
                                                </span>

                                                <select
                                                    value={
                                                        leadStatus
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setLeadStatus(
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none"
                                                >
                                                    <option value="new">
                                                        New
                                                    </option>
                                                    <option value="contacted">
                                                        Contacted
                                                    </option>
                                                    <option value="proposal">
                                                        Proposal
                                                    </option>
                                                    <option value="won">
                                                        Won
                                                    </option>
                                                </select>
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5 text-sm leading-7">
                                        Upon completion, realistic demo leads, activities, and tasks are loaded.
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-5">
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                                    <div className="flex items-start gap-3">
                                        <Building2 className="mt-1 h-5 w-5 text-emerald-300" />

                                        <div>
                                            <h2 className="text-xl font-semibold">
                                                Explore your dashboard
                                            </h2>

                                            <p className="mt-2 text-sm leading-7">
                                                Your workspace is ready.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5 text-sm text-foreground/65">
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-cyan-300" />

                                        <span>
                                            Company:{" "}
                                            {companyName ||
                                                "Not specified"}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3">
                                        <Compass className="h-5 w-5 text-cyan-300" />

                                        <span>
                                            Industry:{" "}
                                            {industry ||
                                                "Not specified"}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3">
                                        <Users className="h-5 w-5 text-cyan-300" />

                                        <span>
                                            Team size:{" "}
                                            {teamSize ||
                                                "Not specified"}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3">
                                        <Sparkles className="h-5 w-5 text-cyan-300" />

                                        <span>
                                            Plan:{" "}
                                            {
                                                planDetails[
                                                    selectedPlan
                                                ].name
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                {error}
                            </div>
                        )}

                        <div className="mt-8 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setStep(
                                        (current) =>
                                            Math.max(
                                                0,
                                                current -
                                                    1,
                                            ),
                                    )
                                }
                                disabled={step === 0 || saving}
                                className="rounded-2xl border border-border-subtle px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Back
                            </button>

                            {step <
                            steps.length -
                                1 ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setStep(
                                            (current) =>
                                                Math.min(
                                                    steps.length -
                                                        1,
                                                    current +
                                                        1,
                                                ),
                                        )
                                    }
                                    disabled={
                                        !canContinue ||
                                        saving
                                    }
                                    className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        void handleFinish()
                                    }
                                    disabled={
                                        saving
                                    }
                                    className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                                >
                                    {saving
                                        ? "Finishing..."
                                        : selectedPlan ===
                                            "free"
                                            ? "Finish onboarding"
                                            : `Continue to ${planDetails[selectedPlan].name} checkout`}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
                            <h3 className="text-lg font-semibold">
                                Why onboarding helps
                            </h3>

                            <p className="mt-3 text-sm leading-7 text-foreground/65">
                                A quick setup makes your new CRM immediately useful and helps us recommend the right plan.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
                            <h3 className="text-lg font-semibold">
                                Your plan
                            </h3>

                            <p className="mt-3 text-sm leading-7 text-foreground/65">
                                {planDetails[
                                    selectedPlan
                                ].name}
                                {" · "}
                                {planDetails[
                                    selectedPlan
                                ].seats}
                            </p>

                            <p className="mt-2 text-sm font-semibold text-foreground">
                                {
                                    planDetails[
                                        selectedPlan
                                    ].price
                                }
                            </p>
                        </div>

                        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
                            <h3 className="text-lg font-semibold">
                                Try demo data
                            </h3>

                            <p className="mt-3 text-sm leading-7 text-foreground/65">
                                Load realistic sample data directly.
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    void loadDemoData()
                                        .then(() => {
                                            router.replace(
                                                nextPath ||
                                                    "/dashboard",
                                            );
                                        })
                                        .catch(
                                            (
                                                err,
                                            ) => {
                                                setError(
                                                    err instanceof
                                                        Error
                                                        ? err.message
                                                        : "Demo data could not be loaded",
                                                );
                                            },
                                        );
                                }}
                                className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
                            >
                                Load demo data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
