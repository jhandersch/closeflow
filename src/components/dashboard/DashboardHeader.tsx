import Link from "next/link"

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
      border-border-subtle
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

            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              Control Center
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
            text-foreground
            md:text-4xl
          ">
            Good morning, Jan
          </h1>



          <p className="
            mt-3
            text-foreground/65
            max-w-2xl
          ">
            Here is your sales overview.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/leads" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90">
              New Lead
            </Link>
            <Link href="/ai" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20">
              Ask AI
            </Link>
          </div>


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
            text-foreground
          ">
            â‚¬{Math.round(forecast).toLocaleString("de-DE")}
          </p>


          <p className="
            mt-2
            text-sm
            text-emerald-300
          ">
            Predicted pipeline outcome
          </p>


        </div>


      </div>


    </section>

  )
}
