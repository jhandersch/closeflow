import Link from "next/link"
import { ArrowRight, BarChart3, Brain, Compass, Sparkles, Users } from "lucide-react"

const features = [
  {
    title: "AI Lead Recommendations",
    description: "Spot the best next action for every opportunity with AI-guided prioritization.",
    icon: Brain,
  },
  {
    title: "Pipeline Intelligence",
    description: "Understand momentum, risk and opportunity health across the full pipeline.",
    icon: Compass,
  },
  {
    title: "Lead Memory",
    description: "Keep context, histories and follow-up intentions connected to each deal.",
    icon: Users,
  },
  {
    title: "Activity Intelligence",
    description: "Turn every interaction into a clear signal about what is driving progress.",
    icon: Sparkles,
  },
  {
    title: "Revenue Forecasting",
    description: "See expected revenue, weighted pipeline value and risk in one place.",
    icon: BarChart3,
  },
  {
    title: "Sales Analytics",
    description: "Track performance with a modern, executive-ready revenue view.",
    icon: BarChart3,
  },
]

const previews = [
  {
    title: "Executive dashboard",
    description: "A clear view of forecast, pipeline health and the next best actions.",
  },
  {
    title: "Lead detail workspace",
    description: "A focused place for context, score insights and follow-up planning.",
  },
  {
    title: "AI insight layer",
    description: "Revenue and activity intelligence that explain why momentum is changing.",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="text-xl font-semibold tracking-tight text-white">
          CloseFlow
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#product" className="transition hover:text-white">
            Product
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Pricing
          </a>
          <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/5 hover:text-white">
            Login
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-300">
              AI-powered CRM for modern sales teams
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              AI-powered CRM that helps sales teams close more deals
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              CloseFlow combines CRM, sales intelligence and AI recommendations to help teams understand what to do next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90">
                Start Free
              </Link>
              <a href="#product" className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-zinc-200 transition hover:bg-white/5">
                View Demo
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-zinc-500">
              <span>Built for B2B revenue teams</span>
              <span>•</span>
              <span>Faster follow-up and better forecasting</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#111] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/70 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Forecast outlook</p>
                  <p className="mt-1 text-3xl font-semibold text-white">€184k projected</p>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                  +12.4%
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-zinc-400">Priority deals</p>
                  <p className="mt-2 text-2xl font-semibold text-white">14</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-zinc-400">Revenue at risk</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-300">€24k</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-sm font-semibold text-cyan-300">AI recommendation</p>
                <p className="mt-2 text-sm leading-7 text-zinc-200">
                  Three deals are showing stronger momentum this week. Prioritize follow-up within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Features</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Everything your team needs to move deals forward</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-[#111] p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-[#111] p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Problem / solution</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Traditional CRMs only store information.</h2>
              <p className="mt-4 text-lg leading-8 text-zinc-400">
                CloseFlow helps sales teams make better decisions with real-time insight, AI guidance and a clear path to action.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-cyan-500/10 p-2 text-cyan-300">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Why teams switch</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-zinc-400">
                    <li>• AI explains what matters most in the pipeline</li>
                    <li>• Teams spend less time hunting for context</li>
                    <li>• Revenue forecasting becomes easier to trust</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Product preview</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">A closer look at the CloseFlow experience</h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {previews.map((preview) => (
              <div key={preview.title} className="rounded-[1.6rem] border border-white/10 bg-[#111] p-6">
                <div className="h-36 rounded-[1.2rem] border border-dashed border-white/10 bg-black/40" />
                <h3 className="mt-5 text-xl font-semibold text-white">{preview.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{preview.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="rounded-[2rem] border border-white/10 bg-[#111] p-8 text-center lg:p-12">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Social proof</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Built for modern sales teams</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
              CloseFlow is designed for revenue teams that want clearer context, better forecasting and smarter next steps.
            </p>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/10 p-8 text-center lg:p-12">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Ready to try it?</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Ready to improve your sales process?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
              Create your workspace and see how CloseFlow turns your pipeline into clear next actions.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90">
                Create your workspace
              </Link>
              <a href="#features" className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-zinc-200 transition hover:bg-white/5">
                Explore features
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-zinc-500 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <p>© 2026 CloseFlow</p>
        <div className="flex gap-4">
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#product" className="transition hover:text-white">Product</a>
          <a href="/login" className="transition hover:text-white">Login</a>
        </div>
      </footer>
    </div>
  )
}
