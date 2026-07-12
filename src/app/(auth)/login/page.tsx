"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const nextPath = user.user_metadata?.onboarding_completed ? "/dashboard" : "/onboarding"
        router.replace(nextPath)
      }
    }

    void checkUser()
  }, [router])

  const submit = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          throw error
        }

        setSuccess("Account created. You can sign in now.")
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const nextPath = user.user_metadata?.onboarding_completed ? "/dashboard" : "/onboarding"
        router.replace(nextPath)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-8 text-white sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">CloseFlow</p>
        <h1 className="mt-3 text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          {mode === "login"
            ? "Sign in to continue with your CRM workspace."
            : "Create an account and we’ll guide you through your first setup."}
        </p>

        <div className="mt-6 flex rounded-2xl border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login")
              setError(null)
              setSuccess(null)
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-white text-black" : "text-zinc-400"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup")
              setError(null)
              setSuccess(null)
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-white text-black" : "text-zinc-400"}`}
          >
            Sign up
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Working..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </div>
    </div>
  )
}