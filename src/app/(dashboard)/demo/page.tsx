"use client"

import { useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { loadDemoData } from "@/lib/demoData"

export default function DemoPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const startDemo = async () => {
    setLoading(true)
    try {
      const result = await loadDemoData()
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start demo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Demo</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Load a demo workspace</h1>
          <p className="mt-2 text-sm text-foreground/65">Spin up a sample dataset to explore CloseFlow instantly.</p>
        </div>

        <button onClick={() => void startDemo()} disabled={loading} className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black disabled:opacity-60">
          {loading ? "Loading..." : "Load demo data"}
        </button>

        {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
      </div>
    </AuthGuard>
  )
}
