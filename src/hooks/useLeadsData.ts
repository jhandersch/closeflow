import { useCallback, useEffect, useState } from "react"
import type { Activity, Lead } from "@/types"


type UseLeadsDataOptions = {
  activityLimit?: number
}



export function useLeadsData(
  {
    activityLimit = 6,
  }: UseLeadsDataOptions = {}
) {

  const [leads, setLeads] =
    useState<Lead[]>([])


  const [activities, setActivities] =
    useState<Activity[]>([])


  const [loading, setLoading] =
    useState(true)


  const [error, setError] =
    useState<string | null>(null)





  const load = useCallback(
    async () => {

      setLoading(true)
      setError(null)


      try {


        const [
          leadsResponse,
          activityResponse
        ] =
        await Promise.all([


          fetch(
            "/api/leads"
          ),


          fetch(
            `/api/activity?filter=month&limit=${activityLimit}`
          ),


        ])





        const leadsJson =
          await leadsResponse.json()


        const activityJson =
          await activityResponse.json()





        if(!leadsResponse.ok){

          throw new Error(
            leadsJson.error ||
            "Failed loading leads"
          )

        }




        if(!activityResponse.ok){

          throw new Error(
            activityJson.error ||
            "Failed loading activities"
          )

        }





        const activityData =
          Array.isArray(activityJson)
            ? activityJson.slice(
                0,
                activityLimit
              )
            : []






        setLeads(
          Array.isArray(leadsJson)
            ? leadsJson as Lead[]
            : leadsJson.leads ?? []
        )



        setActivities(
          (activityData as Activity[]) || []
        )



      }
      catch(error){


        console.error(
          "DASHBOARD DATA ERROR:",
          error
        )


        setError(
          error instanceof Error
            ? error.message
            : "Unknown error"
        )


        setLeads([])
        setActivities([])


      }
      finally{

        setLoading(false)

      }


    },
    [
      activityLimit
    ]
  )





  useEffect(
    () => {

      void load()

    },
    [
      load
    ]
  )





  return {

    leads,

    activities,

    loading,

    error,

    refresh: load,

  }

}


export type {
  Lead,
  Activity,
}