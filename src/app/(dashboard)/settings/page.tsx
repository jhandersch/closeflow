"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { AppLanguage } from "@/lib/i18n"
import { supabase } from "@/lib/supabase/client"

type ThemeOption = "dark" | "light"

type NotificationSettings = {
  browser: boolean
  email: boolean
  taskReminders: boolean
}

type SubscriptionPlan = "free" | "pro" | "enterprise"

type Integrations = {
  google: boolean
  gmail: boolean
  calendar: boolean
  slack: boolean
}

const LOCAL_STORAGE_KEYS = {
  openai: "closeflow_openai_key",
  webhook: "closeflow_webhook_key",
}

export default function SettingsPage() {
  const router = useRouter()
  const {
    language: appLanguage,
    theme: appTheme,
    setLanguage: setAppLanguage,
    setTheme: setAppTheme,
    t,
  } = useAppPreferences()
  const isDe = appLanguage === "de"
  const locale = isDe ? "de-DE" : "en-US"

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [teamSize, setTeamSize] = useState("")

  const [language, setLanguage] = useState<AppLanguage>(appLanguage)
  const [theme, setTheme] = useState<ThemeOption>(appTheme)
  const [notifications, setNotifications] = useState<NotificationSettings>({
    browser: true,
    email: true,
    taskReminders: true,
  })
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>("free")
  const [integrations, setIntegrations] = useState<Integrations>({
    google: false,
    gmail: false,
    calendar: false,
    slack: false,
  })
  const [sessionCount, setSessionCount] = useState(1)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null)
  const [currentDeviceName, setCurrentDeviceName] = useState("")
  const [mfaAvailable, setMfaAvailable] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null)
  const [mfaVerifyCode, setMfaVerifyCode] = useState("")
  const [mfaStatus, setMfaStatus] = useState<"disabled" | "pending" | "enabled">("disabled")
  const [mfaBusy, setMfaBusy] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [recoveryRemaining, setRecoveryRemaining] = useState(0)
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("")
  const [recoveryBusy, setRecoveryBusy] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [openAiKey, setOpenAiKey] = useState("")
  const [webhookKey, setWebhookKey] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}
  }

  const loadRecoveryStatus = async () => {
    const authHeaders = await getAuthHeaders()
    const response = await fetch("/api/security/recovery-codes/status", {
      headers: {
        ...authHeaders,
      },
    })

    if (!response.ok) {
      return
    }

    const data = (await response.json()) as { remaining?: number }
    setRecoveryRemaining(Number(data.remaining || 0))
  }

  const syncMfaState = async () => {
    const mfaApi = (supabase.auth as unknown as { mfa?: any }).mfa

    if (!mfaApi?.listFactors) {
      setMfaAvailable(false)
      setMfaStatus("disabled")
      setMfaFactorId(null)
      return
    }

    setMfaAvailable(true)

    const { data, error } = await mfaApi.listFactors()

    if (error) {
      setMfaStatus("disabled")
      setMfaFactorId(null)
      return
    }

    const totpFactors = data?.totp || []
    const verified = totpFactors.find((factor: any) => factor.status === "verified")
    const pending = totpFactors.find((factor: any) => factor.status === "unverified")

    if (verified?.id) {
      setMfaStatus("enabled")
      setMfaFactorId(verified.id)
      setTwoFactorEnabled(true)
      setMfaQrCode(null)
      return
    }

    if (pending?.id) {
      setMfaStatus("pending")
      setMfaFactorId(pending.id)
      setTwoFactorEnabled(false)
      return
    }

    setMfaStatus("disabled")
    setMfaFactorId(null)
    setTwoFactorEnabled(false)
  }

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const metadata = user.user_metadata || {}
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setEmail(user.email || "")
      setName(metadata.name || "")
      setUsername(metadata.username || "")
      setAvatarUrl(metadata.avatar_url || "")
      setCompanyName(metadata.company_name || "")
      setIndustry(metadata.industry || "")
      setTeamSize(metadata.team_size || "")
      const savedLanguage = window.localStorage.getItem("closeflow_language") as AppLanguage | null
      const savedTheme = window.localStorage.getItem("closeflow_theme") as ThemeOption | null
      const nextLanguage = (metadata.language as AppLanguage) || savedLanguage || "de"
      const nextTheme = (metadata.theme as ThemeOption) || savedTheme || "dark"
      setLanguage(nextLanguage)
      setTheme(nextTheme)
      setAppLanguage(nextLanguage)
      setAppTheme(nextTheme)
      setNotifications({
        browser: metadata.notifications?.browser ?? true,
        email: metadata.notifications?.email ?? true,
        taskReminders: metadata.notifications?.taskReminders ?? true,
      })
      setSubscriptionPlan((metadata.subscription_plan as SubscriptionPlan) || "free")
      setIntegrations({
        google: metadata.integrations?.google ?? false,
        gmail: metadata.integrations?.gmail ?? false,
        calendar: metadata.integrations?.calendar ?? false,
        slack: metadata.integrations?.slack ?? false,
      })
      setSessionCount(Number(metadata.session_count || (session ? 1 : 0)))
      setTwoFactorEnabled(Boolean(metadata.two_factor_enabled))
      setSessionExpiresAt(session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null)
      setCurrentDeviceName(window.navigator.userAgent || "Current browser")
      setMfaAvailable(Boolean((supabase.auth as unknown as { mfa?: unknown }).mfa))

      await syncMfaState()
      await loadRecoveryStatus()

      setOpenAiKey(window.localStorage.getItem(LOCAL_STORAGE_KEYS.openai) || "")
      setWebhookKey(window.localStorage.getItem(LOCAL_STORAGE_KEYS.webhook) || "")

      setLoading(false)
    }

    void loadUser()
  }, [router, setAppLanguage, setAppTheme])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.location.hash !== "#security") return

    const target = document.getElementById("security")
    if (!target) return

    target.scrollIntoView({ behavior: "smooth", block: "start" })
    target.focus({ preventScroll: true })
  }, [])

  const saveProfile = async () => {
    setSavingProfile(true)

    const { error } = await supabase.auth.updateUser({
      data: {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        avatar_url: avatarUrl.trim(),
        company_name: companyName.trim(),
        industry: industry.trim(),
        team_size: teamSize.trim(),
      },
    })

    if (error) {
      toast.error(error.message || (isDe ? "Profil konnte nicht gespeichert werden" : "Could not save profile"))
    } else {
      toast.success(isDe ? "Profil- und Firmeneinstellungen aktualisiert" : "Profile and company settings updated")
    }

    setSavingProfile(false)
  }

  const savePreferences = async () => {
    setSavingPreferences(true)

    if (notifications.browser && Notification.permission === "default") {
      await Notification.requestPermission()
    }

    const { error } = await supabase.auth.updateUser({
      data: {
      language,
      theme,
      notifications,
      subscription_plan: subscriptionPlan,
      integrations,
      session_count: sessionCount,
    },
    })

    if (error) {
      toast.error(error.message || (isDe ? "Präferenzen konnten nicht gespeichert werden" : "Could not save preferences"))
    } else {
      toast.success(isDe ? "Präferenzen aktualisiert" : "Preferences updated")
    }

    setSavingPreferences(false)
  }

  const saveApiKeys = async () => {
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.openai, openAiKey.trim())
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.webhook, webhookKey.trim())

    const { error } = await supabase.auth.updateUser({
      data: {
        has_openai_key: Boolean(openAiKey.trim()),
        has_webhook_key: Boolean(webhookKey.trim()),
      },
    })

    if (error) {
      toast.error(error.message || (isDe ? "API-Key-Status konnte nicht gespeichert werden" : "Could not save API key flags"))
      return
    }

    toast.success(isDe ? "API-Key-Einstellungen gespeichert" : "API key settings saved")
  }

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error(isDe ? "Passwort muss mindestens 8 Zeichen haben" : "Password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error(isDe ? "Passwörter stimmen nicht überein" : "Passwords do not match")
      return
    }

    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast.error(error.message || (isDe ? "Passwort konnte nicht geändert werden" : "Could not change password"))
    } else {
      toast.success(isDe ? "Passwort aktualisiert" : "Password updated")
      setNewPassword("")
      setConfirmPassword("")
    }

    setChangingPassword(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const deleteAccount = async () => {
    if (deleteConfirmation.trim() !== "DELETE") {
      toast.error(isDe ? "Bitte zur Bestätigung DELETE eingeben" : "Type DELETE to confirm")
      return
    }

    setDeletingAccount(true)

    const authHeaders = await getAuthHeaders()
    const response = await fetch("/api/profile/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ confirmation: deleteConfirmation.trim() }),
    })

    if (!response.ok) {
      const text = await response.text()
      toast.error(text || (isDe ? "Account konnte nicht gelöscht werden" : "Could not delete account"))
      setDeletingAccount(false)
      return
    }

    await supabase.auth.signOut({ scope: "global" })
    toast.success(isDe ? "Account gelöscht" : "Account deleted")
    router.push("/login")
  }

  const logoutCurrentSession = async () => {
    await supabase.auth.signOut({ scope: "local" })
    router.push("/login")
  }

  const logoutAllSessions = async () => {
    await supabase.auth.signOut({ scope: "global" })
    router.push("/login")
  }

  const sendMagicLink = async () => {
    if (!email.trim()) {
      toast.error(isDe ? "Keine E-Mail für dieses Konto gefunden" : "No email found for this account")
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      toast.error(error.message || (isDe ? "Magic-Link konnte nicht gesendet werden" : "Could not send magic link"))
    } else {
      toast.success(isDe ? "Magic-Link gesendet" : "Magic link sent")
    }
  }

  const startMfaEnrollment = async () => {
    const mfaApi = (supabase.auth as unknown as { mfa?: any }).mfa

    if (!mfaApi?.enroll) {
      toast.error(isDe ? "MFA ist in dieser Umgebung nicht verfügbar" : "MFA is not available in this environment")
      return
    }

    setMfaBusy(true)
    const { data, error } = await mfaApi.enroll({
      factorType: "totp",
      friendlyName: "CloseFlow Authenticator",
      issuer: "CloseFlow",
    })

    if (error) {
      toast.error(error.message || (isDe ? "2FA-Setup konnte nicht gestartet werden" : "Could not start 2FA setup"))
      setMfaBusy(false)
      return
    }

    setMfaFactorId(data?.id || null)
    setMfaQrCode(data?.totp?.qr_code || null)
    setMfaStatus("pending")
    toast.success(isDe ? "2FA-Setup gestartet. QR-Code scannen und verifizieren." : "2FA setup started. Scan the QR code and verify.")
    setMfaBusy(false)
  }

  const verifyMfaEnrollment = async () => {
    const mfaApi = (supabase.auth as unknown as { mfa?: any }).mfa

    if (!mfaApi?.challengeAndVerify || !mfaFactorId) {
      toast.error(isDe ? "2FA-Faktor fehlt" : "2FA factor is missing")
      return
    }

    if (!mfaVerifyCode.trim()) {
      toast.error(isDe ? "Authentifizierungscode ist erforderlich" : "Authentication code is required")
      return
    }

    setMfaBusy(true)
    const { error } = await mfaApi.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaVerifyCode.trim(),
    })

    if (error) {
      toast.error(error.message || (isDe ? "2FA-Code konnte nicht verifiziert werden" : "Could not verify 2FA code"))
      setMfaBusy(false)
      return
    }

    await supabase.auth.updateUser({
      data: {
        two_factor_enabled: true,
      },
    })

    setMfaVerifyCode("")
    setMfaQrCode(null)
    await syncMfaState()
    toast.success(isDe ? "Zwei-Faktor-Authentifizierung aktiviert" : "Two-factor authentication enabled")
    setMfaBusy(false)
  }

  const elevateMfaSession = async () => {
    const mfaApi = (supabase.auth as unknown as { mfa?: any }).mfa

    if (!mfaApi?.challenge || !mfaApi?.verify || !mfaFactorId) {
      toast.error(
        isDe
          ? "2FA-Sitzung konnte nicht gestartet werden."
          : "Could not start MFA session."
      )
      return
    }

    const code = window.prompt(
      isDe
        ? "Gib den 6-stelligen Code aus deiner Authenticator-App ein:"
        : "Enter the 6-digit code from your authenticator app:"
    )

    if (!code?.trim()) {
      return
    }

    setMfaBusy(true)

    try {
      const { data: challengeData, error: challengeError } =
        await mfaApi.challenge({
          factorId: mfaFactorId,
        })

      if (challengeError) {
        throw challengeError
      }

      const { error: verifyError } = await mfaApi.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: code.trim(),
      })

      if (verifyError) {
        throw verifyError
      }

      toast.success(
        isDe
          ? "2FA-Sitzung aktiviert. AAL2 ist jetzt aktiv."
          : "MFA session verified. AAL2 is now active."
      )
    } catch (error) {
      console.error("MFA ELEVATION ERROR:", error)

      toast.error(
        error instanceof Error
          ? error.message
          : isDe
            ? "2FA konnte nicht verifiziert werden."
            : "Could not verify MFA."
      )
    } finally {
      setMfaBusy(false)
    }
  }

  const disableMfa = async () => {
    const mfaApi = (supabase.auth as unknown as { mfa?: any }).mfa

    if (!mfaApi?.unenroll || !mfaFactorId) {
      toast.error(
        isDe
          ? "Kein 2FA-Faktor zum Deaktivieren vorhanden"
          : "No 2FA factor to disable"
      )
      return
    }

    setMfaBusy(true)

    try {
      const { data: aal, error: aalError } =
        await mfaApi.getAuthenticatorAssuranceLevel()

      if (aalError) {
        toast.error(
          aalError.message ||
            (isDe
              ? "AAL-Status konnte nicht geprüft werden"
              : "Could not check authentication assurance level")
        )
        return
      }

      if (aal.currentLevel !== "aal2") {
        toast.error(
          isDe
            ? "Bitte bestätige zuerst deine 2FA mit deinem Authenticator-Code."
            : "Please verify your 2FA with your authenticator code first."
        )
        return
      }

      const { error } = await mfaApi.unenroll({
        factorId: mfaFactorId,
      })

      if (error) {
        toast.error(
          error.message ||
            (isDe
              ? "2FA konnte nicht deaktiviert werden"
              : "Could not disable 2FA")
        )
        return
      }

      await supabase.auth.updateUser({
        data: {
          two_factor_enabled: false,
        },
      })

      setMfaVerifyCode("")
      setMfaQrCode(null)

      await syncMfaState()

      toast.success(
        isDe
          ? "Zwei-Faktor-Authentifizierung deaktiviert"
          : "Two-factor authentication disabled"
      )
    } finally {
      setMfaBusy(false)
    }
  }

  const qrImageSrc = mfaQrCode
    ? mfaQrCode.startsWith("data:")
      ? mfaQrCode
      : `data:image/svg+xml;utf8,${encodeURIComponent(mfaQrCode)}`
    : null

  const regenerateRecoveryCodes = async () => {
    setRecoveryBusy(true)
    const authHeaders = await getAuthHeaders()
    const response = await fetch("/api/security/recovery-codes/regenerate", {
      method: "POST",
      headers: {
        ...authHeaders,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      toast.error(text || (isDe ? "Recovery-Codes konnten nicht erstellt werden" : "Could not generate recovery codes"))
      setRecoveryBusy(false)
      return
    }

    const data = (await response.json()) as { codes?: string[] }
    setRecoveryCodes(Array.isArray(data.codes) ? data.codes : [])
    setRecoveryCodeInput("")
    await loadRecoveryStatus()
    toast.success(isDe ? "Recovery-Codes erstellt" : "Recovery codes generated")
    setRecoveryBusy(false)
  }

  const consumeRecoveryCode = async () => {
    if (!recoveryCodeInput.trim()) {
      toast.error(isDe ? "Bitte Recovery-Code eingeben" : "Enter a recovery code")
      return
    }

    setRecoveryBusy(true)
    const authHeaders = await getAuthHeaders()
    const response = await fetch("/api/security/recovery-codes/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ code: recoveryCodeInput }),
    })

    if (!response.ok) {
      const text = await response.text()
      toast.error(text || (isDe ? "Ungültiger Recovery-Code" : "Invalid recovery code"))
      setRecoveryBusy(false)
      return
    }

    setRecoveryCodeInput("")
    await loadRecoveryStatus()
    toast.success(isDe ? "Recovery-Code akzeptiert und als verwendet markiert" : "Recovery code accepted and marked as used")
    setRecoveryBusy(false)
  }

  if (loading) {
    return <div className="text-foreground">{t("common.loading", "Lädt...")}</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("settings.title", "Einstellungen")}</h1>
        <p className="mt-2 text-foreground/65">{t("settings.subtitle", "Manage your CloseFlow workspace, preferences, and security.")}</p>
        <div className="mt-4">
          <Link href="/settings/profile" className="inline-flex rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            {isDe ? "Profileinstellungen öffnen" : "Open profile settings"}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">{t("settings.profileTitle", "Profile and Company")}</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-foreground/70">
            {t("settings.name", "Name")}
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="text-sm text-foreground/70">
            {t("settings.username", "Username")}
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="text-sm text-foreground/70 md:col-span-2">
            {t("settings.profileImage", "Profile image URL")}
            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="text-sm text-foreground/70">
            {t("settings.companyName", "Company name")}
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="text-sm text-foreground/70">
            {t("settings.industry", "Industry")}
            <input value={industry} onChange={(event) => setIndustry(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="text-sm text-foreground/70">
            {t("settings.teamSize", "Team size")}
            <input value={teamSize} onChange={(event) => setTeamSize(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="text-sm text-foreground/70">
            {t("settings.email", "Email")}
            <div className="mt-2 rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground/80">{email}</div>
          </label>
        </div>

        {avatarUrl ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-2 px-3 py-2">
            <img
              src={avatarUrl}
              alt={isDe ? "Profilvorschau" : "Profile preview"}
              className="h-10 w-10 rounded-full object-cover"
              onError={(event) => {
                ;(event.currentTarget as HTMLImageElement).style.display = "none"
              }}
            />
            <span className="text-xs text-foreground/65">{t("settings.preview", "Preview")}</span>
          </div>
        ) : null}

        <button onClick={saveProfile} disabled={savingProfile} className="mt-5 rounded-xl bg-foreground px-5 py-3 font-semibold text-background disabled:opacity-50">
          {savingProfile ? t("settings.profileSaving", "Saving...") : t("settings.profileSave", "Save profile and company")}
        </button>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">{t("settings.preferencesTitle", "Preferences")}</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-foreground/70">
            {t("settings.language", "Language")}
            <select
              value={language}
              onChange={(event) => {
                const value = event.target.value as AppLanguage
                setLanguage(value)
                setAppLanguage(value)
              }}
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="text-sm text-foreground/70">
            {t("settings.theme", "Theme")}
            <select
              value={theme}
              onChange={(event) => {
                const value = event.target.value as ThemeOption
                setTheme(value)
                setAppTheme(value)
              }}
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            >
              <option value="dark">{t("settings.dark", "Dark mode")}</option>
              <option value="light">{t("settings.light", "Light mode")}</option>
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {t("settings.browserNotifications", "Browser notifications")}
            <input type="checkbox" checked={notifications.browser} onChange={(event) => setNotifications((current) => ({ ...current, browser: event.target.checked }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {t("settings.emailNotifications", "Email notifications")}
            <input type="checkbox" checked={notifications.email} onChange={(event) => setNotifications((current) => ({ ...current, email: event.target.checked }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {t("settings.taskReminders", "Task reminders")}
            <input type="checkbox" checked={notifications.taskReminders} onChange={(event) => setNotifications((current) => ({ ...current, taskReminders: event.target.checked }))} />
          </label>
        </div>

        <button onClick={savePreferences} disabled={savingPreferences} className="mt-5 rounded-xl border border-border-subtle px-5 py-3 text-foreground hover:bg-foreground/5 disabled:opacity-60">
          {savingPreferences ? t("settings.preferencesSaving", "Saving...") : t("settings.preferencesSave", "Save preferences")}
        </button>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">{t("settings.apiTitle", "API Keys")}</h2>
        <p className="mt-2 text-sm text-foreground/65">{t("settings.apiSubtitle", "Keys are stored locally in this browser for development use. Use a secure backend vault in production.")}</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-foreground/70">
            {t("settings.openaiKey", "OpenAI API key")}
            <input type="password" value={openAiKey} onChange={(event) => setOpenAiKey(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="text-sm text-foreground/70">
            {t("settings.webhookSecret", "Webhook secret")}
            <input type="password" value={webhookKey} onChange={(event) => setWebhookKey(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>
        </div>

        <button onClick={() => void saveApiKeys()} className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-300 hover:bg-cyan-500/20">
          {t("settings.apiSave", "Save API keys")}
        </button>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">{t("settings.subscriptionTitle", "Subscription")}</h2>
        <p className="mt-2 text-sm text-foreground/65">{t("settings.subscriptionSubtitle", "Current plan and growth path for your workspace.")}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button onClick={() => setSubscriptionPlan("free")} className={`rounded-xl border px-4 py-3 text-sm ${subscriptionPlan === "free" ? "border-foreground bg-foreground text-background" : "border-border-subtle text-foreground/80"}`}>{t("settings.free", "Free")}</button>
          <button onClick={() => setSubscriptionPlan("pro")} className={`rounded-xl border px-4 py-3 text-sm ${subscriptionPlan === "pro" ? "border-foreground bg-foreground text-background" : "border-border-subtle text-foreground/80"}`}>{t("settings.pro", "Pro")}</button>
          <button onClick={() => setSubscriptionPlan("enterprise")} className={`rounded-xl border px-4 py-3 text-sm ${subscriptionPlan === "enterprise" ? "border-foreground bg-foreground text-background" : "border-border-subtle text-foreground/80"}`}>{t("settings.enterprise", "Enterprise")}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">{t("settings.integrationsTitle", "Integrations")}</h2>
        <p className="mt-2 text-sm text-foreground/65">{t("settings.integrationsSubtitle", "Connect your communication and calendar stack.")}</p>

        <div className="mt-5 space-y-3 rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {t("settings.google", "Google")}
            <input type="checkbox" checked={integrations.google} onChange={(event) => setIntegrations((current) => ({ ...current, google: event.target.checked }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {t("settings.gmail", "Gmail")}
            <input type="checkbox" checked={integrations.gmail} onChange={(event) => setIntegrations((current) => ({ ...current, gmail: event.target.checked }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {t("settings.calendar", "Calendar")}
            <input type="checkbox" checked={integrations.calendar} onChange={(event) => setIntegrations((current) => ({ ...current, calendar: event.target.checked }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {t("settings.slack", "Slack")}
            <input type="checkbox" checked={integrations.slack} onChange={(event) => setIntegrations((current) => ({ ...current, slack: event.target.checked }))} />
          </label>
        </div>
      </div>

      <div id="security" tabIndex={-1} className="scroll-mt-24 rounded-2xl border border-border-subtle bg-surface-1 p-6 outline-none">
        <h2 className="text-xl font-semibold text-foreground">{t("settings.securityTitle", "Security")}</h2>
        <p className="mt-2 text-sm text-foreground/65">{t("settings.securitySubtitle", "Password, active sessions, and 2FA readiness.")}</p>

        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/60 p-4 text-sm text-foreground/75">
          <p>{isDe ? "Aktuelle Gerätesitzung" : "Current device session"}: {sessionExpiresAt ? `${isDe ? "aktiv bis" : "active until"} ${new Date(sessionExpiresAt).toLocaleString(locale)}` : (isDe ? "nicht verfügbar" : "not available")}</p>
          <p className="mt-1">2FA {isDe ? "Unterstützung" : "support"}: {mfaAvailable ? (isDe ? "in Supabase verfügbar" : "available in Supabase") : (isDe ? "in dieser Umgebung nicht verfügbar" : "not available in this environment")}</p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border-subtle bg-surface-2/70">
          <table className="w-full text-left text-sm text-foreground/80">
            <thead className="border-b border-border-subtle text-xs uppercase tracking-[0.14em] text-foreground/55">
              <tr>
                <th className="px-4 py-3">{isDe ? "Gerät" : "Device"}</th>
                <th className="px-4 py-3">{isDe ? "Sitzung" : "Session"}</th>
                <th className="px-4 py-3">{isDe ? "Läuft ab" : "Expires"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3">{currentDeviceName}</td>
                <td className="px-4 py-3">{isDe ? "Aktuell" : "Current"}</td>
                <td className="px-4 py-3">{sessionExpiresAt ? new Date(sessionExpiresAt).toLocaleString(locale) : (isDe ? "Unbekannt" : "Unknown")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-sm font-semibold text-foreground">{isDe ? "Authenticator-App (TOTP)" : "Authenticator app (TOTP)"}</p>
          <p className="mt-1 text-xs text-foreground/60">
            {isDe ? "Status" : "Status"}: {mfaStatus === "enabled" ? (isDe ? "Aktiviert" : "Enabled") : mfaStatus === "pending" ? (isDe ? "Verifizierung ausstehend" : "Pending verification") : (isDe ? "Deaktiviert" : "Disabled")}
          </p>

          {qrImageSrc && mfaStatus === "pending" ? (
            <div className="mt-3 rounded-xl border border-border-subtle bg-white p-3">
              <img src={qrImageSrc} alt="MFA QR code" className="mx-auto h-44 w-44 object-contain" />
            </div>
          ) : null}

          {mfaStatus === "pending" ? (
            <div className="mt-3 flex flex-col gap-2 md:flex-row">
              <input
                value={mfaVerifyCode}
                onChange={(event) => setMfaVerifyCode(event.target.value)}
                placeholder={isDe ? "6-stelligen Code eingeben" : "Enter 6-digit code"}
                className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => void verifyMfaEnrollment()}
                disabled={mfaBusy}
                className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 disabled:opacity-60"
              >
                {isDe ? "2FA verifizieren" : "Verify 2FA"}
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void startMfaEnrollment()}
              disabled={mfaBusy || !mfaAvailable || mfaStatus === "enabled"}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-50"
            >
              {mfaStatus === "pending" ? (isDe ? "Setup neu starten" : "Restart setup") : (isDe ? "2FA aktivieren" : "Enable 2FA")}
            </button>
            <button
              onClick={() => void disableMfa()}
              disabled={mfaBusy || mfaStatus === "disabled"}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 disabled:opacity-50"
            >
              {isDe ? "2FA deaktivieren" : "Disable 2FA"}
            </button>

            <button
              onClick={() => void elevateMfaSession()}
              disabled={mfaBusy || mfaStatus !== "enabled"}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-50"
            >
              {isDe ? "2FA für Sitzung bestätigen" : "Verify 2FA for this session"}
            </button>
          </div>
        </div>

        

        <div className="mt-4">
          <label className="text-sm text-foreground/70">
            {t("settings.activeSessions", "Active sessions")}
            <input
              type="number"
              min={1}
              value={sessionCount}
              onChange={(event) =>
                setSessionCount(
                  Math.max(1, Number(event.target.value) || 1)
                )
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t("settings.newPassword", "New password")} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t("settings.confirmPassword", "Confirm new password")} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
        </div>

        <button onClick={changePassword} disabled={changingPassword} className="mt-4 rounded-xl border border-border-subtle px-5 py-3 text-foreground hover:bg-foreground/5 disabled:opacity-60">
          {changingPassword ? t("settings.updatingPassword", "Updating...") : t("settings.changePassword", "Change password")}
        </button>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => void sendMagicLink()} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            {isDe ? "Magic-Anmeldelink senden" : "Send magic sign-in link"}
          </button>
          <button onClick={() => void logoutCurrentSession()} className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5">
            {isDe ? "Dieses Gerät abmelden" : "Sign out this device"}
          </button>
          <button onClick={() => void logoutAllSessions()} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300">
            {isDe ? "Alle Geräte abmelden" : "Sign out all devices"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{isDe ? "Recovery-Codes" : "Recovery codes"}</p>
              <p className="text-xs text-foreground/60">{isDe ? "Verbleibende ungenutzte Codes" : "Remaining unused codes"}: {recoveryRemaining}</p>
            </div>
            <button
              onClick={() => void regenerateRecoveryCodes()}
              disabled={recoveryBusy}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-50"
            >
              {isDe ? "Neue Codes erstellen" : "Generate new codes"}
            </button>
          </div>

          {recoveryCodes.length > 0 ? (
            <div className="mt-3 grid gap-2 rounded-lg border border-border-subtle bg-surface-1 p-3 text-xs text-foreground/80 md:grid-cols-2">
              {recoveryCodes.map((code) => (
                <p key={code} className="rounded border border-border-subtle bg-surface-2 px-2 py-1 font-mono">
                  {code}
                </p>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            <input
              value={recoveryCodeInput}
              onChange={(event) => setRecoveryCodeInput(event.target.value)}
              placeholder={isDe ? "Recovery-Code verwenden" : "Use recovery code"}
              className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => void consumeRecoveryCode()}
              disabled={recoveryBusy}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 disabled:opacity-50"
            >
              {isDe ? "Code verifizieren" : "Verify code"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="text-xl font-semibold text-red-300">{t("settings.accountTitle", "Account")}</h2>
        <p className="mt-2 text-sm text-foreground/65">{t("settings.accountSubtitle", "Sign out from this workspace.")}</p>

        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-200/90">
            {isDe
              ? "Account löschen ist dauerhaft. Gib DELETE ein, um alle zugehörigen CRM-Daten zu entfernen."
              : "Account deletion is permanent. Type DELETE to remove all associated CRM data."}
          </p>

          <input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="DELETE"
            className="mt-3 w-full rounded-xl border border-red-500/20 bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-red-400"
          />

          <button
            onClick={() => void deleteAccount()}
            disabled={deletingAccount}
            className="mt-3 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-60"
          >
            {deletingAccount
              ? (isDe ? "Lösche Account..." : "Deleting account...")
              : (isDe ? "Account dauerhaft löschen" : "Permanently delete account")}
          </button>
        </div>

        <button onClick={logout} className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">{t("settings.logout", "Abmelden")}</button>
      </div>
    </div>
  )
}
