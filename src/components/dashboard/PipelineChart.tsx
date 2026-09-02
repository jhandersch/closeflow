"use client"

import Link from "next/link"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts"

import { useAppPreferences } from "@/components/AppPreferencesProvider"


type PipelineChartProps = {
  data: Array<{
    name: string
    value: number
  }>
}



const stageColors: Record<string,string> = {

  New:"#38bdf8",

  Contacted:"#facc15",

  Proposal:"#fb923c",

  Won:"#34d399",

  Lost:"#f87171",

}



export default function PipelineChart({
  data,
}: PipelineChartProps) {


  const { t } = useAppPreferences()



  const stageLabels: Record<string,string> = {

    New: t(
      "pipeline.new",
      "New"
    ),

    Contacted: t(
      "pipeline.contacted",
      "Contacted"
    ),

    Proposal: t(
      "pipeline.proposal",
      "Proposal"
    ),

    Won: t(
      "pipeline.won",
      "Won"
    ),

    Lost: t(
      "pipeline.lost",
      "Lost"
    ),

  }



  const translatedData = data.map((item)=>({
    ...item,
    name:
      stageLabels[item.name] ??
      item.name
  }))



  return (

    <section
      className="
        rounded-2xl
        border
        border-border-subtle
        bg-surface-1
        p-6
      "
    >


      <div className="flex items-center justify-between">


        <div>

          <p
            className="
            text-sm
            text-foreground/65
            "
          >
            {t(
              "dashboard.pipelineOverview",
              "Pipeline overview"
            )}
          </p>


          <h2
            className="
            text-lg
            font-semibold
            text-foreground
            "
          >
            {t(
              "dashboard.dealDistribution",
              "Deal distribution"
            )}
          </h2>

        </div>




        <div
          className="
          rounded-full
          border
          border-blue-500/20
          bg-blue-500/10
          px-3
          py-1
          text-sm
          text-blue-300
          "
        >

          <Link
            href="/pipeline"
            className="hover:underline"
          >
            {t(
              "dashboard.openPipeline",
              "Open pipeline"
            )}
          </Link>

        </div>


      </div>





      <div
        className="
        mt-6
        h-72
        "
      >


        <ResponsiveContainer
          width="100%"
          height="100%"
        >


          <BarChart
            data={translatedData}
            layout="vertical"
          >


            <CartesianGrid
              stroke="currentColor"
              opacity={0.08}
              horizontal={false}
            />



            <XAxis
              type="number"
              stroke="currentColor"
              opacity={0.5}
              tickLine={false}
            />



            <YAxis
              dataKey="name"
              type="category"
              stroke="currentColor"
              opacity={0.5}
              width={90}
              tickLine={false}
            />




            <Tooltip

              contentStyle={{
                background:"var(--surface-1)",
                border:"1px solid var(--border-subtle)",
                borderRadius:"12px",
              }}

              formatter={(value) => [
                `${value} ${t("dashboard.deals", "deals")}`,
                t("dashboard.deals", "Deals"),
              ]}

            />





            <Bar

              dataKey="value"

              radius={[
                0,
                8,
                8,
                0
              ]}

              animationDuration={1000}

            >

              {
                translatedData.map((entry,index)=>(

                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={
                      stageColors[data[index]?.name] ??
                      "#22d3ee"
                    }
                  />

                ))
              }


            </Bar>


          </BarChart>


        </ResponsiveContainer>


      </div>


    </section>

  )
}