"use client";

import Link from "next/link";
import { ArrowUpRight, CircleAlert } from "lucide-react";
import type { Lead } from "@/types";
import { leadCompany, leadDisplayName } from "@/lib/utils";

type DealsNeedingAttentionProps = { leads: Lead[] };

export default function DealsNeedingAttention({ leads }: DealsNeedingAttentionProps) {
    const visibleLeads = leads.slice(0, 3);

    return (
        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6" aria-labelledby="attention-deals-heading">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-foreground/55">Pipeline</p>
                    <h2 id="attention-deals-heading" className="mt-1 text-lg font-semibold text-foreground">Deals needing attention</h2>
                    <p className="mt-1 text-sm text-foreground/55">Open opportunities that may need a follow-up.</p>
                </div>
                <CircleAlert className="mt-1 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            </div>

            {visibleLeads.length ? (
                <div className="mt-5 space-y-2">
                    {visibleLeads.map((lead) => (
                        <Link
                            key={lead.id}
                            href={`/leads/${lead.id}`}
                            className="group block rounded-xl border border-border-subtle bg-surface-2/40 p-4 transition hover:border-cyan-500/30 hover:bg-surface-2/70"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">{leadDisplayName(lead)}</p>
                                    <p className="mt-0.5 truncate text-xs text-foreground/55">{leadCompany(lead)}</p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-foreground">€{Number(lead.value || 0).toLocaleString("en-US")}</span>
                            </div>
                            <div className="mt-3 flex items-start justify-between gap-3">
                                <p className="line-clamp-2 text-xs text-foreground/60">{lead.next_action?.trim() || "Add a next action"}</p>
                                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-foreground/35 transition group-hover:text-cyan-300" aria-hidden="true" />
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                    <p className="text-sm font-medium text-emerald-200">No deals need urgent attention.</p>
                    <p className="mt-1 text-xs text-foreground/55">Keep your open opportunities moving with clear next actions.</p>
                </div>
            )}

            <Link href="/leads" className="mt-4 inline-flex text-sm font-medium text-cyan-300 transition hover:text-cyan-200">Review all leads →</Link>
        </section>
    );
}
