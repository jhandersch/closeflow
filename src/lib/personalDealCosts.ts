type PersonalDealCost = {
  lead_id: string;
  name: string;
  amount: number;
};

export function sumPersonalDealCosts(value: unknown, leadId: string): number {
  return getPersonalDealCostsForLead(value, leadId)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function getPersonalDealCostsForLead(value: unknown, leadId: string): PersonalDealCost[] {
  if (!Array.isArray(value)) return [];
  return (value as PersonalDealCost[])
    .filter((item) => item && item.lead_id === leadId && typeof item.name === "string" && item.name.trim() && Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0)
    .slice(0, 100)
    .map((item) => ({ lead_id: leadId, name: item.name.trim(), amount: Number(item.amount) }));
}

export function formatPersonalDealCostsForLead(value: unknown, leadId: string, grossValue?: number): string {
  const costs = getPersonalDealCostsForLead(value, leadId);
  if (!costs.length) return "No personal deal costs recorded for this lead.";
  const total = costs.reduce((sum, item) => sum + item.amount, 0);
  const netValue = Number.isFinite(grossValue) ? ` Gross deal value: €${Number(grossValue).toFixed(2)}; estimated value after these costs: €${(Number(grossValue) - total).toFixed(2)} before other expenses.` : " Subtract this total from the gross deal value to estimate value before other expenses.";
  return `${costs.map((item) => `${item.name}: €${item.amount.toFixed(2)}`).join(", ")}. Total estimated costs: €${total.toFixed(2)}.${netValue} These are user-provided estimates, not verified accounting figures.`;
}
