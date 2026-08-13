import { NextResponse } from "next/server"
import {
  getRouteUser,
  loadWorkspaceForUser,
} from "@/lib/supabase/route"
import { runLeadAutomation } from "@/lib/automation"
import type { Lead } from "@/types"


export async function GET(req: Request) {

  try {

    const {
      supabase,
      user,
      error: authError
    } = await getRouteUser(req)


    if (authError || !user) {

      return NextResponse.json(
        {
          error: "Unauthorized"
        },
        {
          status: 401
        }
      )

    }


    const {
      workspace
    } = await loadWorkspaceForUser(
      supabase,
      user.id
    )




    if (!workspace?.id) {

      return NextResponse.json(
        {
          error: "Workspace required"
        },
        {
          status: 403
        }
      )

    }


    const {
      data,
      error
    } =
      await supabase
        .from("leads")
        .select("*")
        .eq(
          "workspace_id",
          workspace.id
        )
        .is(
          "deleted_at",
          null
        )
        .order(
          "created_at",
          {
            ascending:false
          }
        )


    if (error) {

      return NextResponse.json(
        {
          error:error.message
        },
        {
          status:500
        }
      )

    }


    return NextResponse.json(data)


  }
  catch(error){

    console.error(
      "GET LEADS ERROR:",
      error
    )


    return NextResponse.json(
      {
        error:"Internal Server Error"
      },
      {
        status:500
      }
    )

  }

}






