"use client";
import { translateText } from "@/lib/i18n";


import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { copyTextToClipboard } from "@/lib/clipboard";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { formatTextForLanguage } from "@/lib/i18n";

type Props = {
  lead: any;
  activities: any[];
  memory: any;
  risk: any;
  status: string;
};

export default function AISalesCopilot({
  lead,
  activities,
  memory,
  risk,
  status,
}: Props) {
  const { language } = useAppPreferences();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requestSequence = useRef(0);

  async function copyEmail() {
    const emailDraft = typeof data?.emailDraft === "string"
      ? formatTextForLanguage(data.emailDraft, language)
      : "";
    if (!emailDraft) {
      return;
    }

    try {
      await copyTextToClipboard(emailDraft);
      setCopied(true);
    } catch {
      toast.error(translateText("Could not copy the email. Please copy it manually."));
      return;
    }

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  async function generateCopilot() {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(translateText("Please sign in again.", language));
      }

      const response = await fetch("/api/sales-copilot", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lead,
          activities,
          memory,
          risk,
          status,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(translateText("Copilot failed", language));
      }

      const result = await response.json();
      if (requestId === requestSequence.current) {
        setData(result);
      }
    } catch (error) {
      console.error(error);
      if (requestId === requestSequence.current) {
        setError(translateText("AI Sales Copilot could not generate recommendations.", language));
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (lead) {
      void generateCopilot();
    }
    return () => {
      requestSequence.current += 1;
    };
  }, [lead.id, language]);

  if (loading) {
    return (
      <div className="rounded-xl bg-surface-1 p-6 text-foreground/65">
        {translateText("AI Sales Copilot is preparing recommendations...")}</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-surface-1 p-6 text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6 rounded-xl border border-cyan-500/20 bg-surface-1 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {translateText("AI Sales Copilot")}</h2>

          {data.strategy && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <h3 className="font-semibold text-cyan-300">
                {translateText("Lead Strategy")}</h3>

              <p className="mt-2 text-sm text-foreground/85">
                {formatTextForLanguage(data.strategy, language)}
              </p>
            </div>
          )}

          <p className="mt-1 text-sm text-foreground/65">
            {translateText("AI-powered closing assistance")}</p>
        </div>

        <button
          type="button"
          onClick={() => void generateCopilot()}
          disabled={loading}
          className="cf-btn-primary"
        >
          {translateText("Regenerate")}</button>
      </div>

      <div>
        <h3 className="font-semibold text-cyan-400">
          {translateText("Call Preparation")}</h3>

        {data.dealSummary && (
          <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
            <h3 className="font-semibold text-foreground">
              {translateText("Lead Summary")}</h3>

            <p className="mt-2 text-sm text-foreground/80">
              {formatTextForLanguage(data.dealSummary, language)}
            </p>
          </div>
        )}

        <p className="mt-2 text-foreground">
          {typeof data.callPreparation?.goal === "string"
            ? formatTextForLanguage(data.callPreparation.goal, language)
            : null}
        </p>

        <ul className="mt-3 space-y-2">
          {data.callPreparation?.talkingPoints?.map(
            (point: string) => (
              <li
                key={point}
                className="text-sm text-foreground/80"
              >
                - {formatTextForLanguage(point, language)}
              </li>
            ),
          )}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-cyan-400">
          {translateText("Questions to ask")}</h3>

        <ul className="mt-3 space-y-2">
          {data.callPreparation?.questions?.map(
            (question: string) => (
              <li
                key={question}
                className="text-sm text-foreground/80"
              >
                - {formatTextForLanguage(question, language)}
              </li>
            ),
          )}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-cyan-400">
          {translateText("Possible objections")}</h3>

        <div className="mt-3 space-y-3">
          {data.objections?.map((item: any) => (
            <div
              key={item.objection}
              className="rounded-xl border border-border-subtle p-4"
            >
              <p className="font-medium text-foreground">
                {formatTextForLanguage(item.objection, language)}
              </p>

              <p className="mt-2 text-sm text-foreground/65">
                {formatTextForLanguage(item.response, language)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-cyan-400">
          {translateText("Email Draft")}</h3>

        <div className="mt-2 rounded-xl bg-surface-2/70 p-4 text-sm text-foreground/80">
          <textarea
            value={typeof data.emailDraft === "string"
              ? formatTextForLanguage(data.emailDraft, language)
              : ""}
            readOnly
            className="min-h-48 w-full rounded-xl border border-border-subtle bg-surface-2 p-4 text-sm text-foreground/85 outline-none"
          />

          <button
            type="button"
            onClick={() => void copyEmail()}
            className="cf-btn-primary mt-3"
          >
            {copied ? translateText("Copied") : translateText("Copy Email")}
          </button>
        </div>
      </div>
    </div>
  );
}
