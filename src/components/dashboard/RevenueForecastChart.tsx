"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts"


type RevenueForecastChartProps = {
  data: Array<{
    month: string
    value: number
  }>
}


export default function RevenueForecastChart({
  data,
}: RevenueForecastChartProps) {


  return (

    <section className="
      rounded-2xl
      border
      border-border-subtle
      bg-surface-1
      p-6
    ">


      <div className="
        flex
        items-center
        justify-between
      ">


        <div>

          <p className="text-sm text-foreground/65">
            Revenue intelligence
          </p>


          <h2 className="
            text-lg
            font-semibold
            text-foreground
          ">
            Forecast momentum
          </h2>


        </div>



        <div className="
          rounded-full
          border
          border-emerald-500/20
          bg-emerald-500/10
          px-3
          py-1
          text-sm
          text-emerald-300
        ">
          AI predicted
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

          <AreaChart data={data}>


            <defs>

              <linearGradient
                id="revenueGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >

                <stop
                  offset="0%"
                  stopColor="#22d3ee"
                  stopOpacity={0.35}
                />

                <stop
                  offset="100%"
                  stopColor="#22d3ee"
                  stopOpacity={0}
                />

              </linearGradient>


            </defs>



            <CartesianGrid
              stroke="#27272a"
              vertical={false}
            />


            <XAxis
              dataKey="month"
              stroke="#71717a"
              tickLine={false}
            />


            <YAxis
              stroke="#71717a"
              tickLine={false}
              tickFormatter={(value)=>`â‚¬${value / 1000}k`}
            />



            <Tooltip

              contentStyle={{
                background:"#09090b",
                border:"1px solid #27272a",
                borderRadius:"12px",
              }}

              formatter={(value)=>[
                `â‚¬${Number(value ?? 0).toLocaleString("de-DE")}`,
                "Forecast"
              ]}

            />



            <Area

              type="monotone"

              dataKey="value"

              stroke="#22d3ee"

              strokeWidth={3}

              fill="url(#revenueGradient)"

              animationDuration={1200}

            />


          </AreaChart>


        </ResponsiveContainer>


      </div>



    </section>

  )
}
