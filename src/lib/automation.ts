import type {
  Lead,
  LeadStatus,
  TaskPriority,
} from "@/types"

import type { SupabaseClient } from "@supabase/supabase-js"


async function openTaskAlreadyExists(
  supabase: SupabaseClient,
  leadId: string,
  title: string
) {
  const { data } = await supabase
    .from("tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("title", title)
    .eq("completed", false)
    .maybeSingle()

  return !!data
}


async function createAutomationTask(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  lead: Lead,
  triggerKey: string,
  title: string,
  priority: TaskPriority,
  dueDate: string
) {
  console.log("Creating automation task", {
    lead: lead.name,
    triggerKey,
    title,
  })


  /*
    Keine doppelte offene Automation-Task
  */

  if (
    await openTaskAlreadyExists(
      supabase,
      lead.id,
      title
    )
  ) {
    console.log(
      "Automation task already exists"
    )

    return null
  }


  /*
    Task erstellen
  */

  const {
    data: task,
    error: taskError,
  } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      lead_id: lead.id,

      title,

      priority,

      due_date: dueDate,

      completed: false,
    })
    .select()
    .single()


  console.log(
    "Task insert result",
    {
      task,
      taskError,
    }
  )


  if (taskError) {
    throw taskError
  }


  /*
    Automation speichern
  */

  const {
    error: automationError,
  } = await supabase
    .from("lead_automations")
    .insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      trigger_key: triggerKey,
      task_id: task.id,
    })


  if (automationError) {
    throw automationError
  }


  /*
    Activity erstellen
  */

  const {
    error: activityError,
  } = await supabase
    .from("activities")
    .insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      user_id: userId,

      title: "Automation created task",

      description: title,

      action: title,

      type: "task_created",

      metadata: {
        automation: true,
        trigger: triggerKey,
        task_id: task.id,
      },
    })


  if (activityError) {
    console.error(
      "Automation activity error:",
      activityError
    )
  }


  console.log(
    "Automation finished",
    task.id
  )


  return task
}


async function updateNextAction(
  supabase: SupabaseClient,
  leadId: string,
  action: string,
  actionDate: string
) {
  const {
    error,
  } = await supabase
    .from("leads")
    .update({
      next_action: action,
      next_action_date: actionDate,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", leadId)


  if (error) {
    throw error
  }
}


export async function runLeadAutomation(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  lead: Lead,
  previousStatus: LeadStatus
) {
  console.log(
    "Automation gestartet",
    {
      lead: lead.name,
      previousStatus,
      currentStatus: lead.status,
      userId,
      workspaceId,
    }
  )


  /*
    CONTACTED
  */

  if (
    previousStatus !== "contacted" &&
    lead.status === "contacted"
  ) {
    const due = new Date()

    due.setDate(
      due.getDate() + 3
    )

    const dueDate =
      due.toISOString()


    await createAutomationTask(
      supabase,
      userId,
      workspaceId,
      lead,

      "contacted_followup",

      `Follow up: ${lead.name}`,

      "medium",

      dueDate
    )


    await updateNextAction(
      supabase,
      lead.id,

      "Follow up with lead",

      dueDate
    )
  }


  /*
    PROPOSAL
  */

  if (
    previousStatus !== "proposal" &&
    lead.status === "proposal"
  ) {
    const due = new Date()

    due.setDate(
      due.getDate() + 5
    )

    const dueDate =
      due.toISOString()


    await createAutomationTask(
      supabase,
      userId,
      workspaceId,
      lead,

      "proposal_followup",

      `Follow up proposal: ${lead.name}`,

      "high",

      dueDate
    )


    await updateNextAction(
      supabase,
      lead.id,

      "Follow up on proposal",

      dueDate
    )
  }


  /*
    WON
  */

  if (
    previousStatus !== "won" &&
    lead.status === "won"
  ) {
    console.log(
      "WON AUTOMATION",
      {
        previousStatus,
        currentStatus: lead.status,
      }
    )


    /*
      Welcome customer
    */

    const welcomeDue =
      new Date()

    welcomeDue.setDate(
      welcomeDue.getDate() + 1
    )


    await createAutomationTask(
      supabase,
      userId,
      workspaceId,
      lead,

      "won_welcome_customer",

      `Welcome customer: ${lead.name}`,

      "high",

      welcomeDue.toISOString()
    )


    /*
      Onboarding meeting
    */

    const onboardingDue =
      new Date()

    onboardingDue.setDate(
      onboardingDue.getDate() + 3
    )


    await createAutomationTask(
      supabase,
      userId,
      workspaceId,
      lead,

      "won_onboarding_meeting",

      `Schedule onboarding meeting: ${lead.name}`,

      "high",

      onboardingDue.toISOString()
    )


    /*
      First check-in
    */

    const checkInDue =
      new Date()

    checkInDue.setDate(
      checkInDue.getDate() + 14
    )


    await createAutomationTask(
      supabase,
      userId,
      workspaceId,
      lead,

      "won_first_checkin",

      `First customer check-in: ${lead.name}`,

      "medium",

      checkInDue.toISOString()
    )


    await updateNextAction(
      supabase,
      lead.id,

      "Start customer onboarding",

      onboardingDue.toISOString()
    )
  }


  /*
    LOST
  */

  if (
    previousStatus !== "lost" &&
    lead.status === "lost"
  ) {
    const due =
      new Date()

    due.setDate(
      due.getDate() + 30
    )

    const dueDate =
      due.toISOString()


    await createAutomationTask(
      supabase,
      userId,
      workspaceId,
      lead,

      "lost_reactivation",

      `Reactivation follow up: ${lead.name}`,

      "low",

      dueDate
    )


    await updateNextAction(
      supabase,
      lead.id,

      "Reactivate lead",

      dueDate
    )
  }
}