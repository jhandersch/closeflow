import { NextResponse } from "next/server"
import {
  getRouteUser,
  loadWorkspaceForUser,
} from "@/lib/supabase/route"


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





    /*
      Neues Activity Event
      nur bei echtem Statuswechsel
    */

    if(
      updates.status &&
      oldLead.status !== updates.status
    ){


      const {
        error:activityError
      } =
        await supabase
          .from("activities")
          .insert({

            lead_id:id,

            workspace_id:
              workspace.id,

            user_id:
              user.id,

            type:
              "status_changed",

            action:
              "status_changed",

            metadata:{

              from:
                oldLead.status,

              to:
                updates.status

            }

          })



      if(activityError){

        console.error(
          "CREATE ACTIVITY ERROR:",
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
      error
    } =
      await supabase
        .from("leads")
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "workspace_id",
          workspace.id
        )




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





    return NextResponse.json(
      {
        success:true
      }
    )



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
