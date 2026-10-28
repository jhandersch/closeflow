"use client";
import { getIntlLocale, translateText  } from "@/lib/i18n";


import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { normalizeLanguage, type AppLanguage } from "@/lib/i18n";

type ProfilePayload = {
  full_name: string;
  avatar_url: string;
  company_name: string;
  phone: string;
  timezone: string;
  language: string;
};

const timezoneOptions = [
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Zurich",
  "UTC",
];

const DEFAULT_TIMEZONE = "Europe/Berlin";

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(getIntlLocale(), {
      timeZone,
    }).format();

    return true;
  } catch {
    return false;
  }
}

export default function ProfileSettingsPage() {
  const { language: appLanguage, setLanguage: setAppLanguage } = useAppPreferences();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<ProfilePayload>({
    full_name: "",
    avatar_url: "",
    company_name: "",
    phone: "",
    timezone: DEFAULT_TIMEZONE,
    language: appLanguage,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(translateText("Could not load profile."));
        }

        const data = await response.json();

        const storedTimezone =
          typeof data.timezone === "string" && isValidTimeZone(data.timezone)
            ? data.timezone
            : DEFAULT_TIMEZONE;

        setProfile({
          full_name: data.name || data.full_name || "",
          avatar_url: data.avatar || data.avatar_url || "",
          company_name: data.company || data.company_name || "",
          phone: data.phone || "",
          timezone: storedTimezone,
          language: normalizeLanguage(data.language),
        });
      } catch {
        toast.error(translateText("Could not load profile."));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const updateField = <K extends keyof ProfilePayload>(
    field: K,
    value: ProfilePayload[K],
  ) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const save = async () => {
    setSaving(true);

    try {
      const payload: ProfilePayload = {
        ...profile,
        language: profile.language,
        timezone: isValidTimeZone(profile.timezone)
          ? profile.timezone
          : DEFAULT_TIMEZONE,
      };

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not save profile.",
        );
      }

      setProfile(payload);
      setAppLanguage(normalizeLanguage(payload.language));

      toast.success(translateText("Profile saved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="text-foreground">{translateText("Loading profile...")}</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
            {translateText("Profile")}</p>

          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {translateText("Manage your personal details")}</h1>

          <p className="mt-2 text-sm text-foreground/65">
            {translateText("Manage your profile, company details, and preferences.")}</p>
        </div>

        <div className="space-y-6 rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <label className="block text-sm text-foreground/70">
            {translateText("Name")}<input
              value={profile.full_name}
              onChange={(event) =>
                updateField("full_name", event.target.value)
              }
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block text-sm text-foreground/70">
            {translateText("Avatar URL")}<input
              value={profile.avatar_url}
              onChange={(event) =>
                updateField("avatar_url", event.target.value)
              }
              type="url"
              autoComplete="url"
              placeholder={translateText("https://...")}
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block text-sm text-foreground/70">
            {translateText("Company")}<input
              value={profile.company_name}
              onChange={(event) =>
                updateField("company_name", event.target.value)
              }
              autoComplete="organization"
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block text-sm text-foreground/70">
            {translateText("Phone")}<input
              value={profile.phone}
              onChange={(event) =>
                updateField("phone", event.target.value)
              }
              type="tel"
              autoComplete="tel"
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block text-sm text-foreground/70">
            {translateText("Timezone")}<select
              value={profile.timezone}
              onChange={(event) =>
                updateField("timezone", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-foreground/50">
              {translateText("Your profile preferences are saved to your CloseFlow account.")}</p>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="cf-btn-primary"
            >
              {saving ? translateText("Saving...") : translateText("Save profile")}
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
