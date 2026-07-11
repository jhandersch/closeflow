export function leadDisplayName(lead: any): string {
  if (!lead) return "Unnamed lead"

  const name = typeof lead.name === "string" ? lead.name.trim() : ""
  if (name) return name

  const company = typeof lead.company === "string" ? lead.company.trim() : ""
  if (company) return company

  const emailUser = typeof lead.email === "string" && lead.email.includes("@") ? lead.email.split("@")[0] : ""
  if (emailUser) return emailUser

  return "Unnamed lead"
}

export function leadCompany(lead: any): string {
  if (!lead) return "—"
  const company = typeof lead.company === "string" ? lead.company.trim() : ""
  return company || "—"
}
