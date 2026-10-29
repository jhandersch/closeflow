"use client";
import { formatTextForLanguage, translateText } from "@/lib/i18n";


import { useState } from "react";
import toast from "react-hot-toast";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";

export default function AIFollowUp({
  lead,
}: {
  lead: any;
}) {
  const { language } = useAppPreferences();
  const [loading, setLoading] = useState(false);
  const [mail, setMail] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);

    const res = await fetch("/api/follow-up-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lead,
        language,
      }),
    });

    const data = await res.json();
    setMail(data);

    await fetch("/api/activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadId: lead.id,
        action: "AI generated follow-up email",
        type: "ai",
      }),
    });

    setLoading(false);
  }

  async function copyEmail() {
    if (!mail) {
      return;
    }

    try {
      await copyTextToClipboard(
        `${formatTextForLanguage(mail.subject, language)}\n\n${formatTextForLanguage(mail.email, language)}`,
      );
      setCopied(true);
    } catch {
      toast.error(translateText("Could not copy the email. Please copy it manually."));
      return;
    }

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
      <p className="text-xs uppercase text-purple-300">
        {translateText("AI Email Assistant")}</p>

      <button
        onClick={() => void generate()}
        className="cf-btn-primary mt-3"
      >
        {loading ? translateText("Generating...") : translateText("Generate Follow-up Email")}
      </button>

      {mail && (
        <div className="mt-5 space-y-3">
          <h3 className="font-bold text-foreground">
            {formatTextForLanguage(mail.subject, language)}
          </h3>

          <textarea
            readOnly
            value={formatTextForLanguage(mail.email, language)}
            className="h-48 w-full rounded-xl bg-surface-2 p-4 text-foreground"
          />

          <button
            onClick={() => void copyEmail()}
            className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-cyan-300"
          >
            {copied ? translateText("Copied") : translateText("Copy Email")}
          </button>
        </div>
      )}
    </div>
  );
}
