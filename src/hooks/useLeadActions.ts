import { supabase } from "@/lib/supabase/client"


type UpdateLeadData = {
  name: string
  company: string
  status: string
  value: number
  notes: string
}


export function useLeadActions(
  refresh: () => Promise<void>
) {


  async function saveLead(
    leadId: string,
    oldStatus: string,
    data: UpdateLeadData
  ) {


    const updateData: any = {
      ...data,
    }


    if (oldStatus !== data.status) {

      updateData.stage_changed_at =
        new Date().toISOString()

    }


    const { error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)



    if (error) {
      throw error
    }



    if (oldStatus !== data.status) {


      const { data: userData } =
        await supabase.auth.getUser()


      const user = userData.user


      if (user) {

        await supabase
          .from("activities")
          .insert([
            {
              lead_id: leadId,
              user_id: user.id,
              action:
                `Status changed from ${oldStatus} to ${data.status}`,
              type: "status",
            },
          ])

      }

    }


    await refresh()

  }



  async function deleteLead(
    leadId: string
  ) {


    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)


    if (error) {
      throw error
    }

  }



  return {
    saveLead,
    deleteLead,
  }

}