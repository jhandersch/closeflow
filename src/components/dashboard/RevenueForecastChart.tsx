"use client"

import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts"

import { useAppPreferences } from "@/components/AppPreferencesProvider"


type RevenueForecastChartProps = {
  data: Array<{
    month: string
    value: number
  }>
}



export default function RevenueForecastChart({
  data,
}: RevenueForecastChartProps) {


  const { t, language } = useAppPreferences()
  const locale = language === "de" ? "de-DE" : "en-US"



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


      <div
        className="
        flex
        items-center
        justify-between
        "
      >


        <div>

          <p
            className="
            text-sm
            text-foreground/65
            "
          >
            {t(
              "dashboard.revenueIntelligence",
              "Revenue intelligence"
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
              "dashboard.forecastMomentum",
              "Forecast momentum"
            )}
          </h2>


        </div>





        <div
          className="
          rounded-full
          border
          border-emerald-500/20
          bg-emerald-500/10
          px-3
          py-1
          text-sm
          text-emerald-300
          "
        >
          {t(
            "dashboard.aiPredicted",
            "AI predicted"
          )}
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
              stroke="currentColor"
              opacity={0.08}
              vertical={false}
            />





            <XAxis
              dataKey="month"
              stroke="currentColor"
              opacity={0.5}
              tickLine={false}
            />





            <YAxis
              stroke="currentColor"
              opacity={0.5}
              tickLine={false}
              tickFormatter={(value)=>`€${value / 1000}k`}
            />






            <Tooltip

              contentStyle={{
                background:"var(--surface-1)",
                border:"1px solid var(--border-subtle)",
                borderRadius:"12px",
              }}


              formatter={(value)=>[
                `€${Number(value ?? 0).toLocaleString(locale)}`,
                t(
                  "dashboard.forecastRevenue",
                  "Forecast Revenue"
                )
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