export default function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-8 shadow-2xl">
        <div className="h-3 w-24 animate-pulse rounded-full bg-cyan-500/30" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-4/6 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="mt-8 h-11 animate-pulse rounded-2xl bg-cyan-500/20" />
      </div>
    </div>
  )
}

