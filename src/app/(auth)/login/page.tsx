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
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset" | "magic" | "mfa">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaRecoveryCode, setMfaRecoveryCode] = useState("")
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)

  useEffect(() => {
    const modeParam = searchParams.get("mode")
    const oauthError = searchParams.get("oauthError")

    if (modeParam === "reset") {
      setMode("reset")
    }

    if (oauthError) {
      setError(oauthError)
    }

    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""))
    if (hashParams.get("type") === "recovery") {
      setMode("reset")
      setSuccess(t("auth.recoveryVerified", "Recovery link verified. Set your new password."))
    }
  }, [searchParams, t])

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        if (mode === "reset" || mode === "mfa") {
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

  const getAuthRedirectPath = () => {
    const callbackUrl = new URL("/auth/callback", window.location.origin)

    if (nextPath) {
      callbackUrl.searchParams.set("next", nextPath)
    }

    return callbackUrl.toString()
  }

  const startOAuth = async (provider: "google" | "azure") => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthRedirectPath(),
      },
    })

    if (error) {
      setError(error.message || t("auth.oauthFailed", "OAuth login failed"))
      setLoading(false)
    }
  }

  const sendMagicLink = async () => {
    if (!email.trim()) {
      setError(t("auth.emailRequired", "Email is required"))
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: getAuthRedirectPath(),
      },
    })

    if (error) {
      setError(error.message || t("auth.magicLinkFailed", "Could not send magic link"))
    } else {
      setSuccess(t("auth.magicLinkSent", "Magic link sent. Check your inbox."))
      setMode("login")
    }

    setLoading(false)
  }

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

        const mfaApi = (supabase.auth as unknown as { mfa?: any }).mfa
        if (mfaApi?.getAuthenticatorAssuranceLevel && mfaApi?.listFactors) {
          const { data: aalData } = await mfaApi.getAuthenticatorAssuranceLevel()

          if (aalData?.nextLevel === "aal2") {
            const { data: factorsData } = await mfaApi.listFactors()
            const totpFactors = factorsData?.totp || []
            const selectedFactor =
              totpFactors.find((factor: any) => factor.status === "verified") ||
              totpFactors.find((factor: any) => factor.status === "unverified")

            if (!selectedFactor?.id) {
              throw new Error(t("auth.twoFactorNotConfigured", "2FA required but no TOTP factor is configured"))
            }

            setMfaFactorId(selectedFactor.id)
            setMode("mfa")
            setSuccess(t("auth.twoFactorCodeRequired", "Two-factor code required. Enter your authenticator code."))
            setLoading(false)
            return
          }
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=reset`,
        })

        if (error) {
          throw error
        }

        setSuccess(t("auth.passwordResetSent", "Password reset link sent. Check your inbox."))
        setMode("login")
      } else if (mode === "reset") {
        if (password.length < 8) {
          throw new Error(t("auth.passwordMinLength", "Password must be at least 8 characters long"))
        }

        if (password !== passwordConfirm) {
          throw new Error(t("auth.passwordsMismatch", "Passwords do not match"))
        }

        const { error } = await supabase.auth.updateUser({
          password,
        })

        if (error) {
          throw error
        }

        setSuccess(t("auth.passwordUpdated", "Password updated successfully. You can now sign in."))
        setMode("login")
        setPassword("")
        setPasswordConfirm("")
      } else if (mode === "signup") {
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

        setSuccess(t("auth.accountCreated", "Account created. Confirm your email, then sign in."))
        setFullName("")
        setUsername("")
      } else if (mode === "mfa") {
        if (useRecoveryCode) {
          if (!mfaRecoveryCode.trim()) {
            throw new Error(t("auth.recoveryCodeRequired", "Recovery code is required"))
          }

          const {
            data: { session },
          } = await supabase.auth.getSession()

          const response = await fetch("/api/security/recovery-codes/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ code: mfaRecoveryCode.trim() }),
          })

          if (!response.ok) {
            throw new Error(t("auth.invalidRecoveryCode", "Invalid recovery code"))
          }

          setMfaRecoveryCode("")
        } else {
          if (!mfaFactorId) {
            throw new Error(t("auth.noMfaFactor", "No MFA factor selected"))
          }

          if (!mfaCode.trim()) {
            throw new Error(t("auth.authCodeRequired", "Authentication code is required"))
          }

          const mfaApi = (supabase.auth as unknown as { mfa?: any }).mfa

          if (!mfaApi?.challengeAndVerify) {
            throw new Error(t("auth.mfaUnavailable", "MFA challenge is not available"))
          }

          const { error } = await mfaApi.challengeAndVerify({
            factorId: mfaFactorId,
            code: mfaCode.trim(),
          })

          if (error) {
            throw error
          }

          setMfaCode("")
        }
      }

      if (mode === "forgot" || mode === "reset" || mode === "magic") {
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
      setError(err instanceof Error ? err.message : t("auth.authenticationFailed", "Authentication failed"))
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
              : mode === "magic"
                ? t("auth.magicLink", "Sign in with magic link")
                : mode === "mfa"
                  ? t("auth.twoFactor", "Two-factor authentication")
              : mode === "forgot"
                ? t("auth.resetPassword", "Reset your password")
                : t("auth.setPassword", "Set a new password")}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {mode === "login"
            ? t("auth.subtitleLogin", "Sign in to continue with your CRM workspace.")
            : mode === "signup"
            ? t("auth.subtitleSignUp", "Create an account and we\'ll guide you through your first setup.")
            : mode === "magic"
            ? t("auth.subtitleMagic", "Enter your email and we\'ll send a one-click secure sign-in link.")
            : mode === "mfa"
            ? t("auth.subtitleMfa", "Enter the 6-digit code from your authenticator app to continue.")
            : mode === "forgot"
            ? t("auth.subtitleForgot", "Enter your email and we\'ll send you a recovery link.")
            : t("auth.subtitleReset", "Choose a strong new password for your account.")}
        </p>

        {mode === "login" ? (
          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => void startOAuth("google")}
              disabled={loading}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-foreground/5 disabled:opacity-60"
            >
              {t("auth.continueWithGoogle", "Continue with Google")}
            </button>
            <button
              type="button"
              onClick={() => void startOAuth("azure")}
              disabled={loading}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-foreground/5 disabled:opacity-60"
            >
              {t("auth.continueWithMicrosoft", "Continue with Microsoft")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("magic")
                setError(null)
                setSuccess(null)
              }}
              className="w-full rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
            >
              {t("auth.continueWithMagicLink", "Continue with Magic Link")}
            </button>
          </div>
        ) : null}

        {mode !== "reset" && mode !== "mfa" ? (
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

          {mode !== "mfa" ? (
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.email", "Email")}
              className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
            />
          ) : null}

          {mode !== "forgot" && mode !== "magic" && mode !== "mfa" ? (
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

          {mode === "mfa" ? (
            <>
              <input
                value={useRecoveryCode ? mfaRecoveryCode : mfaCode}
                onChange={(event) => {
                  if (useRecoveryCode) {
                    setMfaRecoveryCode(event.target.value)
                    return
                  }

                  setMfaCode(event.target.value)
                }}
                placeholder={
                  useRecoveryCode
                    ? t("auth.recoveryCode", "Enter recovery code")
                    : t("auth.enterCode", "Enter 6-digit code")
                }
                className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50"
              />
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode((current) => !current)
                  setError(null)
                  setSuccess(null)
                }}
                className="text-left text-sm text-cyan-300 transition hover:text-cyan-200"
              >
                {useRecoveryCode
                  ? t("auth.useAuthenticatorInstead", "Use authenticator code instead")
                  : t("auth.useRecoveryInstead", "Use recovery code instead")}
              </button>
            </>
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
          onClick={() => {
            if (mode === "magic") {
              void sendMagicLink()
              return
            }

            void submit()
          }}
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
            : mode === "magic"
            ? t("auth.sendMagicLink", "Send magic link")
            : mode === "mfa"
            ? t("auth.verifyCode", "Verify code")
            : t("auth.updatePassword", "Update password")}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              if (mode === "magic") {
                setMode("login")
                setError(null)
                setSuccess(null)
                return
              }

              if (mode === "mfa") {
                setMode("login")
                setMfaCode("")
                setMfaFactorId(null)
                setMfaRecoveryCode("")
                setUseRecoveryCode(false)
                setError(null)
                setSuccess(null)
                return
              }

              setMode(mode === "forgot" ? "login" : "forgot")
              setError(null)
              setSuccess(null)
            }}
            className="text-cyan-300 transition hover:text-cyan-200"
          >
            {mode === "forgot" || mode === "magic" || mode === "mfa"
              ? t("auth.backToLogin", "Back to login")
              : t("auth.forgotPassword", "Forgot password?")}
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