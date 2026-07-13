"use client"

import { useEffect, useState } from "react"

type ActivityInsight = {
  health: string
  risk: string
  summary: string
  recommendation: string
  confidence: number
}


export function useActivityAI(
  lead:any,
  activities:any[],
  language: "de" | "en" = "de"
){

  const [insight,setInsight] = useState<ActivityInsight | null>(null)
  const [loading,setLoading] = useState(false)


  useEffect(()=>{

    if(!lead) return


    async function analyze(){

      setLoading(true)


      try{

        const response = await fetch(
          "/api/activity-ai",
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json"
            },
            body:JSON.stringify({
              lead,
              activities,
              language,
            })
          }
        )


        const data = await response.json()

        setInsight(data)


      }catch(error){

        console.error(error)

      }


      setLoading(false)

    }


    analyze()


  },[activities, language, lead])


  return {
    insight,
    loading
  }

}