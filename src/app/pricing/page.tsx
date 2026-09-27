"use client";

import Link from "next/link";
import { useState } from "react";
import PlanDetailsModal from "@/components/billing/PlanDetailsModal";
import { planDetails, type Plan } from "@/lib/planDetails";

const plans = [planDetails.free, planDetails.pro, planDetails.business];

export default function PricingPage() {
  const [detailsPlan, setDetailsPlan] = useState<Plan | null>(null);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link href="/" className="text-sm font-semibold text-foreground/60 transition hover:text-foreground">
          ← CloseFlow
        </Link>

        <header>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Pricing
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            Choose your growth plan
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-foreground/70">
            Compare plans, limits, and features. You can review the full feature matrix before choosing.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3" aria-label="CloseFlow plans">
          {plans.map((plan) => {
            const featured = plan.id === "pro";

            return (
              <article
                key={plan.id}
                className={`rounded-2xl border bg-surface-1 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/5 ${
                  featured ? "border-cyan-400/60" : "border-border-subtle"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {plan.name}
                    </h2>
                    <p className="mt-2 text-3xl font-bold text-foreground">
                      {plan.price.replace(/\/month$/, "")}
                      {plan.id !== "free" && (
                        <span className="text-sm font-normal text-foreground/50"> / month</span>
                      )}
                    </p>
                  </div>
                  {featured && (
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                      Popular
                    </span>
                  )}
                </div>

                <p className="mt-4 min-h-10 text-sm text-foreground/60">
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-3 text-sm text-foreground/75">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-cyan-300" aria-hidden="true">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setDetailsPlan(plan.id)}
                  className="mt-5 flex h-10 w-full items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/10"
                >
                  View plan details
                </button>

                <Link
                  href="/login?next=%2Fbilling"
                  className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  {plan.id === "free" ? "Start free" : `Choose ${plan.name}`}
                </Link>
              </article>
            );
          })}
        </section>

        <p className="text-center text-sm text-foreground/50">
          Already have a workspace?{" "}
          <Link href="/login?next=%2Fbilling" className="font-semibold text-cyan-300 hover:underline">
            Sign in to manage billing
          </Link>
        </p>
      </div>

      <PlanDetailsModal
        plan={detailsPlan}
        onClose={() => setDetailsPlan(null)}
      />
    </main>
  );
}
