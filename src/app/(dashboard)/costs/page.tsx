"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

type PersonalDealCost = { lead_id: string; name: string; amount: string };
type CostLead = { id: string; name: string; company?: string | null; status: string };

export default function CostsPage() {
  const [loading, setLoading] = useState(true);
  const [personalDealCosts, setPersonalDealCosts] = useState<PersonalDealCost[]>([]);
  const [costLeads, setCostLeads] = useState<CostLead[]>([]);
  const [selectedCostLeadId, setSelectedCostLeadId] = useState("");
  const [savingDealCosts, setSavingDealCosts] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const metadata = user.user_metadata || {};

      try {
        const leadsResponse = await fetch("/api/leads?includeCompleted=true", { cache: "no-store" });
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          const availableLeads: CostLead[] = Array.isArray(leadsData)
            ? leadsData.map((lead: any) => ({
                id: lead.id,
                name: lead.name,
                company: lead.company,
                status: lead.status,
              }))
            : [];

          if (!active) return;

          setCostLeads(availableLeads);

          const finalizedLeadIds = new Set(
            availableLeads
              .filter((lead: CostLead) => ["won", "lost"].includes(lead.status))
              .map((lead: CostLead) => lead.id)
          );

          const savedCosts = Array.isArray(metadata.personal_deal_costs)
            ? metadata.personal_deal_costs.filter(
                (item: any) => item && !finalizedLeadIds.has(item.lead_id)
              )
            : [];

          setPersonalDealCosts(
            savedCosts.map((item: any) => ({
              lead_id: typeof item.lead_id === "string" ? item.lead_id : "",
              name: item.name,
              amount: item.amount == null ? "" : String(item.amount),
            }))
          );

          if (
            savedCosts.length !==
            (Array.isArray(metadata.personal_deal_costs)
              ? metadata.personal_deal_costs.length
              : 0)
          ) {
            const { error: cleanupError } = await supabase.auth.updateUser({
              data: { personal_deal_costs: savedCosts },
            });
            if (cleanupError) {
              console.error("Could not clear costs for finalized leads:", cleanupError);
            }
          }

          const savedLeadId = Array.isArray(metadata.personal_deal_costs)
            ? savedCosts.find((item: any) =>
                availableLeads.some(
                  (lead: CostLead) =>
                    lead.id === item?.lead_id && !["won", "lost"].includes(lead.status)
                )
              )?.lead_id
            : "";

          setSelectedCostLeadId(
            savedLeadId ||
              availableLeads.find(
                (lead: CostLead) => !["won", "lost"].includes(lead.status)
              )?.id ||
              ""
          );
        }
      } catch (error) {
        console.error("Could not load leads for deal costs:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const saveDealCosts = async () => {
    const activeLeadIds = new Set(
      costLeads
        .filter((lead) => !["won", "lost"].includes(lead.status))
        .map((lead) => lead.id)
    );

    const costs = personalDealCosts
      .map((cost) => ({
        lead_id: cost.lead_id,
        name: cost.name.trim(),
        amount: cost.amount.trim() === "" ? Number.NaN : Number(cost.amount),
      }))
      .filter((cost) => activeLeadIds.has(cost.lead_id));

    if (
      costs.some(
        (cost) =>
          !cost.lead_id ||
          !cost.name ||
          !Number.isFinite(cost.amount) ||
          cost.amount < 0
      )
    ) {
      toast.error("Choose a lead and enter a cost name and valid amount for each item");
      return;
    }

    if (costs.length > 100) {
      toast.error("You can add up to 100 cost items");
      return;
    }

    setSavingDealCosts(true);
    const { error } = await supabase.auth.updateUser({
      data: { personal_deal_costs: costs },
    });

    if (error) {
      toast.error(error.message || "Could not save deal costs");
    } else {
      setPersonalDealCosts(
        costs.map((cost) => ({ ...cost, amount: String(cost.amount) }))
      );
      toast.success("Deal costs saved");
    }
    setSavingDealCosts(false);
  };

  const openLeads = costLeads.filter((lead) => !["won", "lost"].includes(lead.status));
  const currentLeadCosts = personalDealCosts
    .map((cost, index) => ({ cost, index }))
    .filter(({ cost }) => cost.lead_id === selectedCostLeadId);

  const selectedLeadTotal = personalDealCosts
    .filter((cost) => cost.lead_id === selectedCostLeadId)
    .reduce((sum, cost) => sum + (Number(cost.amount) || 0), 0);

  const totalAllCosts = personalDealCosts.reduce(
    (sum, cost) => sum + (Number(cost.amount) || 0),
    0
  );

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
            Costs
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Deal Costs & Expenses
          </h1>
          <p className="mt-2 text-sm text-foreground/65">
            Track individual costs associated with your deals to project realistic net revenue.
          </p>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-border-subtle bg-surface-1">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">My deal costs</h2>
                <p className="mt-1 text-sm text-foreground/65">
                  Select a lead once, then add all costs that apply to that deal.
                </p>
              </div>
              {personalDealCosts.length > 0 && (
                <div className="mt-2 rounded-xl border border-border-subtle bg-surface-2 px-3.5 py-1.5 text-xs text-foreground/75 sm:mt-0">
                  Total recorded costs across deals:{" "}
                  <span className="font-semibold text-foreground">
                    €{totalAllCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-foreground/55">
              Costs are cleared automatically when a deal is marked won or lost.
            </p>

            {openLeads.length === 0 ? (
              <p className="mt-4 rounded-xl border border-border-subtle bg-surface-2/70 p-4 text-sm text-foreground/65">
                No open leads available. Create or reopen a lead to add deal costs.
              </p>
            ) : null}

            <label className="mt-5 block max-w-xl text-sm text-foreground/70">
              Lead
              <select
                aria-label="Select lead"
                value={selectedCostLeadId}
                onChange={(event) => setSelectedCostLeadId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
              >
                <option value="">Select a lead</option>
                {openLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name}
                    {lead.company ? ` · ${lead.company}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5 space-y-3">
              {currentLeadCosts.map(({ cost, index }) => (
                <div
                  key={`${cost.lead_id}-${index}`}
                  className="grid gap-3 sm:grid-cols-[1fr_200px_auto]"
                >
                  <input
                    aria-label="Cost name"
                    value={cost.name}
                    onChange={(event) =>
                      setPersonalDealCosts((items) =>
                        items.map((item, i) =>
                          i === index ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                    placeholder="e.g. Onboarding"
                    className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
                  />
                  <input
                    aria-label="Cost in euros"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cost.amount}
                    onChange={(event) =>
                      setPersonalDealCosts((items) =>
                        items.map((item, i) =>
                          i === index ? { ...item, amount: event.target.value } : item
                        )
                      )
                    }
                    className="min-w-0 rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPersonalDealCosts((items) =>
                        items.filter((_, i) => i !== index)
                      )
                    }
                    className="rounded-xl border border-border-subtle px-4 py-3 text-sm text-foreground/75 hover:bg-foreground/5"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {selectedCostLeadId && currentLeadCosts.length === 0 ? (
                <p className="text-sm text-foreground/55">
                  No costs added for this lead yet.
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setPersonalDealCosts((items) =>
                    items.length < 100
                      ? [
                          ...items,
                          {
                            lead_id: selectedCostLeadId,
                            name: "",
                            amount: "",
                          },
                        ]
                      : items
                  )
                }
                disabled={personalDealCosts.length >= 100 || !selectedCostLeadId}
                className="rounded-xl border border-border-subtle px-4 py-3 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"
              >
                Add cost for this lead
              </button>

              <button
                type="button"
                onClick={() => void saveDealCosts()}
                disabled={savingDealCosts}
                className="rounded-xl bg-foreground px-5 py-3 font-semibold text-background disabled:opacity-50"
              >
                {savingDealCosts ? "Saving..." : "Save deal costs"}
              </button>
            </div>

            {selectedCostLeadId ? (
              <p className="mt-3 text-xs text-foreground/55">
                Selected lead total: €
                {selectedLeadTotal.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
