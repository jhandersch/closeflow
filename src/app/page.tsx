import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Command,
  KanbanSquare,
  Sparkles,
  Users,
} from "lucide-react";

const capabilities = [
  {
    number: "01",
    title: "Leads that keep their context",
    description: "Keep contact details, deal value, stage, notes and activity history together. Turn a list of names into a pipeline your team can actually work.",
    icon: Users,
    tag: "Leads · Customers · Import",
  },
  {
    number: "02",
    title: "A pipeline with a next step",
    description: "See every opportunity by stage, stay on top of follow-ups with tasks and calendar events, and keep the next action close to the deal.",
    icon: KanbanSquare,
    tag: "Pipeline · Tasks · Calendar",
  },
  {
    number: "03",
    title: "A forecast you can inspect",
    description: "Review pipeline performance, revenue history and scenario-based forecasts. Ask the AI assistant for deal insights using the information in your workspace.",
    icon: BarChart3,
    tag: "Analytics · Forecast · AI",
  },
];

const plans = [
  { name: "Free", price: "€0", period: "forever", description: "A focused start for one person.", points: ["1 team member", "50 active leads", "10 AI requests / month", "5 exports / month"] },
  { name: "Pro", price: "€49", period: "/ month", description: "More room for a growing team.", points: ["Up to 5 team members", "Unlimited active leads", "500 AI requests / month", "200 exports / month"], featured: true },
  { name: "Business", price: "€149", period: "/ month", description: "Higher limits for larger teams.", points: ["Up to 20 team members", "Unlimited active leads", "5,000 AI requests / month", "2,000 exports / month"] },
];

