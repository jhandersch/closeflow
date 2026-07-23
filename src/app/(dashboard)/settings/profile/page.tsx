"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import type { AppLanguage } from "@/lib/i18n"

type ProfilePayload = {
  full_name: string
  avatar_url: string
  company_name: string
  phone: string
  timezone: string
  language: string
}

const timezoneOptions = ["Europe/Berlin", "Europe/Vienna", "Europe/Zurich", "UTC"]

export default function ProfileSettingsPage() {
  const { language: appLanguage, setLanguage } = useAppPreferences()
  const isDe = appLanguage === "de"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProfilePayload>({
    full_name: "",
    avatar_url: "",
    company_name: "",
    phone: "",
    timezone: "Europe/Berlin",
    language: appLanguage,
  })

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile({
          full_name: data.name || data.full_name || "",
          avatar_url: data.avatar || data.avatar_url || "",
          company_name: data.company || data.company_name || "",
          phone: data.phone || "",
          timezone: data.timezone || "Europe/Berlin",
          language: data.language || appLanguage,
        })
      }
      setLoading(false)
    }

    void load()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }

      await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profile.phone,
          timezone: profile.timezone,
          language: profile.language,
        }),
      })

      await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: profile.avatar_url }),
      })

      setLanguage((profile.language as AppLanguage) || appLanguage)
      toast.success(isDe ? "Profil gespeichert" : "Profile saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isDe ? "Profil konnte nicht gespeichert werden" : "Could not save profile"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <AuthGuard><div className="text-foreground">{isDe ? "Profil wird geladen..." : "Loading profile..."}</div></AuthGuard>
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{isDe ? "Profil" : "Profile"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Nutzerprofil" : "User profile"}</h1>
          <p className="mt-2 text-sm text-foreground/65">{isDe ? "Verwalte dein öffentliches Profil, Firmendaten und Präferenzen." : "Manage your public profile, company details, and preferences."}</p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 space-y-4">
          <label className="block text-sm text-foreground/70">
            {isDe ? "Name" : "Name"}
            <input value={profile.full_name} onChange={(event) => setProfile((current) => ({ ...current, full_name: event.target.value }))} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="block text-sm text-foreground/70">
            {isDe ? "Avatar-URL" : "Avatar URL"}
            <input value={profile.avatar_url} onChange={(event) => setProfile((current) => ({ ...current, avatar_url: event.target.value }))} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="block text-sm text-foreground/70">
            {isDe ? "Firma" : "Company"}
            <input value={profile.company_name} onChange={(event) => setProfile((current) => ({ ...current, company_name: event.target.value }))} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="block text-sm text-foreground/70">
            {isDe ? "Telefon" : "Phone"}
            <input value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
          </label>

          <label className="block text-sm text-foreground/70">
            {isDe ? "Zeitzone" : "Timezone"}
            <select value={profile.timezone} onChange={(event) => setProfile((current) => ({ ...current, timezone: event.target.value }))} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400">
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-foreground/70">
            {isDe ? "Sprache" : "Language"}
            <select value={profile.language} onChange={(event) => setProfile((current) => ({ ...current, language: event.target.value }))} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </label>

          <button onClick={() => void save()} disabled={saving} className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black disabled:opacity-60">
            {saving ? (isDe ? "Speichere..." : "Saving...") : (isDe ? "Profil speichern" : "Save profile")}
          </button>
        </div>
      </div>
    </AuthGuard>
  )
}
