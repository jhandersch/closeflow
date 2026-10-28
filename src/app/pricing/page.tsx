"use client";
import { translateText } from "@/lib/i18n";


import Link from "next/link";
import { useState } from "react";
import PlanDetailsModal from "@/components/billing/PlanDetailsModal";
import { LogoMark } from "@/components/Logo";
import { planDetails, type Plan } from "@/lib/planDetails";

const plans = [planDetails.free, planDetails.pro, planDetails.business];

export default function PricingPage() {
  const [detailsPlan, setDetailsPlan] = useState<Plan | null>(null);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/70 transition hover:text-foreground" aria-label={translateText("CloseFlow home")}>
          <LogoMark size={24} /> {translateText("CloseFlow")}</Link>

        <header>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            {translateText("Pricing")}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            {translateText("Choose your growth plan")}</h1>
          <p className="mt-3 max-w-3xl text-sm text-foreground/70">
            {translateText("Compare plans, limits, and features. You can review the full feature matrix before choosing.")}</p>
        </header>

        <section className="grid gap-6 md:grid-cols-3" aria-label={translateText("CloseFlow plans")}>
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
                      {translateText(plan.name)}
                    </h2>
                    <p className="mt-2 text-3xl font-bold text-foreground">
                      {plan.price.replace(/\/month$/, "")}
                      {plan.id !== "free" && (
                        <span className="text-sm font-normal text-foreground/50"> {" "}{translateText("/ month per workspace")}</span>
                      )}
                    </p>
                  </div>
                  {featured && (
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                      {translateText("Popular")}</span>
                  )}
                </div>

                <p className="mt-4 min-h-10 text-sm text-foreground/60">
                  {translateText(plan.description)}
                </p>

                <ul className="mt-6 space-y-3 text-sm text-foreground/75">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-cyan-300" aria-hidden="true">✓</span>
                      <span>{translateText(feature)}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setDetailsPlan(plan.id)}
                  className="mt-5 flex h-10 w-full items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/10"
                >
                  {translateText("View plan details")}</button>

                <Link
                  href="/login?next=%2Fbilling"
                  className="cf-btn-primary mt-3 h-10 w-full"
                >
                  {plan.id === "free" ? translateText("Start free") : translateText(`Choose ${plan.name}`)}
                </Link>
              </article>
            );
          })}
        </section>

        <p className="text-center text-sm text-foreground/50">
          {translateText("Already have a workspace?")}{" "}
          <Link href="/login?next=%2Fbilling" className="font-semibold text-cyan-300 hover:underline">
            {translateText("Sign in to manage billing")}</Link>
        </p>
      </div>

      <PlanDetailsModal
        plan={detailsPlan}
        onClose={() => setDetailsPlan(null)}
      />
    </main>
  );
}