const exampleDeals = [
  { name: "Northstar Studio", person: "Jordan Lee", value: "€12,000", stage: "Proposal", tone: "bg-violet-400" },
  { name: "Lumen Works", person: "Alex Morgan", value: "€8,400", stage: "Contacted", tone: "bg-cyan-400" },
  { name: "Fieldnote", person: "Sam Rivera", value: "€5,200", stage: "New", tone: "bg-amber-300" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 top-[-20rem] h-[44rem] w-[44rem] rounded-full bg-cyan-500/[0.08] blur-[120px]" />
        <div className="absolute -right-48 top-40 h-[36rem] w-[36rem] rounded-full bg-blue-500/[0.07] blur-[120px]" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CloseFlow home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950"><Command className="h-5 w-5" /></span>
          <span className="text-lg font-semibold tracking-tight">CloseFlow</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-foreground/60 md:flex">
          <a href="#platform" className="transition hover:text-foreground">Platform</a>
          <a href="#how-it-works" className="transition hover:text-foreground">How it works</a>
          <Link href="/pricing" className="transition hover:text-foreground">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground">Log in</Link>
          <Link href="/login?mode=signup" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">Start free <ArrowRight className="ml-1 inline h-4 w-4" /></Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:pb-28 lg:pt-24">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> The CRM that keeps the next move clear
          </div>
          <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">
            Less chasing.<br /><span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-400 bg-clip-text text-transparent">More closing.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-foreground/65 sm:text-lg sm:leading-8">
            Keep leads, follow-ups and forecasts in one place. CloseFlow gives your sales work a clear home—and helps you decide what to do next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?mode=signup" className="inline-flex items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Create your free workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
            <a href="#platform" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-white/[0.02] px-5 py-3 text-sm font-medium text-foreground/80 transition hover:bg-white/[0.06]">Explore the platform <ArrowDown className="h-4 w-4" /></a>
          </div>
          <p className="mt-4 text-xs text-foreground/45">Free to start · No payment details needed · Upgrade when you’re ready</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border-subtle pt-5 text-xs text-foreground/50">
            <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Leads and customers</span>
            <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Tasks and pipeline</span>
            <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Analytics and AI</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
          <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-cyan-400/[0.07] blur-3xl" />
          <div className="relative rounded-[1.7rem] border border-white/10 bg-[#0c1118]/95 p-2 shadow-[0_35px_100px_-35px_rgba(34,211,238,0.2)] sm:rounded-[2rem] sm:p-3">
            <div className="overflow-hidden rounded-[1.3rem] border border-white/[0.07] bg-[#101720] sm:rounded-[1.55rem]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300"><Command className="h-4 w-4" /></span><span className="text-xs font-semibold text-white/80">CloseFlow <span className="font-normal text-white/35">/ Pipeline</span></span></div>
                <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-white/45">Example workspace</span>
              </div>
              <div className="grid sm:grid-cols-[145px_1fr]">
                <aside className="hidden border-r border-white/[0.07] p-3 sm:block">
                  <p className="px-2 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">Workspace</p>
                  {[["Overview", BarChart3], ["Leads", Users], ["Pipeline", KanbanSquare], ["Tasks", ClipboardList], ["Calendar", CalendarCheck2]].map(([label, Icon], index) => {
                    const ItemIcon = Icon as typeof BarChart3;
                    return <div key={label as string} className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] ${index === 2 ? "bg-cyan-400/10 text-cyan-200" : "text-white/45"}`}><ItemIcon className="h-3.5 w-3.5" />{label as string}</div>;
                  })}
                </aside>
                <div className="min-w-0 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[10px] text-white/40">Sales workspace</p><h2 className="mt-1 text-base font-semibold text-white sm:text-lg">Your pipeline</h2></div>
                    <span className="rounded-lg bg-cyan-300 px-2.5 py-1.5 text-[10px] font-semibold text-slate-950">+ Add lead</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[["Open leads", "12"], ["Pipeline value", "€68.4k"], ["Follow-ups", "4 due"]].map(([name, value]) => <div key={name} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 sm:p-3"><p className="text-[8px] text-white/40 sm:text-[9px]">{name}</p><p className="mt-1 text-xs font-semibold text-white/85 sm:text-sm">{value}</p></div>)}
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07]">
                    <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr] gap-2 bg-white/[0.035] px-3 py-2 text-[8px] font-medium uppercase tracking-wider text-white/35 sm:text-[9px]"><span>Lead</span><span>Stage</span><span className="text-right">Value</span></div>
                    {exampleDeals.map((deal, index) => <div key={deal.name} className={`grid grid-cols-[1.4fr_0.9fr_0.7fr] items-center gap-2 px-3 py-3 ${index > 0 ? "border-t border-white/[0.06]" : ""}`}><div className="flex min-w-0 items-center gap-2"><span className={`h-6 w-6 shrink-0 rounded-lg ${deal.tone}/15 flex items-center justify-center text-[8px] font-semibold text-white`}>{deal.name.slice(0, 1)}</span><span className="min-w-0"><span className="block truncate text-[9px] font-medium text-white/80 sm:text-[10px]">{deal.name}</span><span className="block truncate text-[8px] text-white/35">{deal.person}</span></span></div><span className="flex items-center gap-1.5 text-[8px] text-white/55 sm:text-[9px]"><span className={`h-1.5 w-1.5 rounded-full ${deal.tone}`} />{deal.stage}</span><span className="text-right text-[9px] text-white/65 sm:text-[10px]">{deal.value}</span></div>)}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.055] p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200"><Sparkles className="h-3.5 w-3.5" /></span><p className="text-[9px] leading-4 text-white/60 sm:text-[10px]">Keep the next step visible: review your follow-ups and update deal activity as conversations move forward.</p></div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2 text-[8px] text-white/30 sm:px-5"><span>Illustrative product preview</span><span>Leads · Pipeline · Tasks</span></div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#141c25] px-4 py-3 shadow-xl sm:flex lg:-left-8"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><CalendarCheck2 className="h-4 w-4" /></span><span><span className="block text-[10px] font-medium text-white/80">A clear next action</span><span className="mt-0.5 block text-[9px] text-white/40">Keep follow-ups with the deal</span></span></div>
        </div>
      </section>

      <section id="platform" className="border-y border-border-subtle bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">One connected workspace</p><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">A practical CRM for the work between first contact and close.</h2></div>
            <p className="max-w-xl text-sm leading-7 text-foreground/60 lg:justify-self-end">CloseFlow brings the everyday sales workflow together: organize leads, move deals through a pipeline, plan follow-ups and review your numbers without losing the story behind each opportunity.</p>
          </div>
          <div className="mt-11 grid gap-4 lg:grid-cols-3">
            {capabilities.map(({ number, title, description, icon: Icon, tag }) => <article key={number} className="group rounded-2xl border border-border-subtle bg-surface-1 p-6 transition hover:-translate-y-1 hover:border-cyan-400/25 hover:bg-surface-1/80"><div className="flex items-center justify-between"><span className="text-xs font-medium tracking-widest text-foreground/35">{number}</span><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-200 transition group-hover:bg-cyan-400/10"><Icon className="h-5 w-5" /></span></div><h3 className="mt-7 text-lg font-semibold">{title}</h3><p className="mt-3 min-h-20 text-sm leading-6 text-foreground/60">{description}</p><p className="mt-5 border-t border-border-subtle pt-4 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/40">{tag}</p></article>)}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">A simple start</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From workspace to first follow-up in minutes.</h2><p className="mt-4 text-sm leading-7 text-foreground/60">Set up your workspace, then choose a real lead or sample data. The onboarding helps you get into the app without making you choose a paid plan first.</p><Link href="/login?mode=signup" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100">Set up your workspace <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="space-y-3">
            {[
              { n: "01", title: "Create your workspace", text: "Add your company name and a little team context. Your workspace starts on Free." },
              { n: "02", title: "Choose your first step", text: "Add a real lead or load example leads, activities and tasks to explore." },
              { n: "03", title: "Keep the next action moving", text: "Work from your pipeline, schedule follow-ups, and review analytics as your data grows." },
            ].map((item) => <div key={item.n} className="flex gap-4 rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:gap-5 sm:p-6"><span className="pt-0.5 text-xs font-semibold tracking-widest text-cyan-300">{item.n}</span><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1.5 text-sm leading-6 text-foreground/60">{item.text}</p></div><ChevronRight className="ml-auto mt-1 hidden h-4 w-4 shrink-0 text-foreground/30 sm:block" /></div>)}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-border-subtle bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Straightforward plans</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Grow at your pace.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-foreground/60">Start with one person, then choose a plan when you need more capacity.</p></div><Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100">Compare every feature <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => <article key={plan.name} className={`rounded-2xl border bg-surface-1 p-6 ${plan.featured ? "border-cyan-400/40 shadow-[0_0_35px_-20px_rgba(34,211,238,0.25)]" : "border-border-subtle"}`}>
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{plan.name}</h3><p className="mt-1 text-xs text-foreground/50">{plan.description}</p></div>{plan.featured && <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">Popular</span>}</div>
              <p className="mt-6"><span className="text-3xl font-semibold tracking-tight">{plan.price}</span><span className="ml-1 text-xs text-foreground/45">{plan.period}</span></p>
              <ul className="mt-5 space-y-2.5">{plan.points.map((point) => <li key={point} className="flex items-center gap-2 text-xs text-foreground/65"><Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />{point}</li>)}</ul>
            </article>)}
          </div>
          <p className="mt-4 text-center text-[11px] text-foreground/40">Plan limits and features shown for monthly subscriptions. See the pricing page for full details.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#101d27] px-6 py-12 text-center sm:px-12 sm:py-16">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(34,211,238,0.18),transparent_60%)]" />
          <div className="relative"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><CircleDollarSign className="h-5 w-5" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Your next move starts here</p><h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Bring your pipeline into focus.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-foreground/65">Create a free workspace and see how your leads, follow-ups and forecast fit together.</p><Link href="/login?mode=signup" className="mt-7 inline-flex items-center rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link></div>
        </div>
      </section>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 text-xs text-foreground/45 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200"><Command className="h-3.5 w-3.5" /></span><span>© 2026 CloseFlow</span></div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/pricing" className="transition hover:text-foreground">Pricing</Link><Link href="/login" className="transition hover:text-foreground">Log in</Link><Link href="/impressum" className="transition hover:text-foreground">Impressum</Link><Link href="/datenschutz" className="transition hover:text-foreground">Datenschutz</Link><Link href="/cookies" className="transition hover:text-foreground">Cookies</Link><Link href="/agb" className="transition hover:text-foreground">AGB</Link></nav>
        </div>
      </footer>
    </main>
  );
}
