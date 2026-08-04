"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import toast from "react-hot-toast"


import { useLeadDetail } from "@/hooks/useLeadDetail"
import { useLeadActions } from "@/hooks/useLeadActions"
import { useTasks } from "@/hooks/useTasks"


import {
  useAppPreferences
} from "@/components/AppPreferencesProvider"


import LeadHeader from "@/components/leads/detail/LeadHeader"
import LeadTabs from "@/components/leads/detail/LeadTabs"
import LeadOverview from "@/components/leads/detail/LeadOverview"
import LeadTasks from "@/components/leads/detail/LeadTasks"
import LeadNotes from "@/components/leads/detail/LeadNotes"
import LeadMeetings from "@/components/leads/detail/LeadMeetings"
import LeadDetailsForm from "@/components/leads/detail/LeadDetailsForm"


import ActivityTimeline from "@/components/leads/ActivityTimeline"
import PipelineJourney from "@/components/leads/PipelineJourney"
import DealMetrics from "@/components/leads/DealMetrics"
import AILeadSummary from "@/components/leads/AILeadSummary"


import {
 calculateSalesScore
} from "@/lib/salesScore"

import {
 getStaleDays
} from "@/lib/scoring"



type Tab =
 | "overview"
 | "activities"
 | "notes"
 | "tasks"
 | "meetings"



export default function LeadDetailPage(){


const router = useRouter()

const params = useParams()


const id =
typeof params.id==="string"
?
params.id
:
""



const {
 language
}=useAppPreferences()


const isDe =
language==="de"



const {
 lead,
 activities,
 loading,
 refresh

}=useLeadDetail(id)



const {
 saveLead,
 deleteLead

}=useLeadActions(refresh)



const {
 tasks,
 addTask,
 toggleTask,
 deleteTask

}=useTasks(id)



const [activeTab,setActiveTab]=
useState<Tab>("overview")





if(loading){

return (

<div
className="
rounded-3xl
border
border-border-subtle
bg-surface-1
p-8
"
>

Loading...

</div>

)

}



if(!lead){

return (

<div
className="
rounded-3xl
border
border-border-subtle
bg-surface-1
p-10
text-center
"
>

<h1 className="text-xl font-semibold">

{
isDe
?
"Lead nicht gefunden"
:
"Lead not found"
}

</h1>

</div>

)

}



const score =
calculateSalesScore(
lead,
getStaleDays(lead)
)



async function handleDelete(){

  if (!lead)
    return


  const ok =
    window.confirm(
      isDe
      ?
      "Lead löschen?"
      :
      "Delete lead?"
    )


  if(!ok)
    return


  try{

    await deleteLead(
      lead.id
    )


    toast.success(
      isDe
      ?
      "Lead gelöscht"
      :
      "Lead deleted"
    )


    router.push("/leads")

    } catch(error){

    console.error(error)

    toast.error(
      isDe
      ?
      "Lead konnte nicht gelöscht werden"
      :
      "Could not delete lead"
    )

  }

}




return (

<div
className="
mx-auto
max-w-[1200px]
space-y-6
"
>



<LeadHeader

lead={lead}

isDe={isDe}

onDelete={handleDelete}

/>




{
activeTab==="overview"
&&

<PipelineJourney
status={lead.status}
/>

}



<LeadTabs

active={activeTab}

setActive={setActiveTab}

isDe={isDe}

/>





{
activeTab==="overview"
&&

<>


<LeadOverview

lead={lead}

isDe={isDe}

/>



<DealMetrics

dealAge={
Math.floor(
(
Date.now()
-
new Date(
lead.created_at
).getTime()
)
/
86400000
)
}

priorityScore={
score.priority
}

healthScore={
score.health
}

value={
lead.value
}

stageAge={0}

/>



<AILeadSummary
lead={lead}
/>



<LeadDetailsForm

lead={lead}

saveLead={saveLead}

isDe={isDe}

/>


</>

}





{
activeTab==="activities"

&&

<ActivityTimeline

activities={activities}

/>

}




{
activeTab==="tasks"

&&

<LeadTasks

tasks={tasks}

addTask={addTask}

toggleTask={toggleTask}

deleteTask={deleteTask}

isDe={isDe}

/>

}




{
activeTab==="notes"

&&

<LeadNotes

lead={lead}

saveLead={saveLead}

isDe={isDe}

/>

}




{
activeTab==="meetings"

&&

<LeadMeetings

leadId={lead.id}

isDe={isDe}

/>

}



</div>

)

}