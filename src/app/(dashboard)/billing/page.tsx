"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";


type BillingState = {
    workspace_id: string | null;
    plan: string;
    status: string;
    current_period_end: string | null;
    stripe_subscription_id: string | null;
};

type Plan = "free" | "pro" | "business";

const plans: Array<{
    id: Plan;
    name: string;
    price: string;
    description: string;
    features: string[];
}> = [
    {
        id: "free",
        name: "Free",
        price: "€0",
        description: "Get started with the core CloseFlow CRM.",
        features: [
            "50 leads",
            "10 AI analyses",
            "Basic forecasting",
        ],
    },
    {
        id: "pro",
        name: "Pro",
        price: "€49",
        description: "For growing sales teams.",
        features: [
            "Expanded lead capacity",
            "Advanced AI insights",
            "Advanced forecasting",
        ],
    },
    {
        id: "business",
        name: "Business",
        price: "€149",
        description: "For teams that need the full CloseFlow experience.",
        features: [
            "Full CRM capabilities",
            "Maximum AI capabilities",
            "Advanced forecasting and analytics",
        ],
    },
];

export default function BillingPage() {
    const [billing, setBilling] = useState<BillingState | null>(null);
    const [billingLoading, setBillingLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<
        Plan | "portal" | null
    >(null);

    const {
    loading: permissionsLoading,
    role,
    workspaceId,
} = usePermissions();

const {
    activeWorkspaceId,
} = useActiveWorkspace(
    workspaceId ? [workspaceId] : [],
);

const canManageBilling =
    !permissionsLoading &&
    role === "owner" &&
    (!activeWorkspaceId ||
        activeWorkspaceId === workspaceId);

    const loadBilling = useCallback(async () => {
        setBillingLoading(true);

        try {
            const activeWorkspaceId =
    window.localStorage.getItem(
        "closeflow_active_workspace",
    );

const headers: HeadersInit = {};

if (activeWorkspaceId) {
    headers[
        "x-closeflow-workspace-id"
    ] = activeWorkspaceId;
}

const response = await fetch(
    "/api/billing",
    {
        cache: "no-store",
        headers,
    },
);

            if (!response.ok) {
                setBilling(null);
                return;
            }

            const data = (await response.json()) as BillingState;
            setBilling(data);
        } catch {
            setBilling(null);
        } finally {
            setBillingLoading(false);
        }
    }, []);

    useEffect(() => {
    if (permissionsLoading) {
        return;
    }

    if (!canManageBilling) {
        setBilling(null);
        setBillingLoading(false);
        return;
    }

    void loadBilling();

    const handleWorkspaceChange = () => {
        void loadBilling();
    };

    window.addEventListener(
        "closeflow-workspace-changed",
        handleWorkspaceChange,
    );

    return () => {
        window.removeEventListener(
            "closeflow-workspace-changed",
            handleWorkspaceChange,
        );
    };
}, [
    permissionsLoading,
    canManageBilling,
    loadBilling,
]);

    const startCheckout = async (
            plan: "pro" | "business",
        ) => {
            if (!canManageBilling) {
                toast.error(
                    "Only the workspace owner can manage billing.",
                );
                return;
            }

            setActionLoading(plan);

            try {
                const activeWorkspaceId =
                    window.localStorage.getItem(
                        "closeflow_active_workspace",
                    );

                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                };

                if (activeWorkspaceId) {
                    headers[
                        "x-closeflow-workspace-id"
                    ] = activeWorkspaceId;
                }

                const response = await fetch(
                    "/api/stripe/create-checkout",
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ plan }),
                    },
                );

                const data = (await response.json()) as {
                    checkoutUrl?: string | null;
                    message?: string;
                    error?: string;
                };

                if (!response.ok) {
                    const message =
                        data.error ||
                        data.message ||
                        "Could not start checkout";

                    if (
                        message
                            .toLowerCase()
                            .includes(
                                "two-factor authentication required",
                            )
                    ) {
                        toast.error(
                            "2FA required before plan upgrades. Open Settings → Security.",
                        );
                    } else {
                        toast.error(message);
                    }

                    return;
                }

                if (!data.checkoutUrl) {
                    toast.error(
                        data.message ||
                            "Stripe checkout is not configured.",
                    );
                    return;
                }

                window.location.href =
                    data.checkoutUrl;
            } catch {
                toast.error(
                    "Could not start checkout.",
                );
            } finally {
                setActionLoading(null);
            }
        };

        const changePlan = async (
            plan: "free" | "pro" | "business",
        ) => {
            if (!canManageBilling) {
                toast.error(
                    "Only the workspace owner can manage billing.",
                );
                return;
            }

            setActionLoading(plan);

            try {
                const activeWorkspaceId =
                    window.localStorage.getItem(
                        "closeflow_active_workspace",
                    );

                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                };

                if (activeWorkspaceId) {
                    headers[
                        "x-closeflow-workspace-id"
                    ] = activeWorkspaceId;
                }

                const response = await fetch(
                    "/api/stripe/change-plan",
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ plan }),
                    },
                );

                const data = (await response.json()) as {
                    success?: boolean;
                    error?: string;
                };

                if (!response.ok) {
                    const message =
                        data.error ||
                        "Could not change subscription plan.";

                    if (
                        message
                            .toLowerCase()
                            .includes(
                                "two-factor authentication required",
                            )
                    ) {
                        toast.error(
                            "2FA required before plan changes. Open Settings → Security.",
                        );
                    } else {
                        toast.error(message);
                    }

                    return;
                }

                toast.success(
                    `Plan changed to ${
                        plan === "pro"
                            ? "Pro"
                            : plan === "business"
                            ? "Business"
                            : "Free"
                    }.`,
                );

                await loadBilling();
            } catch {
                toast.error(
                    "Could not change subscription plan.",
                );
            } finally {
                setActionLoading(null);
            }
        };

    const openPortal = async () => {
        if (!canManageBilling) {
            toast.error(
                "Only the workspace owner can manage billing.",
            );
            return;
        }

        setActionLoading("portal");

        try {
            const activeWorkspaceId =
                window.localStorage.getItem(
                    "closeflow_active_workspace",
                );

            const headers: HeadersInit = {};

            if (activeWorkspaceId) {
                headers[
                    "x-closeflow-workspace-id"
                ] = activeWorkspaceId;
            }

            const response = await fetch(
                "/api/stripe/create-portal",
                {
                    method: "POST",
                    headers,
                },
            );

            const data = (await response.json()) as {
                portalUrl?: string | null;
                error?: string;
            };

            if (!response.ok) {
                const message =
                    data.error ||
                    "Could not open billing portal.";

                if (
                    message
                        .toLowerCase()
                        .includes(
                            "two-factor authentication required",
                        )
                ) {
                    toast.error(
                        "2FA required before billing changes. Open Settings → Security.",
                    );
                } else {
                    toast.error(message);
                }

                return;
            }

            if (!data.portalUrl) {
                toast.error(
                    "Stripe billing portal is not configured.",
                );
                return;
            }

            window.location.href =
                data.portalUrl;
        } catch {
            toast.error(
                "Could not open billing portal.",
            );
        } finally {
            setActionLoading(null);
        }
    };

    const currentPlan =
        billingLoading || !billing
            ? null
            : ((billing.plan || "free").toLowerCase() as Plan);

    return (
        <AuthGuard>
            {permissionsLoading ? (
                <div className="mx-auto max-w-5xl">
                    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-8">
                        <p className="text-sm text-foreground/60">
                            Checking billing permissions...
                        </p>
                    </section>
                </div>
            ) : !canManageBilling ? (
                <div className="mx-auto max-w-5xl">
                    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-8">
                        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
                            Billing
                        </p>

                        <h1 className="mt-2 text-3xl font-bold text-foreground">
                            Access restricted
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm text-foreground/60">
                            Only the workspace owner can access and manage
                            billing.
                        </p>

                        <Link
                            href="/"
                            className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:opacity-90"
                        >
                            Back to dashboard
                        </Link>
                    </section>
                </div>
            ) : (
                <div className="mx-auto max-w-5xl space-y-8">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
                            Billing
                        </p>

                        <h1 className="mt-2 text-3xl font-bold text-foreground">
                            Plans & Subscription
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm text-foreground/60">
                            Choose the plan that fits your workspace.
                            Subscription changes are handled securely
                            through Stripe.
                        </p>
                    </div>

                    {billingLoading ? (
                        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-8">
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 w-28 rounded bg-foreground/10" />
                                <div className="h-8 w-32 rounded bg-foreground/10" />
                                <div className="h-4 w-48 rounded bg-foreground/10" />
                            </div>

                            <p className="mt-5 text-sm text-foreground/50">
                                Loading billing information...
                            </p>
                        </section>
                    ) : (
                        <>
                            <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-foreground/60">
                                            Current plan
                                        </p>

                                        <p className="mt-1 text-2xl font-semibold text-foreground">
                                            {currentPlan?.toUpperCase() || "—"}
                                        </p>

                                        <p className="mt-1 text-sm text-foreground/60">
                                            Status:{" "}
                                            {billing?.status ||
                                                "inactive"}
                                        </p>

                                        {billing?.current_period_end && (
                                            <p className="mt-1 text-sm text-foreground/60">
                                                Current period ends on{" "}
                                                {new Date(
                                                    billing.current_period_end,
                                                ).toLocaleDateString(
                                                    "en-US",
                                                )}
                                                .
                                            </p>
                                        )}
                                    </div>

                                    {currentPlan !== "free" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void openPortal()
                                            }
                                            disabled={
                                                actionLoading !== null
                                            }
                                            className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-60"
                                        >
                                            {actionLoading === "portal"
                                                ? "Opening..."
                                                : "Manage subscription"}
                                        </button>
                                    )}
                                </div>
                            </section>

                            <section className="grid gap-6 md:grid-cols-3">
                                {plans.map((plan) => {
                                    const isCurrent =
                                        currentPlan === plan.id;
                                    const isFree =
                                        plan.id === "free";

                                    return (
                                        <article
                                            key={plan.id}
                                            className={`rounded-2xl border bg-surface-1 p-6 ${
                                                isCurrent
                                                    ? "border-cyan-400/60"
                                                    : "border-border-subtle"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h2 className="text-xl font-semibold text-foreground">
                                                        {plan.name}
                                                    </h2>

                                                    <p className="mt-2 text-3xl font-bold text-foreground">
                                                        {plan.price}

                                                        {!isFree && (
                                                            <span className="text-sm font-normal text-foreground/50">
                                                                {" "}
                                                                / month
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                {isCurrent && (
                                                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                                                        Current
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-4 text-sm text-foreground/60">
                                                {plan.description}
                                            </p>

                                            <ul className="mt-6 space-y-3 text-sm text-foreground/75">
                                                {plan.features.map(
                                                    (feature) => (
                                                        <li
                                                            key={feature}
                                                            className="flex gap-2"
                                                        >
                                                            <span className="text-cyan-300">
                                                                ✓
                                                            </span>

                                                            <span>
                                                                {feature}
                                                            </span>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>

                                            <div className="mt-8">
                                                {isCurrent ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="w-full rounded-xl border border-border-subtle px-4 py-2 font-semibold text-foreground/50"
                                                    >
                                                        Current plan
                                                    </button>
                                                ) : isFree ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => void changePlan("free")}
                                                        disabled={
                                                            currentPlan === "free" ||
                                                            actionLoading !== null
                                                        }
                                                        className="w-full rounded-xl border border-border-subtle px-4 py-2 font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-50"
                                                    >
                                                        {actionLoading === "free"
                                                            ? "Scheduling downgrade..."
                                                            : "Switch to Free"}
                                                    </button>
                                                ) : currentPlan === "free" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (plan.id === "pro" || plan.id === "business") {
                                                                void startCheckout(plan.id);
                                                            }
                                                        }}
                                                        disabled={
                                                            actionLoading !==
                                                            null
                                                        }
                                                        className="w-full rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                                                    >
                                                        {actionLoading ===
                                                        plan.id
                                                            ? "Starting checkout..."
                                                            : `Upgrade to ${plan.name}`}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (
                                                                plan.id === "pro" ||
                                                                plan.id === "business"
                                                            ) {
                                                                void changePlan(plan.id);
                                                            }
                                                        }}
                                                        disabled={
                                                            actionLoading !== null
                                                        }
                                                        className="w-full rounded-xl border border-border-subtle px-4 py-2 font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-60"
                                                    >
                                                        {actionLoading === plan.id
                                                            ? "Changing plan..."
                                                            : `Switch to ${plan.name}`}
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </section>

                            <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                                <h2 className="text-lg font-semibold text-foreground">
                                    Billing management
                                </h2>

                                <p className="mt-2 text-sm text-foreground/60">
                                    Manage payment methods, invoices,
                                    billing information, plan changes,
                                    and cancellation securely through
                                    Stripe.
                                </p>

                                {currentPlan !== "free" && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void changePlan("free")
                                        }
                                        disabled={
                                            actionLoading !== null
                                        }
                                        className="mt-5 rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                                    >
                                        {actionLoading === "portal"
                                            ? "Opening..."
                                            : "Open Stripe Billing Portal"}
                                    </button>
                                )}

                                <p className="mt-4 text-xs text-foreground/50">
                                    Sensitive billing actions may require
                                    2FA.{" "}
                                    <Link
                                        href="/settings#security"
                                        className="text-cyan-300 hover:underline"
                                    >
                                        Open Security
                                    </Link>
                                </p>
                            </section>

                            <button
                                type="button"
                                onClick={() =>
                                    void loadBilling()
                                }
                                disabled={billingLoading}
                                className="text-sm text-foreground/50 hover:text-foreground/80 disabled:opacity-50"
                            >
                                Refresh billing status
                            </button>
                        </>
                    )}
                </div>
            )}
        </AuthGuard>
    );
}
