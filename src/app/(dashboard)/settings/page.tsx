"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [openAiKey, setOpenAiKey] = useState("")
  const [webhookKey, setWebhookKey] = useState("")

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

      setEmail(user.email || "")
      setName(metadata.name || "")
      setUsername(metadata.username || "")
      setAvatarUrl(metadata.avatar_url || "")
      setCompanyName(metadata.company_name || "")
      setIndustry(metadata.industry || "")
      setTeamSize(metadata.team_size || "")
      const nextLanguage = (metadata.language as AppLanguage) || appLanguage
      const nextTheme = (metadata.theme as ThemeOption) || appTheme
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
      setSessionCount(Number(metadata.session_count || 1))
      setTwoFactorEnabled(Boolean(metadata.two_factor_enabled))

      setOpenAiKey(window.localStorage.getItem(LOCAL_STORAGE_KEYS.openai) || "")
      setWebhookKey(window.localStorage.getItem(LOCAL_STORAGE_KEYS.webhook) || "")

      setLoading(false)
    }

    void loadUser()
  }, [appLanguage, appTheme, router, setAppLanguage, setAppTheme])

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
      toast.error(error.message || "Could not save profile")
    } else {
      toast.success("Profile and company settings updated")
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
        two_factor_enabled: twoFactorEnabled,
      },
    })

    if (error) {
      toast.error(error.message || "Could not save preferences")
    } else {
      toast.success("Preferences updated")
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
      toast.error(error.message || "Could not save API key flags")
      return
    }

    toast.success("API key settings saved")
  }

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast.error(error.message || "Could not change password")
    } else {
      toast.success("Password updated")
      setNewPassword("")
      setConfirmPassword("")
    }

    setChangingPassword(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return <div className="text-foreground">{t("common.loading", "Loading...")}</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("settings.title", "Settings")}</h1>
        <p className="mt-2 text-foreground/65">{t("settings.subtitle", "Manage your CloseFlow workspace, preferences, and security.")}</p>
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
              alt="Profile preview"
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

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">{t("settings.securityTitle", "Security")}</h2>
        <p className="mt-2 text-sm text-foreground/65">{t("settings.securitySubtitle", "Password, active sessions, and 2FA readiness.")}</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-foreground/70">
            {t("settings.activeSessions", "Active sessions")}
            <input type="number" min={1} value={sessionCount} onChange={(event) => setSessionCount(Math.max(1, Number(event.target.value) || 1))} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-2/70 px-4 py-3 text-sm text-foreground/80">
            {t("settings.twoFactor", "Two-factor authentication (2FA)")}
            <input type="checkbox" checked={twoFactorEnabled} onChange={(event) => setTwoFactorEnabled(event.target.checked)} />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t("settings.newPassword", "New password")} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t("settings.confirmPassword", "Confirm new password")} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
        </div>

        <button onClick={changePassword} disabled={changingPassword} className="mt-4 rounded-xl border border-border-subtle px-5 py-3 text-foreground hover:bg-foreground/5 disabled:opacity-60">
          {changingPassword ? t("settings.updatingPassword", "Updating...") : t("settings.changePassword", "Change password")}
        </button>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="text-xl font-semibold text-red-300">{t("settings.accountTitle", "Account")}</h2>
        <p className="mt-2 text-sm text-foreground/65">{t("settings.accountSubtitle", "Sign out from this workspace.")}</p>

        <button onClick={logout} className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">{t("settings.logout", "Logout")}</button>
      </div>
    </div>
  )
}
