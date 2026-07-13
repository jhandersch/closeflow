"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"

const sanitizeNextPath = (nextPath: string | null) => {
  if (!nextPath) return null
  if (!nextPath.startsWith("/")) return null
  if (nextPath.startsWith("//")) return null
  return nextPath
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useAppPreferences()
  const nextPath = sanitizeNextPath(searchParams.get("next"))

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const modeParam = searchParams.get("mode")
    if (modeParam === "reset") {
      setMode("reset")
    }

    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""))
    if (hashParams.get("type") === "recovery") {
      setMode("reset")
      setSuccess("Recovery link verified. Set your new password.")
    }
  }, [searchParams])

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        if (mode === "reset") {
          return
        }
        if (user.user_metadata?.onboarding_completed) {
          router.replace(nextPath || "/dashboard")
        } else {
          const onboardingTarget = nextPath ? `/onboarding?next=${encodeURIComponent(nextPath)}` : "/onboarding"
          router.replace(onboardingTarget)
        }
      }
    }

    void checkUser()
  }, [mode, nextPath, router])

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
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=reset`,
        })

        if (error) {
          throw error
        }

        setSuccess("Password reset link sent. Check your inbox.")
        setMode("login")
      } else if (mode === "reset") {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters long")
        }

        if (password !== passwordConfirm) {
          throw new Error("Passwords do not match")
        }

        const { error } = await supabase.auth.updateUser({
          password,
        })

        if (error) {
          throw error
        }

        setSuccess("Password updated successfully. You can now sign in.")
        setMode("login")
        setPassword("")
        setPasswordConfirm("")
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName.trim(),
              username: username.trim().toLowerCase(),
            },
          },
        })

        if (error) {
          throw error
        }

        setSuccess("Account created. Confirm your email, then sign in.")
        setFullName("")
        setUsername("")
      }

      if (mode === "forgot" || mode === "reset") {
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        if (user.user_metadata?.onboarding_completed) {
          router.replace(nextPath || "/dashboard")
        } else {
          const onboardingTarget = nextPath ? `/onboarding?next=${encodeURIComponent(nextPath)}` : "/onboarding"
          router.replace(onboardingTarget)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] sm:p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">CloseFlow</p>
        <h1 className="mt-3 text-3xl font-semibold">
          {mode === "login"
            ? t("auth.welcomeBack", "Welcome back")
            : mode === "signup"
              ? t("auth.createWorkspace", "Create your workspace")
              : mode === "forgot"
                ? t("auth.resetPassword", "Reset your password")
                : t("auth.setPassword", "Set a new password")}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {mode === "login"
            ? "Sign in to continue with your CRM workspace."
            : mode === "signup"
            ? "Create an account and we’ll guide you through your first setup."
            : mode === "forgot"
            ? "Enter your email and we’ll send you a recovery link."
            : "Choose a strong new password for your account."}
        </p>

        {mode !== "reset" ? (
          <div className="mt-6 flex rounded-2xl border border-border-subtle bg-surface-2/70 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login")
                setError(null)
                setSuccess(null)
              }}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-foreground text-background" : "text-foreground/65"}`}
            >
              {t("auth.login", "Login")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup")
                setError(null)
                setSuccess(null)
              }}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-foreground text-background" : "text-foreground/65"}`}
            >
              {t("auth.signUp", "Sign up")}
            </button>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {mode === "signup" ? (
            <>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={t("auth.fullName", "Full name")}
                className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
              />

              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("auth.username", "Username")}
                className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
              />
            </>
          ) : null}

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("auth.email", "Email")}
            className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
          />

          {mode !== "forgot" ? (
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.password", "Password")}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
            />
          ) : null}

          {mode === "reset" ? (
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder={t("auth.confirmPassword", "Confirm new password")}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
            />
          ) : null}
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
          className="mt-6 w-full rounded-2xl bg-foreground px-4 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? t("auth.working", "Working...")
            : mode === "login"
            ? t("auth.login", "Login")
            : mode === "signup"
            ? t("auth.createAccount", "Create account")
            : mode === "forgot"
            ? t("auth.sendReset", "Send reset link")
            : t("auth.updatePassword", "Update password")}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "forgot" ? "login" : "forgot")
              setError(null)
              setSuccess(null)
            }}
            className="text-cyan-300 transition hover:text-cyan-200"
          >
            {mode === "forgot" ? t("auth.backToLogin", "Back to login") : t("auth.forgotPassword", "Forgot password?")}
          </button>

          {mode === "reset" ? (
            <button
              type="button"
              onClick={() => {
                setMode("login")
                setError(null)
                setSuccess(null)
              }}
              className="text-foreground/65 transition hover:text-foreground"
            >
              {t("auth.cancelReset", "Cancel reset")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}