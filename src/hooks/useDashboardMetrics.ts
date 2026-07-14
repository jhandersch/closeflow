import { useMemo } from "react"
import { generateDashboardInsight } from "@/lib/openai"
import { analyzeLead, getHealthScore } from "@/lib/scoring"
import type { Lead } from "@/types"


const stageWeights: Record<string, number> = {
  new: 0.1,
  contacted: 0.3,
  qualified: 0.5,
  proposal: 0.7,
  won: 1,
  lost: 0,
}


const stageOrder = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const



const monthLabel = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    month: "short",
    year: "2-digit",
  })



const monthKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}`




export function useDashboardMetrics(leads: Lead[]) {


  return useMemo(() => {


    const total = leads.length


    const won =
      leads.filter(
        (lead)=>lead.status==="won"
      ).length


    const lost =
      leads.filter(
        (lead)=>lead.status==="lost"
      ).length



    const wonOrLost = won + lost




    const revenue =
      leads
      .filter(
        lead=>lead.status==="won"
      )
      .reduce(
        (sum,lead)=>
          sum + (lead.value || 0),
        0
      )





    const pipelineValue =
      leads
      .filter(
        lead =>
          lead.status !== "won" &&
          lead.status !== "lost"
      )
      .reduce(
        (sum,lead)=>
          sum + (lead.value || 0),
        0
      )





    const openPipeline =
      leads.filter(
        lead =>
          lead.status !== "won" &&
          lead.status !== "lost"
      ).length





    const forecast =
      leads
      .filter(
        lead =>
          lead.status !== "won" &&
          lead.status !== "lost"
      )
      .reduce(
        (sum,lead)=>{

          const weight =
            stageWeights[lead.status] || 0


          return (
            sum +
            (lead.value || 0) * weight
          )

        },
        0
      )





    const proposalLeads =
      leads.filter(
        lead =>
          lead.status==="proposal"
      )



    const contactedLeads =
      leads.filter(
        lead =>
          lead.status==="contacted"
      )



    const highValueDeals =
      leads.filter(
        lead =>
          (lead.value || 0) >= 5000
      )





    const atRiskDeals =
      leads
      .filter(
        lead =>
          getHealthScore(lead) < 50
      )
      .sort(
        (a,b)=>
          (b.value || 0) -
          (a.value || 0)
      )




    const healthyLeadCount =
      leads.filter(
        lead =>
          getHealthScore(lead) >= 70
      ).length





    const watchlistCount =
      Math.max(
        0,
        total -
        healthyLeadCount -
        atRiskDeals.length
      )





    const priorityDeals =
      [...leads]
      .filter(
        lead =>
          lead.status !== "won" &&
          lead.status !== "lost"
      )
      .map(
        lead => ({
          ...lead,
          analysis: analyzeLead(lead),
        })
      )
      .sort(
        (a,b)=>
          b.analysis.priority -
          a.analysis.priority
      )
      .slice(0,4)







    const stageCounts =
      stageOrder.map(stage => ({

        stage,

        count:
          leads.filter(
            lead =>
              lead.status===stage
          ).length,


        value:
          leads
          .filter(
            lead =>
              lead.status===stage
          )
          .reduce(
            (sum,lead)=>
              sum + (lead.value || 0),
            0
          ),

      }))






    const monthBuckets =
      Array.from(
        {length:6}
      )
      .map(
        (_,index)=>{

          const date = new Date()

          date.setMonth(
            date.getMonth() -
            (5-index)
          )


          return {

            key:
              monthKey(date),

            month:
              monthLabel(date),

            value:0,

          }

        }
      )






    const bucketMap =
      new Map(
        monthBuckets.map(
          bucket =>
            [
              bucket.key,
              bucket
            ]
        )
      )





    const wonLeads =
      leads.filter(
        lead =>
          lead.status==="won"
      )






    wonLeads.forEach(lead=>{

      const closeDate =
        new Date(
          lead.stage_changed_at ||
          lead.updated_at ||
          lead.created_at
        )


      const bucket =
        bucketMap.get(
          monthKey(closeDate)
        )


      if(bucket){

        bucket.value +=
          lead.value || 0

      }

    })






    const forecastTrend =
      monthBuckets.map(
        bucket => ({

          month:
            bucket.month,

          value:
            Math.round(
              bucket.value
            ),

        })
      )






    const statusChartData = [

      {
        name:"New",
        value:
          leads.filter(
            l=>l.status==="new"
          ).length,
      },


      {
        name:"Contacted",
        value:
          contactedLeads.length,
      },


      {
        name:"Qualified",
        value:
          leads.filter(
            l=>l.status==="qualified"
          ).length,
      },


      {
        name:"Proposal",
        value:
          proposalLeads.length,
      },


      {
        name:"Won",
        value:won,
      },


      {
        name:"Lost",
        value:lost,
      },

    ]







    const averageDealValue =
      won > 0
      ? Math.round(
          revenue / won
        )
      : total > 0
      ? Math.round(
          pipelineValue / total
        )
      : 0







    const wonCycleDays =
      wonLeads
      .map(
        lead=>{

          const created =
            new Date(
              lead.created_at
            ).getTime()


          const closed =
            new Date(
              lead.stage_changed_at ||
              lead.updated_at ||
              lead.created_at
            ).getTime()


          return Math.max(
            0,
            Math.round(
              (
                closed -
                created
              )
              /
              (
                1000 *
                60 *
                60 *
                24
              )
            )
          )

        }
      )






    const averageSalesCycle =
      wonCycleDays.length > 0
      ? Math.round(
          wonCycleDays.reduce(
            (a,b)=>a+b,
            0
          )
          /
          wonCycleDays.length
        )
      : 0






    const conversionRate =
      wonOrLost > 0
      ? Number(
          (
            (won /
            wonOrLost)
            *
            100
          )
          .toFixed(1)
        )
      : 0






    const pipelineCoverage =
      revenue > 0
      ? Number(
          (
            pipelineValue /
            revenue
          )
          .toFixed(1)
        )
      : 0






    const insight =
      generateDashboardInsight({

        leads,

        revenue,

        forecast,

        proposalLeads:
          proposalLeads.length,

        atRiskDeals:
          atRiskDeals.length,

        highValueDeals:
          highValueDeals.length,

      })







    return {

      total,

      won,

      lost,


      pipelineValue,

      openPipeline,


      revenue,

      forecast,


      proposalLeads,

      contactedLeads,

      highValueDeals,


      atRiskDeals,

      healthyLeadCount,

      watchlistCount,


      priorityDeals,


      forecastTrend,

      statusChartData,


      winRate:
        total > 0
        ? (
            (won /
            total)
            *
            100
          )
          .toFixed(1)
        : "0",


      conversionRate,


      wonLostLabel:
        `${won}/${lost}`,


      averageDealValue,


      averageSalesCycle,


      pipelineCoverage,


      forecastDelta:
        Math.max(
          0,
          Math.round(
            forecast -
            revenue
          )
        ),


      stageCounts,


      insight,


      currentMonthRevenue:
        forecastTrend[
          forecastTrend.length-1
        ]?.value || 0,

    }


  }, [leads])

}