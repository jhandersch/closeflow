import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#111] p-10 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-zinc-400">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:opacity-90">
            Back to dashboard
          </Link>
          <Link href="/leads" className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-zinc-200 transition hover:bg-white/5">
            View leads
          </Link>
        </div>
      </div>
    </div>
  )
}
