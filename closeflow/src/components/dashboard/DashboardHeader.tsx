type DashboardHeaderProps = {
  forecast: number
}

export default function DashboardHeader({
  forecast,
}: DashboardHeaderProps) {

  return (

    <section className="
      rounded-2xl
      border
      border-white/10
      bg-gradient-to-br
      from-[#111]
      via-[#111]
      to-cyan-500/10
      p-6
    ">


      <div className="
        flex
        flex-col
        gap-6
        xl:flex-row
        xl:items-center
        xl:justify-between
      ">


        <div className="max-w-3xl">


          <div className="flex items-center gap-3">

            <span className="
              rounded-full
              border
              border-cyan-500/20
              bg-cyan-500/10
              px-3
              py-1
              text-xs
              font-semibold
              text-cyan-300
            ">
              🤖 AI CRM Command Center
            </span>


            <span className="
              rounded-full
              border
              border-emerald-500/20
              bg-emerald-500/10
              px-3
              py-1
              text-xs
              text-emerald-300
            ">
              System healthy
            </span>


          </div>



          <h1 className="
            mt-4
            text-3xl
            font-bold
            text-white
            md:text-4xl
          ">
            Sales intelligence dashboard
          </h1>



          <p className="
            mt-3
            text-zinc-400
            max-w-2xl
          ">
            Track pipeline health, predict revenue,
            and identify the opportunities that need
            attention before they go cold.
          </p>


        </div>




        <div className="
          rounded-2xl
          border
          border-cyan-500/20
          bg-cyan-500/10
          p-5
          min-w-[240px]
        ">


          <p className="text-sm text-cyan-300">
            AI revenue forecast
          </p>


          <p className="
            mt-2
            text-4xl
            font-bold
            text-white
          ">
            €{Math.round(forecast).toLocaleString("de-DE")}
          </p>


          <p className="
            mt-2
            text-sm
            text-emerald-300
          ">
            ↑ Predicted pipeline outcome
          </p>


        </div>


      </div>


    </section>

  )
}