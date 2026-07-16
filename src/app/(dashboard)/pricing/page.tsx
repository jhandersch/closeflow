"use client"

import Link from "next/link"
import AuthGuard from "@/components/AuthGuard"

export default function PricingPage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Pricing</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Choose a plan</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <PlanCard name="Free" price="€0" description="50 Leads, 1 user, basic AI" href="/billing" />
          <PlanCard name="Pro" price="€29" description="Unlimited leads, 5 users, advanced AI, analytics" href="/billing" featured />
          <PlanCard name="Business" price="€79" description="Unlimited everything for growing teams" href="/billing" />
        </div>
      </div>
    </AuthGuard>
  )
}

function PlanCard({ name, price, description, href, featured }: { name: string; price: string; description: string; href: string; featured?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 ${featured ? "border-cyan-500/30 bg-cyan-500/10" : "border-border-subtle bg-surface-1"}`}>
      <p className="text-sm uppercase tracking-[0.25em] text-foreground/55">{name}</p>
      <p className="mt-3 text-3xl font-bold text-foreground">{price}</p>
      <p className="mt-2 text-sm text-foreground/65">{description}</p>
      <Link href={href} className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 font-semibold text-black">Select</Link>
    </div>
  )
}
