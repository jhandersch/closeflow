import { supabase } from "@/lib/supabase/client"
import type { Lead, LeadStatus, TaskPriority } from "@/types"



async function getWorkspaceId(userId: string) {

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  return data?.workspace_id ?? null

}



async function openTaskAlreadyExists(
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
  lead: Lead,
  triggerKey: string,
  title: string,
  priority: TaskPriority,
  dueDate: string
) {


  console.log(
    "Creating automation task",
    {
      lead: lead.name,
      triggerKey,
      title,
    }
  )



  if (
    await openTaskAlreadyExists(
      lead.id,
      title
    )
  ) {

    console.log(
      "Automation already exists"
    )

    return

  }




  const {
    data: {
      user
    }
  } = await supabase.auth.getUser()



  if (!user) {

    console.log(
      "No user found"
    )

    return

  }




  const workspaceId =
    await getWorkspaceId(
      user.id
    )
    if(!workspaceId){

      console.log(
        "No workspace found"
      )

      return

    }





  const {
    data: task,
    error: taskError
  } =
    await supabase
      .from("tasks")
      .insert({

        workspace_id: workspaceId,
        user_id: user.id,
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





  const {
    error: automationError
  } =
    await supabase
      .from("lead_automations")
      .insert({

        workspace_id: workspaceId,

        lead_id: lead.id,

        trigger_key: triggerKey,

        task_id: task.id,

      })




  console.log(
    "Automation insert result",
    {
      automationError,
    }
  )




  if (automationError) {

    throw automationError

  }





  await supabase
    .from("activities")
    .insert({

      workspace_id: workspaceId,

      lead_id: lead.id,

      user_id: user.id,


      title:
        "Automation created task",


      description:
        title,


      action:
        title,


      type:
        "task_created",


      metadata: {

        automation: true,

        trigger: triggerKey,

        task_id: task.id,

      },

    })




  console.log(
    "Automation finished",
    task.id
  )


}






export async function runLeadAutomation(
  lead: Lead,
  previousStatus: LeadStatus
) {


  console.log(
    "Automation gestartet",
    lead.status,
    previousStatus
  )



  if (
    previousStatus !== "contacted" &&
    lead.status === "contacted"
  ) {


    const due =
      new Date()


    due.setDate(
      due.getDate() + 3
    )



    await createAutomationTask(

      lead,

      "contacted_followup",

      `Follow up: ${lead.name}`,

      "medium",

      due.toISOString()

    )


  }

  if (
  previousStatus !== "proposal" &&
  lead.status === "proposal"
) {
  const due = new Date()

  due.setDate(due.getDate() + 5)

  await createAutomationTask(
    lead,
    "proposal_followup",
    `Follow up proposal: ${lead.name}`,
    "high",
    due.toISOString()
  )
}

if (
  previousStatus !== "won" &&
  lead.status === "won"
) {

  console.log("WON AUTOMATION", {
  previousStatus,
  currentStatus: lead.status,
})
  // Welcome customer
  const welcomeDue = new Date()
  welcomeDue.setDate(welcomeDue.getDate() + 1)

  await createAutomationTask(
    lead,
    "won_welcome_customer",
    `Welcome customer: ${lead.name}`,
    "high",
    welcomeDue.toISOString()
  )

  // Schedule onboarding meeting
  const onboardingDue = new Date()
  onboardingDue.setDate(onboardingDue.getDate() + 3)

  await createAutomationTask(
    lead,
    "won_onboarding_meeting",
    `Schedule onboarding meeting: ${lead.name}`,
    "high",
    onboardingDue.toISOString()
  )

  // First customer check-in
  const checkInDue = new Date()
  checkInDue.setDate(checkInDue.getDate() + 14)

  await createAutomationTask(
    lead,
    "won_first_checkin",
    `First customer check-in: ${lead.name}`,
    "medium",
    checkInDue.toISOString()
  )
}

if(
 previousStatus !== "lost" &&
 lead.status === "lost"
){

 const due = new Date()

 due.setDate(
   due.getDate()+30
 )

 await createAutomationTask(
   lead,
   "lost_reactivation",
   `Reactivation follow up: ${lead.name}`,
   "low",
   due.toISOString()
 )

}


}