import { useAppPreferences } from "@/components/AppPreferencesProvider"

type EngagementCardProps = {
  contactedCount: number
  proposalCount: number
  forecastDelta: number
}


export default function EngagementCard({
  contactedCount,
  proposalCount,
  forecastDelta,
}: EngagementCardProps) {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"


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


      <div>

        <p className="text-sm text-foreground/65">
          {isDe ? "Sales-Engagement" : "Sales Engagement"}
        </p>

          {isDe ? "Kundenmomentum" : "Customer momentum"}
        <h2 className="
          text-lg
          font-semibold
          text-foreground
        ">
          Customer momentum
        </h2>

      </div>




      <div className="mt-5 space-y-3">



        <div
          className="
          rounded-xl
          border
          border-orange-500/20
          bg-orange-500/10
          p-4
          "
        >

          <div className="flex items-center gap-3">

            <span className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-orange-500/20
            ">
              📞
            </span>


            <div>

              <p className="text-sm text-orange-300">
                {isDe ? "Follow-up erforderlich" : "Follow-up required"}
              </p>


              <p className="
                mt-1
                text-xl
                font-bold
                text-foreground
              ">
                {contactedCount}
              </p>

            </div>


          </div>


          <p className="
            mt-3
            text-sm
            text-foreground/70
          ">
            {isDe
              ? "Leads wurden kontaktiert, warten aber auf die nächste Sales-Aktion."
              : "Leads contacted but waiting for the next sales action."}
          </p>


        </div>





        <div
          className="
          rounded-xl
          border
          border-cyan-500/20
          bg-cyan-500/10
          p-4
          "
        >

          <div className="flex items-center gap-3">


            <span className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-cyan-500/20
            ">
              📄
            </span>


            <div>

              <p className="text-sm text-cyan-300">
                {isDe ? "Angebots-Chancen" : "Proposal opportunities"}
              </p>


              <p className="
                mt-1
                text-xl
                font-bold
                text-foreground
              ">
                {proposalCount}
              </p>

            </div>


          </div>



          <p className="
            mt-3
            text-sm
            text-foreground/70
          ">
            {isDe ? "Deals, die aktuell am nächsten am Abschluss sind." : "Deals currently closest to conversion."}
          </p>


        </div>





        <div
          className="
          rounded-xl
          border
          border-emerald-500/20
          bg-emerald-500/10
          p-4
          "
        >

          <div className="flex items-center gap-3">


            <span
              className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-emerald-500/20
              "
            >
              📈
            </span>



            <div>


              <p className="text-sm text-emerald-300">
                {isDe ? "Umsatzpotenzial" : "Revenue upside"}
              </p>


              <p className="
                mt-1
                text-xl
                font-bold
                text-foreground
              ">
                €{forecastDelta.toLocaleString(locale)}
              </p>


            </div>


          </div>




          <p className="
            mt-3
            text-sm
            text-foreground/70
          ">
            {isDe
              ? "Zusaetzlicher prognostizierter Umsatz im Vergleich zu bereits abgeschlossenen Deals."
              : "Additional forecasted revenue compared to closed deals."}
          </p>


        </div>



      </div>


    </section>

  )
}
