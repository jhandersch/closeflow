import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"



export async function GET(
  request: Request
){

  const { supabase, user, error } = await getRouteUser(request)


  if(error || !user){

    return NextResponse.json(
      {
        error:"Unauthorized"
      },
      {
        status:401
      }
    )

  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)
  if (!workspace?.id) {
    return NextResponse.json({ leads: [], tasks: [], pages: [] })
  }



  const {
    searchParams
  } =
    new URL(request.url)



  const query =
    searchParams
      .get("q")
      ?.trim()



  if(!query || query.length < 2){

    return NextResponse.json({

      leads:[],
      tasks:[],
      pages:[]

    })

  }





  /*
    Leads Suche
  */


  const {
    data:leadData
  } =
    await supabase
      .from("leads")
      .select(
        `
        id,
        name,
        company,
        email,
        phone
        `
      )
      .eq(
        "workspace_id",
        workspace.id
      )
      .is(
        "deleted_at",
        null
      )
      .or(
        `
        name.ilike.%${query}%,
        company.ilike.%${query}%,
        email.ilike.%${query}%,
        phone.ilike.%${query}%
        `
      )
      .limit(10)



  const leads =
    (leadData ?? [])
      .map(
        (lead)=>({

          id:lead.id,

          title:
            lead.name ||
            "Unbekannter Lead",

          subtitle:
            lead.company ||
            lead.email ||
            lead.phone ||
            "",

          href:
            `/leads/${lead.id}`

        })
      )





  /*
    Aufgaben Suche
  */


  const {
    data:taskData
  } =
    await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        lead_id
        `
      )
      .eq(
        "workspace_id",
        workspace.id
      )
      .ilike(
        "title",
        `%${query}%`
      )
      .limit(10)



  const tasks =
    (taskData ?? [])
      .map(
        (task)=>({

          id:task.id,

          title:
            task.title,

          subtitle:
            "Aufgabe",

          href:
            `/leads/${task.lead_id}`

        })
      )





  /*
    Statische Seiten
  */


  const pages = [

    {
      id:"dashboard",
      title:"Dashboard",
      href:"/dashboard"
    },

    {
      id:"leads",
      title:"Leads",
      href:"/leads"
    },

    {
      id:"customers",
      title:"Kunden",
      href:"/customers"
    },

    {
      id:"pipeline",
      title:"Pipeline",
      href:"/pipeline"
    },

    {
      id:"calendar",
      title:"Kalender",
      href:"/calendar"
    },

    {
      id:"analytics",
      title:"Analytics",
      href:"/analytics"
    },

    {
      id:"settings",
      title:"Einstellungen",
      href:"/settings"
    },

    {
      id:"billing",
      title:"Abrechnung",
      href:"/billing"
    },

    {
      id:"admin",
      title:"Admin",
      href:"/admin"
    },

  ]
    .filter(
      page =>
        page.title
          .toLowerCase()
          .includes(
            query.toLowerCase()
          )
    )
    .map(
      page=>({

        id:page.id,

        title:page.title,

        subtitle:"Seite",

        href:page.href

      })
    )






  return NextResponse.json({

    leads,

    tasks,

    pages

  })

}