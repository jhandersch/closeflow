import { supabase } from "@/lib/supabase/client"

type DemoLeadInput = {
  name: string
  company: string
  status: string
  value: number
  notes: string
  activities: Array<{ action: string; type?: string }>
}

const demoLeads: DemoLeadInput[] = [
  {
    name: "Maya Chen",
    company: "Northstar Labs",
    status: "proposal",
    value: 18500,
    notes: "Executive sponsor requested a follow-up before Friday.",
    activities: [
      { action: "Demo completed with VP of Revenue", type: "ai" },
      { action: "Proposal sent and awaiting sign-off", type: "note" },
    ],
  },
  {
    name: "Darius Bell",
    company: "Helio Cloud",
    status: "contacted",
    value: 9200,
    notes: "Interested in automation and forecasting.",
    activities: [
      { action: "Discovery call completed", type: "status" },
      { action: "Shared pricing overview", type: "note" },
    ],
  },
  {
    name: "Nina Alvarez",
    company: "Foundry AI",
    status: "new",
    value: 6400,
    notes: "New inbound inquiry from product-led growth team.",
    activities: [
      { action: "Inbound lead captured via website", type: "status" },
      { action: "Sent welcome email", type: "note" },
    ],
  },
  {
    name: "Marcus Reed",
    company: "Crestline Health",
    status: "won",
    value: 24300,
    notes: "Signed contract and onboarding started.",
    activities: [
      { action: "Signed contract", type: "status" },
      { action: "Onboarding kickoff completed", type: "ai" },
    ],
  },
  {
    name: "Sofia Patel",
    company: "Lumen Dynamics",
    status: "contacted",
    value: 11100,
    notes: "Asked for an expanded trial for three teams.",
    activities: [
      { action: "Follow-up call booked", type: "note" },
      { action: "Product tour delivered", type: "ai" },
    ],
  },
]

export async function loadDemoData() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You need an active session to load demo data.")
  }

  const { data: existingLeads } = await supabase
    .from("leads")
    .select("id")
    .eq("user_id", user.id)

  if ((existingLeads?.length ?? 0) > 0) {
    return { inserted: 0, message: "Demo data already exists for this workspace." }
  }

  const insertedLeads = [] as Array<{ id: string }>

  for (const lead of demoLeads) {
    const { data: createdLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        user_id: user.id,
        name: lead.name,
        company: lead.company,
        status: lead.status,
        value: lead.value,
        notes: lead.notes,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (leadError || !createdLead) {
      throw leadError ?? new Error("Failed to create demo lead")
    }

    insertedLeads.push(createdLead)

    const activities = lead.activities.map((activity, index) => ({
      lead_id: createdLead.id,
      user_id: user.id,
      action: activity.action,
      type: activity.type,
      created_at: new Date(Date.now() - (lead.activities.length - index) * 1000 * 60 * 60 * 6).toISOString(),
    }))

    const { error: activityError } = await supabase.from("activities").insert(activities)

    if (activityError) {
      throw activityError
    }
  }

  return {
    inserted: insertedLeads.length,
    message: "Demo data loaded successfully.",
  }
}
