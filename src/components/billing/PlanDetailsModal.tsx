"use client";

import React from "react";

import { Check, X } from "lucide-react";
import type { Plan } from "@/lib/planDetails";
import { planDetails } from "@/lib/planDetails";

type PlanDetailsModalProps = {
    plan: Plan | null;
    onClose: () => void;
};

const comparisonRows = [
    {
        category: "CRM & workspace",
        rows: [
            { label: "Team members", values: { free: "1", pro: "5", business: "20" } },
            { label: "Leads", values: { free: "50", pro: "Unlimited", business: "Unlimited" } },
            { label: "Customers", values: { free: "Included", pro: "Included", business: "Included" } },
            { label: "Core CRM", values: { free: true, pro: true, business: true } },
            { label: "Pipeline board", values: { free: true, pro: true, business: true } },
            { label: "Tasks", values: { free: true, pro: true, business: true } },
            { label: "Calendar", values: { free: true, pro: true, business: true } },
            { label: "Automations", values: { free: true, pro: true, business: true } },
        ],
    },
    {
        category: "AI",
        rows: [
            { label: "AI requests", values: { free: "10 / month", pro: "500 / month", business: "5,000 / month" } },
            { label: "Sales Coach", values: { free: true, pro: true, business: true } },
            { label: "Lead Analysis", values: { free: true, pro: true, business: true } },
            { label: "Pipeline Analysis", values: { free: true, pro: true, business: true } },
            { label: "Risk Detection", values: { free: true, pro: true, business: true } },
            { label: "Email Generator", values: { free: true, pro: true, business: true  } },
            { label: "Revenue Forecast AI", values: { free: true, pro: true, business: true } },
        ],
    },
    {
        category: "Data & exports",
        rows: [
            { label: "CSV import", values: { free: true, pro: true, business: true } },
            { label: "CSV export", values: { free: "Counts toward shared export limit", pro: "Counts toward shared export limit", business: "Counts toward shared export limit" } },
            { label: "XLSX export", values: { free: "Counts toward shared export limit", pro: "Counts toward shared export limit", business: "Counts toward shared export limit" } },
            { label: "Total exports", values: { free: "5 / month", pro: "200 / month", business: "2,000 / month" } },
        ],
    },
    {
        category: "Forecasting",
        rows: [
            { label: "Pipeline forecasting", values: { free: true, pro: true, business: true } },
            { label: "Revenue forecasting", values: { free: true, pro: true, business: true } },
        ],
    },
] as const;

function renderValue(value: string | boolean) {
    if (typeof value === "string") {
        return (
            <span className="text-sm text-foreground/75">
                {value}
            </span>
        );
    }

    return value ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-black">
            <Check className="h-4 w-4" />
        </span>
    ) : (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
            <X className="h-4 w-4" />
        </span>
    );
}

export default function PlanDetailsModal({
    plan,
    onClose,
}: PlanDetailsModalProps) {
    if (!plan) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border-subtle bg-surface-1 shadow-2xl">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle bg-surface-1 p-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                            Plan comparison
                        </p>

                        <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                            Compare CloseFlow plans
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60">
                            Compare pricing, capacity, AI capabilities,
                            forecasting, and analytics side by side.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close plan comparison"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle text-foreground/60 transition hover:bg-foreground/5 hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain">
                    <table className="w-full min-w-[760px] border-collapse">
                        <thead>
                            <tr className="border-b border-border-subtle">
                                <th className="w-[34%] p-5 text-left text-sm font-medium text-foreground/50">
                                    Features
                                </th>

                                {(["free", "pro", "business"] as Plan[]).map(
                                    (currentPlan) => {
                                        const selected =
                                            plan === currentPlan;

                                        return (
                                            <th
                                                key={currentPlan}
                                                className={`p-5 text-left ${
                                                    selected
                                                        ? "bg-cyan-500/5"
                                                        : ""
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-semibold text-foreground">
                                                        {
                                                            planDetails[
                                                                currentPlan
                                                            ].name
                                                        }
                                                    </span>

                                                    {selected && (
                                                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                                                            Selected
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mt-2 text-xl font-bold text-foreground">
                                                    {
                                                        planDetails[
                                                            currentPlan
                                                        ].price
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs font-normal text-foreground/45">
                                                    {
                                                        planDetails[
                                                            currentPlan
                                                        ].seats
                                                    }
                                                </p>
                                            </th>
                                        );
                                    },
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {comparisonRows.map((section) => (
                                <React.Fragment key={section.category}>
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="border-b border-border-subtle bg-surface-2/50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400"
                                        >
                                            {section.category}
                                        </td>
                                    </tr>

                                    {section.rows.map((row) => (
                                        <tr
                                            key={row.label}
                                            className="border-b border-border-subtle last:border-b-0"
                                        >
                                            <td className="p-5 text-sm font-medium text-foreground/75">
                                                {row.label}
                                            </td>

                                            {(
                                                [
                                                    "free",
                                                    "pro",
                                                    "business",
                                                ] as Plan[]
                                            ).map((currentPlan) => (
                                                <td
                                                    key={currentPlan}
                                                    className={`p-5 ${
                                                        plan ===
                                                        currentPlan
                                                            ? "bg-cyan-500/5"
                                                            : ""
                                                    }`}
                                                >
                                                    {renderValue(
                                                        row.values[
                                                            currentPlan
                                                        ],
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="shrink-0 border-t border-border-subtle bg-surface-2/30 p-5 text-sm text-foreground/50">
                    Prices and limits shown here reflect the current
                    CloseFlow plan configuration.
                </div>
            </div>
        </div>
    );
}




