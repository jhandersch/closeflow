"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

const DASHBOARD_NAME_CACHE_KEY = "closeflow_dashboard_name"

type DashboardHeaderProps = {
  forecast: number
  userName?: string
  totalLeads: number
  pipelineValue: number
  attentionCount: number
}


export default function DashboardHeader({
  forecast,
  userName,
  totalLeads,
  pipelineValue,
  attentionCount,
}: DashboardHeaderProps) {

  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      const cachedName = window.localStorage.getItem(DASHBOARD_NAME_CACHE_KEY)?.trim()
      if (cachedName) {
        return cachedName
      }
    }

    return userName?.trim() || ""
  })
  const { t, language } = useAppPreferences()

  const locale = language === "de" ? "de-DE" : "en-US"
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? "dashboard.goodMorning" : hour < 18 ? "dashboard.goodAfternoon" : "dashboard.goodEvening"
  const displayName = name.trim()
  const greeting = displayName
    ? `${t(greetingKey, "Good morning")}, ${displayName}`
    : t(greetingKey, "Good morning")



  useEffect(() => {

    const loadUser = async () => {

      const { data } = await supabase.auth.getUser()

      const user = data.user

      if (user) {

        const metadataName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name

        if(metadataName){
          setName(metadataName)
          window.localStorage.setItem(DASHBOARD_NAME_CACHE_KEY, metadataName)
        }
        else if(user.email){
          const fallbackName = user.email.split("@")[0]
          setName(fallbackName)
          window.localStorage.setItem(DASHBOARD_NAME_CACHE_KEY, fallbackName)
        }

      }

    }


    loadUser()


  }, [])



  return (

    <section
      className="
      rounded-2xl
      border
      border-border-subtle
      bg-gradient-to-br
      from-[#111]
      via-[#111]
      to-cyan-500/10
      p-6
      "
    >

      <div
        className="
        flex
        flex-col
        gap-6
        xl:flex-row
        xl:items-center
        xl:justify-between
        "
      >


        <div className="max-w-3xl">


          <div className="flex items-center gap-3">


            <span
              className="
              rounded-full
              border
              border-cyan-500/20
              bg-cyan-500/10
              px-3
              py-1
              text-xs
              font-semibold
              text-cyan-300
              "
            >
              {t("dashboard.salesControlCenter", "Sales Control Center")}
            </span>


            <span
              className="
              rounded-full
              border
              border-emerald-500/20
              bg-emerald-500/10
              px-3
              py-1
              text-xs
              text-emerald-300
              "
            >
              ✓ {t("dashboard.systemHealthy", "System healthy")}
            </span>


          </div>



          <h1
            className="
            mt-4
            text-3xl
            font-bold
            text-foreground
            md:text-4xl
            "
          >
            {greeting}
          </h1>



          <p
            className="
            mt-3
            text-foreground/65
            max-w-2xl
            "
          >
            {t(
              "dashboard.salesOverview",
              "Your sales overview and AI recommendations for today."
            )}
          </p>



          <div className="mt-5 grid gap-3 sm:grid-cols-3">


            <div className="cf-card-soft p-3">

              <p className="cf-label">
                {t("dashboard.activeLeads", "Active leads")}
              </p>

              <p className="mt-1 text-xl font-bold text-foreground">
                {totalLeads}
              </p>

            </div>


            <div className="cf-card-soft p-3">

              <p className="cf-label">
                {t("dashboard.pipeline", "Pipeline")}
              </p>

              <p className="mt-1 text-xl font-bold text-foreground">
                €{pipelineValue.toLocaleString(locale)}
              </p>

            </div>



            <div className="cf-card-soft p-3">

              <p className="cf-label">
                {t("dashboard.attention", "Attention")}
              </p>

              <p className="mt-1 text-xl font-bold text-foreground">
                {attentionCount}
              </p>

            </div>


          </div>



          <div className="mt-5 flex flex-wrap gap-3">

            <Link
              href="/leads"
              className="
              rounded-xl
              bg-white
              px-4
              py-2
              text-sm
              font-semibold
              text-black
              transition
              hover:opacity-90
              "
            >
              {t("dashboard.newLead", "New Lead")}
            </Link>


            <Link
              href="/ai"
              className="
              rounded-xl
              border
              border-cyan-500/30
              bg-cyan-500/10
              px-4
              py-2
              text-sm
              font-semibold
              text-cyan-300
              transition
              hover:bg-cyan-500/20
              "
            >
              {t("dashboard.askAI", "Ask AI")}
            </Link>


          </div>


        </div>




        <div
          className="
          rounded-2xl
          border
          border-cyan-500/20
          bg-cyan-500/10
          p-5
          min-w-[240px]
          "
        >

          <p className="text-sm text-cyan-300">
            {t("dashboard.aiRevenueForecast", "AI revenue forecast")}
          </p>


          <p
            className="
            mt-2
            text-4xl
            font-bold
            text-foreground
            "
          >
            €{Math.round(forecast).toLocaleString(locale)}
          </p>


          <p className="mt-2 text-sm text-emerald-300">
            {t(
              "dashboard.predictedPipelineOutcome",
              "Predicted pipeline outcome"
              )}
          </p>


        </div>


      </div>


    </section>

  )
}