export async function POST(req: Request) {

  try {


    const {
      supabase,
      user,
      error:authError
    } =
      await getRouteUser(req)


    if(authError || !user){

      return NextResponse.json(
        {
          error:"Unauthorized"
        },
        {
          status:401
        }
      )

    }


    const body =
      await req.json()

      



    const {
      workspace
    } =
      await loadWorkspaceForUser(
        supabase,
        user.id
      )

          console.log("=== CREATE LEAD DEBUG ===")
    console.log("User:", user.id)
    console.log("Workspace:", workspace)
    console.log("Workspace ID:", workspace?.id)
    console.log("Body:", body)



    if(!workspace?.id){

      return NextResponse.json(
        {
          error:"Workspace required"
        },
        {
          status:403
        }
      )

    }



    const {
      data,
      error
    } =
      await supabase
        .from("leads")
        .insert({

          ...body,

          workspace_id:
            workspace.id,

          user_id:
            user.id

        })
        .select()
        .single()



    if(error){

      console.error(
        "POST LEAD ERROR:",
        error
      )


      return NextResponse.json(
        {
          error:error.message
        },
        {
          status:500
        }
      )

    }

    await supabase
      .from("activities")
      .insert({
        workspace_id: workspace.id,
        lead_id: data.id,
        user_id: user.id,
        type: "created",
        action: "lead_created",
        title: "Lead created",
        description: `${data.name} was added`
      })



    return NextResponse.json(data)


  }
  catch(error){

    console.error(
      "POST CRASH:",
      error
    )


    return NextResponse.json(
      {
        error:"Internal Server Error"
      },
      {
        status:500
      }
    )

  }

}
export async function PUT(req: Request) {

  try {

    const {
      supabase,
      user,
      error:authError
    } =
      await getRouteUser(req)



    if(authError || !user){

      return NextResponse.json(
        {
          error:"Unauthorized"
        },
        {
          status:401
        }
      )

    }



    const body =
      await req.json()



    const {
  id,
  ...updates
} = body


if(updates.status){

  updates.stage_changed_at =
    new Date().toISOString()

  updates.last_activity_at =
    new Date().toISOString()

}



    if(!id){

      return NextResponse.json(
        {
          error:"Missing lead id"
        },
        {
          status:400
        }
      )

    }




    const {
      workspace
    } =
      await loadWorkspaceForUser(
        supabase,
        user.id
      )



    if(!workspace?.id){

      return NextResponse.json(
        {
          error:"Workspace required"
        },
        {
          status:403
        }
      )

    }




    /*
      Alten Lead Status holen,
      damit wir die Änderung speichern können
    */

    const {
      data:oldLead,
      error:oldLeadError
    } =
      await supabase
        .from("leads")
        .select(
          "id,status"
        )
        .eq(
          "id",
          id
        )
        .eq(
          "workspace_id",
          workspace.id
        )
        .is(
          "deleted_at",
          null
        )
        .single()



    if(oldLeadError){

      console.error(
        "GET OLD LEAD ERROR:",
        oldLeadError
      )


      return NextResponse.json(
        {
          error:oldLeadError.message
        },
        {
          status:500
        }
      )

    }





    /*
      Lead aktualisieren
    */

    const {
      data,
      error
    } =
      await supabase
        .from("leads")
        .update(updates)
        .eq(
          "id",
          id
        )
        .eq(
          "workspace_id",
          workspace.id
        )
        .is(
          "deleted_at",
          null
        )
        .select()
        .maybeSingle()

        if(!data){

  return NextResponse.json(
    {
      error:"Lead not found or update blocked"
    },
    {
      status:404
    }
  )

}



    if(error){

      console.error(
        "UPDATE LEAD ERROR:",
        error
      )


      return NextResponse.json(
        {
          error:error.message
        },
        {
          status:500
        }
      )

    }

    if (
  updates.status &&
  oldLead.status !== updates.status
) {

  try {

    const updatedLead = {
      ...data,
      status: updates.status,
    } as Lead


    await runLeadAutomation(
      supabase,
      user.id,
      workspace.id,
      updatedLead,
      oldLead.status
    )

    console.log(
      "Lead automation executed"
    )


  } catch(error){

    console.error(
      "Lead automation failed:",
      error
    )

  }

}



/*
  Activity Events
*/

const statusChanged =
  updates.status &&
  oldLead.status !== updates.status

/*
  Statuswechsel:
  genau eine Activity für die Statusänderung
*/
if (statusChanged) {
  const { error: activityError } = await supabase
    .from("activities")
    .insert({
      lead_id: id,
      workspace_id: workspace.id,
      user_id: user.id,
      type: "status_changed",
      action: `Status changed from ${oldLead.status} to ${updates.status}`,
      title: `Status changed from ${oldLead.status} to ${updates.status}`,
      description: `Lead moved from ${oldLead.status} to ${updates.status}`,
      metadata: {
        previous_status: oldLead.status,
        next_status: updates.status,
        trigger: "lead_actions",
      },
    })

  if (activityError) {
    console.error(
      "CREATE STATUS ACTIVITY ERROR:",
      activityError
    )
  }
}

/*
  Normales Lead-Update:
  Eine Activity, wenn relevante Lead-Daten
  tatsächlich geändert wurden.

  Statuswechsel wird hier ausgeschlossen,
  damit kein zweiter Activity-Eintrag entsteht.
*/

const trackedFields = [
  "name",
  "company",
  "value",
  "notes",
  "source",
  "tags",
  "email",
  "phone",
  "address",
  "website",
]

const changedFields = trackedFields.filter(
  (field) =>
    Object.prototype.hasOwnProperty.call(updates, field)
)

if (!statusChanged && changedFields.length > 0) {
  const { error: activityError } = await supabase
    .from("activities")
    .insert({
      lead_id: id,
      workspace_id: workspace.id,
      user_id: user.id,
      type: "lead_updated",
      action: "lead_updated",
      title: "Lead updated",
      description: `Updated: ${changedFields.join(", ")}`,
      metadata: {
        changed_fields: changedFields,
        trigger: "lead_actions",
      },
    })

  if (activityError) {
    console.error(
      "CREATE UPDATE ACTIVITY ERROR:",
      activityError
    )
  }
}

return NextResponse.json(data)




  }
  catch(error){

  console.error(
    "PUT CRASH FULL:",
    error
  )


  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : String(error)
    },
    {
      status:500
    }
  )

}

}
export async function DELETE(req: Request) {

  try {


    const {
      supabase,
      user,
      error:authError
    } =
      await getRouteUser(req)



    if(authError || !user){

      return NextResponse.json(
        {
          error:"Unauthorized"
        },
        {
          status:401
        }
      )

    }




    const url =
      new URL(req.url)



    const id =
      url.searchParams.get("id")



    if(!id){

      return NextResponse.json(
        {
          error:"Missing id"
        },
        {
          status:400
        }
      )

    }





    const {
      workspace
    } =
      await loadWorkspaceForUser(
        supabase,
        user.id
      )



    if(!workspace?.id){

      return NextResponse.json(
        {
          error:"Workspace required"
        },
        {
          status:403
        }
      )

    }





    const {
      data,
      error
    } =
      await supabase
        .from("leads")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq(
          "id",
          id
        )
        .eq(
          "workspace_id",
          workspace.id
        )
        .is(
          "deleted_at",
          null
        )
        .select("id")
        .maybeSingle()




    if(error){

      console.error(
        "DELETE LEAD ERROR:",
        error
      )


      return NextResponse.json(
        {
          error:error.message
        },
        {
          status:500
        }
      )

    }





    if(!data){
      return NextResponse.json(
        {
          error:"Lead not found"
        },
        {
          status:404
        }
      )
    }

    return NextResponse.json({
      success:true
    })



  }
  catch(error){

    console.error(
      "DELETE CRASH:",
      error
    )


    return NextResponse.json(
      {
        error:"Internal Server Error"
      },
      {
        status:500
      }
    )

  }

}
