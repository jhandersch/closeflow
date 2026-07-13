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


type PipelineChartProps = {
  data: Array<{
    name: string
    value: number
  }>
}


const stageColors: Record<string, string> = {
  New: "#38bdf8",
  Contacted: "#facc15",
  Proposal: "#fb923c",
  Won: "#34d399",
}



export default function PipelineChart({
  data,
}: PipelineChartProps) {


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

          <p className="text-sm text-foreground/65">
            Pipeline overview
          </p>

          <h2 className="
            text-lg
            font-semibold
            text-foreground
          ">
            Deal distribution
          </h2>

        </div>


        <div className="
          rounded-full
          border
          border-blue-500/20
          bg-blue-500/10
          px-3
          py-1
          text-sm
          text-blue-300
        ">
          <Link href="/pipeline" className="hover:underline">
            Open pipeline
          </Link>
        </div>


      </div>




      <div className="
        mt-6
        h-72
      ">


        <ResponsiveContainer
          width="100%"
          height="100%"
        >


          <BarChart
            data={data}
            layout="vertical"
          >


            <CartesianGrid
              stroke="#27272a"
              horizontal={false}
            />



            <XAxis
              type="number"
              stroke="#71717a"
              tickLine={false}
            />


            <YAxis
              dataKey="name"
              type="category"
              stroke="#71717a"
              width={90}
              tickLine={false}
            />



            <Tooltip

              contentStyle={{
                background:"#09090b",
                border:"1px solid #27272a",
                borderRadius:"12px",
              }}

              formatter={(value)=>[
                `${value} deals`,
                "Pipeline"
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
                  data.map((entry, index)=>(
                  <Cell
                   key={`${entry.name}-${index}`}
                    fill={
                      stageColors[entry.name] ??
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
