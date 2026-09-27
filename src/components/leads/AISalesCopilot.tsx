"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { copyTextToClipboard } from "@/lib/clipboard";
import toast from "react-hot-toast";

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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    if (!data?.emailDraft) {
      return;
    }

    try {
      await copyTextToClipboard(data.emailDraft);
      setCopied(true);
    } catch {
      toast.error("Could not copy the email. Please copy it manually.");
      return;
    }

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  async function generateCopilot() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again.");
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
          language: "en",
        }),
      });

      if (!response.ok) {
        throw new Error("Copilot failed");
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error(error);
      setError(
        "AI Sales Copilot could not generate recommendations.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (lead) {
      void generateCopilot();
    }
  }, [lead.id]);

  if (loading) {
    return (
      <div className="rounded-xl bg-surface-1 p-6 text-foreground/65">
        AI Sales Copilot is preparing recommendations...
      </div>
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
            AI Sales Copilot
          </h2>

          {data.strategy && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <h3 className="font-semibold text-cyan-300">
                Deal Strategy
              </h3>

              <p className="mt-2 text-sm text-foreground/85">
                {data.strategy}
              </p>
            </div>
          )}

          <p className="mt-1 text-sm text-foreground/65">
            AI-powered closing assistance
          </p>
        </div>

        <button
          type="button"
          onClick={() => void generateCopilot()}
          disabled={loading}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Regenerate
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-cyan-400">
          Call Preparation
        </h3>

        {data.dealSummary && (
          <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
            <h3 className="font-semibold text-foreground">
              Deal Summary
            </h3>

            <p className="mt-2 text-sm text-foreground/80">
              {data.dealSummary}
            </p>
          </div>
        )}

        <p className="mt-2 text-foreground">
          {data.callPreparation?.goal}
        </p>

        <ul className="mt-3 space-y-2">
          {data.callPreparation?.talkingPoints?.map(
            (point: string) => (
              <li
                key={point}
                className="text-sm text-foreground/80"
              >
                - {point}
              </li>
            ),
          )}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-cyan-400">
          Questions to ask
        </h3>

        <ul className="mt-3 space-y-2">
          {data.callPreparation?.questions?.map(
            (question: string) => (
              <li
                key={question}
                className="text-sm text-foreground/80"
              >
                - {question}
              </li>
            ),
          )}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-cyan-400">
          Possible objections
        </h3>

        <div className="mt-3 space-y-3">
          {data.objections?.map((item: any) => (
            <div
              key={item.objection}
              className="rounded-xl border border-border-subtle p-4"
            >
              <p className="font-medium text-foreground">
                {item.objection}
              </p>

              <p className="mt-2 text-sm text-foreground/65">
                {item.response}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-cyan-400">
          Email Draft
        </h3>

        <div className="mt-2 rounded-xl bg-surface-2/70 p-4 text-sm text-foreground/80">
          <textarea
            value={data.emailDraft || ""}
            readOnly
            className="min-h-48 w-full rounded-xl border border-border-subtle bg-surface-2 p-4 text-sm text-foreground/85 outline-none"
          />

          <button
            type="button"
            onClick={() => void copyEmail()}
            className="mt-3 rounded-xl bg-white px-4 py-2 font-semibold text-black"
          >
            {copied ? "Copied" : "Copy Email"}
          </button>
        </div>
      </div>
    </div>
  );
}