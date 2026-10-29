"use client";
import { getIntlLocale, translateText  } from "@/lib/i18n";

import { readApiError, toDisplayMessage } from "@/lib/apiError";
import { appPrompt } from "@/lib/dialogs";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  useAppPreferences,
} from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
import { normalizeLanguage, type AppLanguage } from "@/lib/i18n";

type ThemeOption = "dark" | "light";

type NotificationSettings = {
  browser: boolean;
  email: boolean;
  taskReminders: boolean;
};

type Integrations = {
  google: boolean;
  gmail: boolean;
  calendar: boolean;
  slack: boolean;
};

const DEFAULT_TIMEZONE = "Europe/Berlin";

const TIMEZONE_OPTIONS = [
  { value: "Europe/Berlin", label: "Europe/Berlin — Berlin" },
  { value: "Europe/London", label: "Europe/London — London" },
  { value: "Europe/Paris", label: "Europe/Paris — Paris" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam — Amsterdam" },
  { value: "Europe/Brussels", label: "Europe/Brussels — Brussels" },
  { value: "Europe/Madrid", label: "Europe/Madrid — Madrid" },
  { value: "Europe/Rome", label: "Europe/Rome — Rome" },
  { value: "Europe/Vienna", label: "Europe/Vienna — Vienna" },
  { value: "Europe/Zurich", label: "Europe/Zurich — Zurich" },
  { value: "Europe/Stockholm", label: "Europe/Stockholm — Stockholm" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw — Warsaw" },

  { value: "America/New_York", label: "America/New_York — New York" },
  { value: "America/Chicago", label: "America/Chicago — Chicago" },
  { value: "America/Denver", label: "America/Denver — Denver" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles — Los Angeles" },
  { value: "America/Toronto", label: "America/Toronto — Toronto" },
  { value: "America/Vancouver", label: "America/Vancouver — Vancouver" },

  { value: "America/Sao_Paulo", label: "America/Sao_Paulo — São Paulo" },
  {
    value: "America/Argentina/Buenos_Aires",
    label: "America/Argentina/Buenos_Aires — Buenos Aires",
  },

  { value: "Asia/Dubai", label: "Asia/Dubai — Dubai" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata — Kolkata" },
  { value: "Asia/Singapore", label: "Asia/Singapore — Singapore" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai — Shanghai" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo — Tokyo" },
  { value: "Asia/Seoul", label: "Asia/Seoul — Seoul" },

  { value: "Africa/Cairo", label: "Africa/Cairo — Cairo" },
  {
    value: "Africa/Johannesburg",
    label: "Africa/Johannesburg — Johannesburg",
  },

  { value: "Australia/Sydney", label: "Australia/Sydney — Sydney" },
  { value: "Australia/Perth", label: "Australia/Perth — Perth" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland — Auckland" },
] as const;

const formatDateTime = (value: string, timeZone: string) => {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
};

const isValidTimeZone = (value: string) => {
  try {
    Intl.DateTimeFormat(getIntlLocale(), {
      timeZone: value,
    });
    return true;
  } catch {
    return false;
  }
};

export default function SettingsPage() {
  const router = useRouter();

  const {
    theme: appTheme,
    setTheme: setAppTheme,
    language: appLanguage,
    setLanguage: setAppLanguage,
  } = useAppPreferences();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [theme, setTheme] = useState<ThemeOption>(appTheme);
  const [languageDraft, setLanguageDraft] = useState<AppLanguage>(appLanguage);

  const [notifications, setNotifications] =
    useState<NotificationSettings>({
      browser: true,
      email: true,
      taskReminders: true,
    });

  const [integrations, setIntegrations] = useState<Integrations>({
    google: false,
    gmail: false,
    calendar: false,
    slack: false,
  });

  const [sessionCount, setSessionCount] = useState(1);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(
    null
  );
  const [currentDeviceName, setCurrentDeviceName] = useState("");

  const [mfaAvailable, setMfaAvailable] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaStatus, setMfaStatus] = useState<
    "disabled" | "pending" | "enabled"
  >("disabled");
  const [mfaBusy, setMfaBusy] = useState(false);

  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryRemaining, setRecoveryRemaining] = useState(0);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  };

  const loadRecoveryStatus = async () => {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(
      "/api/security/recovery-codes/status",
      {
        headers: authHeaders,
      }
    );

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      remaining?: number;
    };

    setRecoveryRemaining(Number(data.remaining || 0));
  };

  const syncMfaState = async () => {
    const mfaApi = (
      supabase.auth as unknown as {
        mfa?: any;
      }
    ).mfa;

    if (!mfaApi?.listFactors) {
      setMfaAvailable(false);
      setMfaStatus("disabled");
      setMfaFactorId(null);
      return;
    }

    setMfaAvailable(true);

    const { data, error } = await mfaApi.listFactors();

    if (error) {
      setMfaStatus("disabled");
      setMfaFactorId(null);
      return;
    }

    const totpFactors = data?.totp || [];

    const verified = totpFactors.find(
      (factor: any) => factor.status === "verified"
    );

    const pending = totpFactors.find(
      (factor: any) => factor.status === "unverified"
    );

    if (verified?.id) {
      setMfaStatus("enabled");
      setMfaFactorId(verified.id);
      setTwoFactorEnabled(true);
      setMfaQrCode(null);
      return;
    }

    if (pending?.id) {
      setMfaStatus("pending");
      setMfaFactorId(pending.id);
      setTwoFactorEnabled(false);
      return;
    }

    setMfaStatus("disabled");
    setMfaFactorId(null);
    setTwoFactorEnabled(false);
  };

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const metadata = user.user_metadata || {};

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      setEmail(user.email || "");
      const profileResponse = await fetch("/api/profile", { cache: "no-store" });
      const profileData = profileResponse.ok ? await profileResponse.json() : null;
      const storedLanguage = normalizeLanguage(profileData?.language ?? metadata.language);
      setLanguageDraft(storedLanguage);
      setAppLanguage(storedLanguage);
      setName(metadata.name || "");
      setUsername(metadata.username || "");
      setAvatarUrl(metadata.avatar_url || "");
      setCompanyName(metadata.company_name || "");
      setIndustry(metadata.industry || "");
      setTeamSize(metadata.team_size || "");

      const storedTimezone =
        typeof metadata.timezone === "string"
          ? metadata.timezone
          : DEFAULT_TIMEZONE;

      setTimezone(
        isValidTimeZone(storedTimezone)
          ? storedTimezone
          : DEFAULT_TIMEZONE
      );

      setNotifications({
        browser: metadata.notifications?.browser ?? true,
        email: metadata.notifications?.email ?? true,
        taskReminders: metadata.notifications?.taskReminders ?? true,
      });

      setIntegrations({
        google: metadata.integrations?.google ?? false,
        gmail: metadata.integrations?.gmail ?? false,
        calendar: metadata.integrations?.calendar ?? false,
        slack: metadata.integrations?.slack ?? false,
      });

      setSessionCount(
        Number(metadata.session_count || (session ? 1 : 0))
      );

      setTwoFactorEnabled(Boolean(metadata.two_factor_enabled));

      setSessionExpiresAt(
        session?.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null
      );

      setCurrentDeviceName(
        window.navigator.userAgent || "Current browser"
      );

      setMfaAvailable(
        Boolean(
          (
            supabase.auth as unknown as {
              mfa?: unknown;
            }
          ).mfa
        )
      );

      await syncMfaState();
      await loadRecoveryStatus();

      // Remove keys stored by earlier versions of this page.
      window.localStorage.removeItem("closeflow_openai_key");
      window.localStorage.removeItem("closeflow_webhook_key");

      if (active) {
        setLoading(false);
      }
    };

    void loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.location.hash !== "#security") {
      return;
    }

    const target = document.getElementById("security");

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    target.focus({
      preventScroll: true,
    });
  }, []);

  useEffect(() => {
    setTheme(appTheme);
  }, [appTheme]);

  const saveProfile = async () => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedName) {
      toast.error(translateText("Name is required"));
      return;
    }

    if (!trimmedUsername) {
      toast.error(translateText("Username is required"));
      return;
    }

    setSavingProfile(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        name: trimmedName,
        username: trimmedUsername,
        avatar_url: avatarUrl.trim(),
        company_name: companyName.trim(),
        industry: industry.trim(),
        team_size: teamSize.trim(),
      },
    });

    if (error) {
      toast.error(toDisplayMessage(error, "Could not save profile"));
    } else {
      toast.success(translateText("Profile and company settings updated"));
    }

    setSavingProfile(false);
  };

  const savePreferences = async () => {
    setSavingPreferences(true);

    if (
      notifications.browser &&
      Notification.permission === "default"
    ) {
      await Notification.requestPermission();
    }

    const nextTimezone = isValidTimeZone(timezone)
      ? timezone
      : DEFAULT_TIMEZONE;

    setTimezone(nextTimezone);

    const response = await fetch("/api/profile/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: languageDraft,
        theme,
        timezone: nextTimezone,
        notifications,
        integrations,
        session_count: sessionCount,
      }),
    });

    if (!response.ok) {
      toast.error(await readApiError(response, "Could not save language preference"));
      setSavingPreferences(false);
      return;
    }

    setAppLanguage(languageDraft);
    toast.success(translateText("Preferences updated"));

    setSavingPreferences(false);
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error(translateText("Password must be at least 8 characters"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(translateText("Passwords do not match"));
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(toDisplayMessage(error, "Could not change password"));
    } else {
      toast.success(translateText("Password updated"));
      setNewPassword("");
      setConfirmPassword("");
    }

    setChangingPassword(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const deleteAccount = async () => {
    if (deleteConfirmation.trim() !== "DELETE") {
      toast.error(translateText("Type DELETE to confirm"));
      return;
    }

    setDeletingAccount(true);

    const authHeaders = await getAuthHeaders();

    const response = await fetch("/api/profile/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        confirmation: deleteConfirmation.trim(),
      }),
    });

    if (!response.ok) {
      toast.error(await readApiError(response, "Could not delete account"));
      setDeletingAccount(false);
      return;
    }

    await supabase.auth.signOut({
      scope: "global",
    });

    toast.success(translateText("Account deleted"));
    router.push("/login");
  };

  const logoutCurrentSession = async () => {
    await supabase.auth.signOut({
      scope: "local",
    });

    router.push("/login");
  };

  const logoutAllSessions = async () => {
    await supabase.auth.signOut({
      scope: "global",
    });

    router.push("/login");
  };

  const sendMagicLink = async () => {
    if (!email.trim()) {
      toast.error(translateText("No email found for this account"));
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      toast.error(toDisplayMessage(error, "Could not send magic link"));
    } else {
      toast.success(translateText("Magic link sent"));
    }
  };

  const startMfaEnrollment = async () => {
    const mfaApi = (
      supabase.auth as unknown as {
        mfa?: any;
      }
    ).mfa;

    if (!mfaApi?.enroll) {
      toast.error(translateText("MFA is not available in this environment"));
      return;
    }

    setMfaBusy(true);

    const { data, error } = await mfaApi.enroll({
      factorType: "totp",
      friendlyName: "CloseFlow Authenticator",
      issuer: "CloseFlow",
    });

    if (error) {
      toast.error(toDisplayMessage(error, "Could not start 2FA setup"));
      setMfaBusy(false);
      return;
    }

    setMfaFactorId(data?.id || null);
    setMfaQrCode(data?.totp?.qr_code || null);
    setMfaStatus("pending");

    toast.success(
      translateText("2FA setup started. Scan the QR code and verify.")
    );

    setMfaBusy(false);
  };

  const verifyMfaEnrollment = async () => {
    const mfaApi = (
      supabase.auth as unknown as {
        mfa?: any;
      }
    ).mfa;

    if (!mfaApi?.challengeAndVerify || !mfaFactorId) {
      toast.error(translateText("2FA factor is missing"));
      return;
    }

    if (!mfaVerifyCode.trim()) {
      toast.error(translateText("Authentication code is required"));
      return;
    }

    setMfaBusy(true);

    const { error } = await mfaApi.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaVerifyCode.trim(),
    });

    if (error) {
      toast.error(toDisplayMessage(error, "Could not verify 2FA code"));
      setMfaBusy(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        two_factor_enabled: true,
      },
    });

    setMfaVerifyCode("");
    setMfaQrCode(null);

    await syncMfaState();

    toast.success(translateText("Two-factor authentication enabled"));
    setMfaBusy(false);
  };

  const elevateMfaSession = async () => {
    const mfaApi = (
      supabase.auth as unknown as {
        mfa?: any;
      }
    ).mfa;

    if (
      !mfaApi?.challenge ||
      !mfaApi?.verify ||
      !mfaFactorId
    ) {
      toast.error(translateText("Could not start MFA session."));
      return;
    }

    const code = await appPrompt(translateText("Enter the 6-digit code from your authenticator app:"), { title: translateText("Verify authenticator code"), confirmLabel: translateText("Verify"), inputMode: "numeric", autoComplete: "one-time-code", maxLength: 6 });

    if (!code?.trim()) {
      return;
    }

    setMfaBusy(true);

    try {
      const {
        data: challengeData,
        error: challengeError,
      } = await mfaApi.challenge({
        factorId: mfaFactorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      const { error: verifyError } = await mfaApi.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: code.trim(),
      });

      if (verifyError) {
        throw verifyError;
      }

      toast.success(
        translateText("MFA session verified. AAL2 is now active.")
      );
    } catch (error) {
      console.error("MFA ELEVATION ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not verify MFA."
      );
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    const mfaApi = (
      supabase.auth as unknown as {
        mfa?: any;
      }
    ).mfa;

    if (!mfaApi?.unenroll || !mfaFactorId) {
      toast.error(translateText("No 2FA factor to disable"));
      return;
    }

    setMfaBusy(true);

    try {
      const {
        data: aal,
        error: aalError,
      } = await mfaApi.getAuthenticatorAssuranceLevel();

      if (aalError) {
        toast.error(
          aalError.message ||
            "Could not check authentication assurance level"
        );
        return;
      }

      if (aal.currentLevel !== "aal2") {
        toast.error(
          translateText("Please verify your 2FA with your authenticator code first.")
        );
        return;
      }

      const { error } = await mfaApi.unenroll({
        factorId: mfaFactorId,
      });

      if (error) {
        toast.error(
          error.message || "Could not disable 2FA"
        );
        return;
      }

      await supabase.auth.updateUser({
        data: {
          two_factor_enabled: false,
        },
      });

      setMfaVerifyCode("");
      setMfaQrCode(null);

      await syncMfaState();

      toast.success(translateText("Two-factor authentication disabled"));
    } finally {
      setMfaBusy(false);
    }
  };

  const qrImageSrc = mfaQrCode
    ? mfaQrCode.startsWith("data:")
      ? mfaQrCode
      : `data:image/svg+xml;utf8,${encodeURIComponent(mfaQrCode)}`
    : null;

  const regenerateRecoveryCodes = async () => {
    setRecoveryBusy(true);

    const authHeaders = await getAuthHeaders();

    const response = await fetch(
      "/api/security/recovery-codes/regenerate",
      {
        method: "POST",
        headers: authHeaders,
      }
    );

    if (!response.ok) {
      toast.error(
        await readApiError(response, "Could not generate recovery codes"),
      );

      setRecoveryBusy(false);
      return;
    }

    const data = (await response.json()) as {
      codes?: string[];
    };

    setRecoveryCodes(
      Array.isArray(data.codes) ? data.codes : []
    );

    setRecoveryCodeInput("");

    await loadRecoveryStatus();

    toast.success(translateText("Recovery codes generated"));
    setRecoveryBusy(false);
  };

  const consumeRecoveryCode = async () => {
    if (!recoveryCodeInput.trim()) {
      toast.error(translateText("Enter a recovery code"));
      return;
    }

    setRecoveryBusy(true);

    const authHeaders = await getAuthHeaders();

    const response = await fetch(
      "/api/security/recovery-codes/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          code: recoveryCodeInput,
        }),
      }
    );

    if (!response.ok) {
      toast.error(await readApiError(response, "Invalid recovery code"));

      setRecoveryBusy(false);
      return;
    }

    setRecoveryCodeInput("");

    await loadRecoveryStatus();

    toast.success(
      translateText("Recovery code accepted and marked as used")
    );

    setRecoveryBusy(false);
  };

  if (loading) {
    return (
      <div className="text-foreground">
        {translateText("Loading...")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
          {translateText("Settings")}</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          {translateText("Manage your workspace and preferences")}</h1>

        <p className="mt-2 text-foreground/65">
          {translateText("Manage your CloseFlow workspace, preferences, and security.")}</p>

        <div className="mt-4">
          <Link
            href="/settings/profile"
            className="inline-flex rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
          >
            {translateText("Open profile settings")}</Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">
          {translateText("Profile and Company")}</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-foreground/70">
            {translateText("Name")}<input
              required
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="text-sm text-foreground/70">
            {translateText("Username")}<input
              required
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="text-sm text-foreground/70 md:col-span-2">
            {translateText("Profile image URL")}<input
              value={avatarUrl}
              onChange={(event) =>
                setAvatarUrl(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="text-sm text-foreground/70">
            {translateText("Company name")}<input
              value={companyName}
              onChange={(event) =>
                setCompanyName(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="text-sm text-foreground/70">
            {translateText("Industry")}<input
              value={industry}
              onChange={(event) =>
                setIndustry(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="text-sm text-foreground/70">
            {translateText("Team size")}<input
              value={teamSize}
              onChange={(event) =>
                setTeamSize(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>

          <label className="text-sm text-foreground/70">
            {translateText("Email")}<div className="mt-2 rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground/80">
              {email}
            </div>
          </label>
        </div>

        {avatarUrl ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-2 px-3 py-2">
            <img
              src={avatarUrl}
              alt={translateText("Profile preview")}
              className="h-10 w-10 rounded-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />

            <span className="text-xs text-foreground/65">
              {translateText("Preview")}</span>
          </div>
        ) : null}

        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="mt-5 rounded-xl bg-foreground px-5 py-3 font-semibold text-background disabled:opacity-50"
        >
          {savingProfile
            ? translateText("Saving...")
            : translateText("Save profile and company")}
        </button>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">
          {translateText("Preferences")}</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-foreground/70">
            {translateText("Theme")}<select
              value={theme}
              onChange={(event) => {
                const value =
                  event.target.value as ThemeOption;

                setTheme(value);
                setAppTheme(value);
              }}
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            >
              <option value="dark">{translateText("Dark mode")}</option>
              <option value="light">{translateText("Light mode")}</option>
            </select>
          </label>

          <label className="text-sm text-foreground/70">
            {appLanguage === "de" ? "Sprache" : "Language"}<select
              value={languageDraft}
              onChange={(event) => setLanguageDraft(normalizeLanguage(event.target.value))}
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            >
              <option value="de">{translateText("Deutsch")}</option>
              <option value="en">{translateText("English")}</option>
            </select>
          </label>

          <label className="text-sm text-foreground/70">
            {translateText("Time zone")}<select
              value={timezone}
              onChange={(event) =>
                setTimezone(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {translateText("Browser notifications")}<input
              type="checkbox"
              checked={notifications.browser}
              onChange={(event) =>
                setNotifications((current) => ({
                  ...current,
                  browser: event.target.checked,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {translateText("Email notifications")}<input
              type="checkbox"
              checked={notifications.email}
              onChange={(event) =>
                setNotifications((current) => ({
                  ...current,
                  email: event.target.checked,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {translateText("Task reminders")}<input
              type="checkbox"
              checked={notifications.taskReminders}
              onChange={(event) =>
                setNotifications((current) => ({
                  ...current,
                  taskReminders: event.target.checked,
                }))
              }
            />
          </label>
        </div>

        <button
          onClick={savePreferences}
          disabled={savingPreferences}
          className="mt-5 rounded-xl border border-border-subtle px-5 py-3 text-foreground hover:bg-foreground/5 disabled:opacity-60"
        >
          {savingPreferences
            ? translateText("Saving...")
            : translateText("Save preferences")}
        </button>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">
          {translateText("Integrations")}</h2>

        <p className="mt-2 text-sm text-foreground/65">
          {translateText("Connect your communication and calendar stack.")}</p>

        <div className="mt-5 space-y-3 rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {translateText("Google")}<input
              type="checkbox"
              checked={integrations.google}
              onChange={(event) =>
                setIntegrations((current) => ({
                  ...current,
                  google: event.target.checked,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {translateText("Gmail")}<input
              type="checkbox"
              checked={integrations.gmail}
              onChange={(event) =>
                setIntegrations((current) => ({
                  ...current,
                  gmail: event.target.checked,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {translateText("Calendar")}<input
              type="checkbox"
              checked={integrations.calendar}
              onChange={(event) =>
                setIntegrations((current) => ({
                  ...current,
                  calendar: event.target.checked,
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-foreground/80">
            {translateText("Slack")}<input
              type="checkbox"
              checked={integrations.slack}
              onChange={(event) =>
                setIntegrations((current) => ({
                  ...current,
                  slack: event.target.checked,
                }))
              }
            />
          </label>
        </div>
      </div>

      <div
        id="security"
        tabIndex={-1}
        className="scroll-mt-24 rounded-2xl border border-border-subtle bg-surface-1 p-6 outline-none"
      >
        <h2 className="text-xl font-semibold text-foreground">
          {translateText("Security")}</h2>

        <p className="mt-2 text-sm text-foreground/65">
          {translateText("Password, active sessions, and 2FA readiness.")}</p>

        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/60 p-4 text-sm text-foreground/75">
          <p>
            {translateText("Current device session:")}{" "}
            {sessionExpiresAt
              ? `active until ${formatDateTime(
                  sessionExpiresAt,
                  timezone
                )}`
              : translateText("not available")}
          </p>

          <p className="mt-1">
            {translateText("2FA support:")}{" "}
            {mfaAvailable
              ? translateText("available in Supabase")
              : translateText("not available in this environment")}
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border-subtle bg-surface-2/70">
          <table className="w-full text-left text-sm text-foreground/80">
            <thead className="border-b border-border-subtle text-xs uppercase tracking-[0.14em] text-foreground/55">
              <tr>
                <th className="px-4 py-3">{translateText("Device")}</th>
                <th className="px-4 py-3">{translateText("Session")}</th>
                <th className="px-4 py-3">{translateText("Expires")}</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="px-4 py-3">
                  {currentDeviceName}
                </td>

                <td className="px-4 py-3">
                  {translateText("Current")}</td>

                <td className="px-4 py-3">
                  {sessionExpiresAt
                    ? formatDateTime(
                        sessionExpiresAt,
                        timezone
                      )
                    : translateText("Unknown")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-sm font-semibold text-foreground">
            {translateText("Authenticator app (TOTP)")}</p>

          <p className="mt-1 text-xs text-foreground/60">
            {translateText("Status:")}{" "}
            {mfaStatus === "enabled"
              ? translateText("Enabled")
              : mfaStatus === "pending"
                ? translateText("Pending verification")
                : translateText("Disabled")}
          </p>

          {qrImageSrc && mfaStatus === "pending" ? (
            <div className="mt-3 rounded-xl border border-border-subtle bg-white p-3">
              <img
                src={qrImageSrc}
                alt={translateText("MFA QR code")}
                className="mx-auto h-44 w-44 object-contain"
              />
            </div>
          ) : null}

          {mfaStatus === "pending" ? (
            <div className="mt-3 flex flex-col gap-2 md:flex-row">
              <input
                value={mfaVerifyCode}
                onChange={(event) =>
                  setMfaVerifyCode(event.target.value)
                }
                placeholder={translateText("Enter 6-digit code")}
                className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
              />

              <button
                onClick={() => void verifyMfaEnrollment()}
                disabled={mfaBusy}
                className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 disabled:opacity-60"
              >
                {translateText("Verify 2FA")}</button>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void startMfaEnrollment()}
              disabled={
                mfaBusy ||
                !mfaAvailable ||
                mfaStatus === "enabled"
              }
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-50"
            >
              {mfaStatus === "pending"
                ? translateText("Restart setup")
                : translateText("Enable 2FA")}
            </button>

            <button
              onClick={() => void disableMfa()}
              disabled={
                mfaBusy || mfaStatus === "disabled"
              }
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 disabled:opacity-50"
            >
              {translateText("Disable 2FA")}</button>

            <button
              onClick={() => void elevateMfaSession()}
              disabled={
                mfaBusy || mfaStatus !== "enabled"
              }
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-50"
            >
              {translateText("Verify 2FA for this session")}</button>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-foreground/70">
            {translateText("Active sessions")}<input
              type="number"
              min={1}
              value={sessionCount}
              onChange={(event) =>
                setSessionCount(
                  Math.max(
                    1,
                    Number(event.target.value) || 1
                  )
                )
              }
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(event) =>
              setNewPassword(event.target.value)
            }
            placeholder={translateText("New password")}
            className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            placeholder={translateText("Confirm new password")}
            className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
          />
        </div>

        <button
          onClick={changePassword}
          disabled={changingPassword}
          className="mt-4 rounded-xl border border-border-subtle px-5 py-3 text-foreground hover:bg-foreground/5 disabled:opacity-60"
        >
          {changingPassword
            ? translateText("Updating...")
            : translateText("Change password")}
        </button>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => void sendMagicLink()}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
          >
            {translateText("Send magic sign-in link")}</button>

          <button
            onClick={() => void logoutCurrentSession()}
            className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5"
          >
            {translateText("Sign out this device")}</button>

          <button
            onClick={() => void logoutAllSessions()}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300"
          >
            {translateText("Sign out all devices")}</button>
        </div>

        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {translateText("Recovery codes")}</p>

              <p className="text-xs text-foreground/60">
                {translateText("Remaining unused codes:")}{recoveryRemaining}
              </p>
            </div>

            <button
              onClick={() =>
                void regenerateRecoveryCodes()
              }
              disabled={recoveryBusy}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-50"
            >
              {translateText("Generate new codes")}</button>
          </div>

          {recoveryCodes.length > 0 ? (
            <div className="mt-3 grid gap-2 rounded-lg border border-border-subtle bg-surface-1 p-3 text-xs text-foreground/80 md:grid-cols-2">
              {recoveryCodes.map((code) => (
                <p
                  key={code}
                  className="rounded border border-border-subtle bg-surface-2 px-2 py-1 font-mono"
                >
                  {code}
                </p>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            <input
              value={recoveryCodeInput}
              onChange={(event) =>
                setRecoveryCodeInput(event.target.value)
              }
              placeholder={translateText("Use recovery code")}
              className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />

            <button
              onClick={() => void consumeRecoveryCode()}
              disabled={recoveryBusy}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 disabled:opacity-50"
            >
              {translateText("Verify code")}</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="text-xl font-semibold text-red-300">
          {translateText("Account")}</h2>

        <p className="mt-2 text-sm text-foreground/65">
          {translateText("Sign out from this workspace.")}</p>

        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-rose-300">
            {translateText("Account deletion is permanent. Type DELETE to remove all associated CRM data.")}</p>

          <input
            value={deleteConfirmation}
            onChange={(event) =>
              setDeleteConfirmation(event.target.value)
            }
            placeholder={translateText("DELETE")}
            className="mt-3 w-full rounded-xl border border-red-500/20 bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-red-400"
          />

          <button
            onClick={() => void deleteAccount()}
            disabled={deletingAccount}
            className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 disabled:opacity-60"
          >
            {deletingAccount
              ? translateText("Deleting account...")
              : translateText("Permanently delete account")}
          </button>
        </div>

        <button
          onClick={logout}
          className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
        >
          {translateText("Sign out")}</button>
      </div>
    </div>
  );
}
