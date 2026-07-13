"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useParams } from "next/navigation"
import AuthGuard from "@/components/AuthGuard"
import { useLeadsData } from "@/hooks/useLeadsData"

export default function CustomerDetailPage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? decodeURIComponent(params.id) : ""
  const { leads, loading, error } = useLeadsData({ activityLimit: 25 })

  const customer = useMemo(() => {
    const companyLeads = leads.filter((lead) => (lead.company || "").trim().toLowerCase() === id)
    if (!companyLeads.length) return null

    const revenue = companyLeads
      .filter((lead) => lead.status === "won")
      .reduce((sum, lead) => sum + (lead.value || 0), 0)

    const contacts = Array.from(new Set(companyLeads.map((lead) => lead.name).filter(Boolean)))

    const communicationHistory = companyLeads
      .flatMap((lead) => [{
        id: lead.id,
        label: `${lead.status.toUpperCase()} - ${lead.name}`,
        date: lead.last_activity_at || lead.updated_at || lead.created_at,
      }])
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

    return {
      company: companyLeads[0].company,
      contacts,
      revenue,
      leads: companyLeads,
      communicationHistory,
      notes: companyLeads.map((lead) => lead.notes).filter(Boolean) as string[],
      website: companyLeads.find((lead) => lead.website)?.website,
      address: companyLeads.find((lead) => lead.address)?.address,
      industry: "n/a",
    }
  }, [id, leads])

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">Customer Detail</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">{customer?.company || "Customer"}</h1>
          </div>
          <Link href="/customers" className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/75 hover:bg-foreground/5">
            Back to customers
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            Could not load customer: {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">Loading customer...</div>
        ) : !customer ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground/65">Customer not found.</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                <p className="text-xs text-foreground/55">Revenue History</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">EUR {customer.revenue.toLocaleString("de-DE")}</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                <p className="text-xs text-foreground/55">Purchased Products</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{customer.leads.filter((lead) => lead.status === "won").length} deals won</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                <p className="text-xs text-foreground/55">Contacts</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{customer.contacts.length}</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                <h2 className="text-lg font-semibold text-foreground">Company Profile</h2>
                <div className="mt-4 space-y-2 text-sm text-foreground/80">
                  <p>Industry: {customer.industry}</p>
                  <p>Website: {customer.website || "n/a"}</p>
                  <p>Address: {customer.address || "n/a"}</p>
                </div>
              </section>

              <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
                <div className="mt-4 space-y-2 text-sm text-foreground/80">
                  {customer.contacts.map((contact) => (
                    <p key={contact}>{contact}</p>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
              <h2 className="text-lg font-semibold text-foreground">Communication History</h2>
              <div className="mt-4 space-y-3">
                {customer.communicationHistory.map((entry) => (
                  <div key={`${entry.id}-${entry.date}`} className="rounded-xl border border-border-subtle bg-surface-2/70 p-3 text-sm text-foreground/80">
                    <p>{entry.label}</p>
                    <p className="mt-1 text-xs text-foreground/55">{entry.date ? new Date(entry.date).toLocaleString("de-DE") : "n/a"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
              <h2 className="text-lg font-semibold text-foreground">Notes</h2>
              <div className="mt-4 space-y-2 text-sm text-foreground/80">
                {customer.notes.length ? customer.notes.map((note, index) => <p key={`${note.slice(0, 20)}-${index}`}>{note}</p>) : <p className="text-foreground/55">No notes available.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </AuthGuard>
  )
}
