"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";
import { getUserFacingErrorMessage } from "@/lib/errorRecovery";

type LeadLite = {
  id: string;
  name: string;
  company: string;
  status: string;
  value: number;
  notes?: string | null;
  created_at: string;
};

type CopilotResponse = {
  strategy?: string;
  dealSummary?: string;
  callPreparation?: {
    goal?: string;
    talkingPoints?: string[];
    questions?: string[];
  };
  emailDraft?: string;
  objections?: Array<{
    objection?: string;
    response?: string;
  }>;
  nextBestAction?: string;
  meetingSummary?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AIAssistantPage() {
  const searchParams = useSearchParams();
  const leadIdFromQuery = searchParams.get("leadId");

  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [running, setRunning] = useState(false);
  const [autoRanForLeadId, setAutoRanForLeadId] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);

  const locale = "en-US";

  useEffect(() => {
    const loadLeads = async () => {
      setLoadingLeads(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoadingLeads(false);
          return;
        }

        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .single();

        if (membershipError || !membership) {
          throw new Error("No workspace found");
        }

        const workspaceId = membership.workspace_id;

        const {
          data,
          error: leadsError,
        } = await supabase
          .from("leads")
          .select("id, name, company, status, value, notes, created_at")
          .is("deleted_at", null)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (leadsError) {
          throw new Error(leadsError.message);
        }

        const rawLeads = (data || []) as LeadLite[];
        const seenDemoLeads = new Set<string>();
        const nextLeads = rawLeads.filter((lead) => {
          if (!lead.notes?.startsWith("[DEMO_SEED_V1]")) {
            return true;
          }

          const key = `${lead.name}::${lead.company}`;
          if (seenDemoLeads.has(key)) {
            return false;
          }

          seenDemoLeads.add(key);
          return true;
        });

        setLeads(nextLeads);

        const hasQueryLead =
          Boolean(leadIdFromQuery) &&
          nextLeads.some(
            (lead) => lead.id === leadIdFromQuery
          );

        if (hasQueryLead) {
          setSelectedLeadId(leadIdFromQuery || "");
          return;
        }

        if (nextLeads.length > 0) {
          setSelectedLeadId(nextLeads[0].id);
        }
      } catch (loadError) {
        setError(
          getUserFacingErrorMessage(
            loadError,
            "Could not load leads. Please try again."
          )
        );
      } finally {
        setLoadingLeads(false);
      }
    };

    void loadLeads();
  }, [leadIdFromQuery]);

  const selectedLead = useMemo(
    () =>
      leads.find(
        (lead) => lead.id === selectedLeadId
      ) || null,
    [leads, selectedLeadId]
  );

  const pipelineSummary = useMemo(() => {
    const totalLeads = leads.length;

    const totalValue = leads.reduce(
      (sum, lead) => sum + (lead.value || 0),
      0
    );

    const wonLeads = leads.filter(
      (lead) => lead.status === "won"
    );

    const wonRevenue = wonLeads.reduce(
      (sum, lead) => sum + (lead.value || 0),
      0
    );

    const proposalCount = leads.filter(
      (lead) => lead.status === "proposal"
    ).length;

    return {
      totalLeads,
      totalValue,
      wonRevenue,
      proposalCount,
      statusBreakdown: {
        new: leads.filter(
          (lead) => lead.status === "new"
        ).length,
        contacted: leads.filter(
          (lead) => lead.status === "contacted"
        ).length,
        proposal: proposalCount,
        won: wonLeads.length,
        lost: leads.filter(
          (lead) => lead.status === "lost"
        ).length,
      },
    };
  }, [leads]);

  const runCopilot = async (
    mode:
      | "lead-analysis"
      | "pipeline-analysis"
      | "sales-coach"
      | "email-generator"
      | "risk-detection" = "lead-analysis",
    presetQuestion?: string
  ) => {
    const nextQuestion = (
      presetQuestion || question
    ).trim();

    if (!nextQuestion) {
      setError(
        "Enter a question for AI Assistant"
      );
      return;
    }

    if (
      mode !== "pipeline-analysis" &&
      !selectedLead
    ) {
      setError("Select a lead first");
      return;
    }

    setRunning(true);
    setError(null);

    setChat((current) => [
      ...current,
      {
        role: "user",
        content: nextQuestion,
      },
    ]);

    try {
      let activities: Array<{
        created_at: string;
        action: string;
      }> = [];

      if (selectedLead) {
        const activityQuery = await supabase
          .from("activities")
          .select("created_at, action")
          .eq("lead_id", selectedLead.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(25);

        if (activityQuery.error) {
          throw new Error(
            activityQuery.error.message
          );
        }

        activities = activityQuery.data || [];
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Please sign in again."
        );
      }

      const response = await fetch(
        "/api/sales-copilot",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            lead: selectedLead,
            activities,
            memory: {},
            risk: {},
            status: selectedLead?.status,
            question: nextQuestion,
            mode,
            pipeline: pipelineSummary,
            language: "en",
          }),
        }
      );

      const payload =
        (await response.json()) as CopilotResponse & {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "AI Assistant request failed"
        );
      }

      setResult(payload);

      const summary = [
        payload.strategy,
        payload.nextBestAction,
        payload.dealSummary,
      ]
        .filter(Boolean)
        .join("\n\n");

      setChat((current) => [
        ...current,
        {
          role: "assistant",
          content:
            summary ||
            "AI response generated.",
        },
      ]);

      setQuestion("");
    } catch (runError) {
      const message = getUserFacingErrorMessage(
        runError,
        "AI is temporarily unavailable. Please try again in a moment."
      );

      setError(message);

      setChat((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I could not generate a response. Please try again.",
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!leadIdFromQuery || !selectedLead) {
      return;
    }

    if (selectedLead.id !== leadIdFromQuery) {
      return;
    }

    if (running) {
      return;
    }

    if (autoRanForLeadId === leadIdFromQuery) {
      return;
    }

    setAutoRanForLeadId(leadIdFromQuery);

    void runCopilot(
      "lead-analysis",
      "Analyze this lead and give me the best next actions."
    );
  }, [
    autoRanForLeadId,
    leadIdFromQuery,
    running,
    selectedLead,
  ]);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
            AI Assistant
          </p>

          <h1 className="cf-title mt-2 text-3xl font-bold text-foreground">
            Get AI-powered guidance for your deals
          </h1>

          <p className="mt-2 text-sm text-foreground/65">
            Ask about leads, customers, pipeline risk,
            negotiation coaching, email drafts,
            and forecast confidence.
          </p>

          {selectedLead ? (
            <div className="mt-3">
              <Link
                href={`/leads/${selectedLead.id}`}
                className="inline-flex rounded-full border border-border-subtle bg-surface-2/70 px-3 py-1 text-xs font-medium text-foreground/75 transition hover:text-foreground"
              >
                Open lead detail
              </Link>
            </div>
          ) : null}
        </div>

        <div className="cf-card cf-enter p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={selectedLeadId}
              onChange={(event) =>
                setSelectedLeadId(
                  event.target.value
                )
              }
              disabled={
                loadingLeads ||
                leads.length === 0
              }
              className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-foreground outline-none focus:border-cyan-400 disabled:opacity-50"
            >
              {loadingLeads ? (
                <option>
                  Loading leads...
                </option>
              ) : null}

              {!loadingLeads &&
              leads.length === 0 ? (
                <option>
                  No leads available
                </option>
              ) : null}

              {leads.map((lead) => (
                <option
                  key={lead.id}
                  value={lead.id}
                >
                  {lead.name} - {lead.company} (
                  {lead.status})
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                void runCopilot(
                  "lead-analysis"
                )
              }
              disabled={
                running ||
                loadingLeads ||
                !selectedLead
              }
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-300 disabled:opacity-50"
            >
              {running
                ? "Generating..."
                : "Run Lead Analysis"}
            </button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-5">
            <button
              onClick={() =>
                void runCopilot(
                  "pipeline-analysis",
                  "Analyze my pipeline and tell me what to focus on today."
                )
              }
              disabled={running}
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5"
            >
              Analyze my pipeline
            </button>

            <button
              onClick={() =>
                void runCopilot(
                  "sales-coach",
                  "How should I negotiate this deal?"
                )
              }
              disabled={
                running || !selectedLead
              }
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5"
            >
              Sales coach
            </button>

            <button
              onClick={() =>
                void runCopilot(
                  "email-generator",
                  "Write a follow-up email I can send now."
                )
              }
              disabled={
                running || !selectedLead
              }
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5"
            >
              Email generator
            </button>

            <button
              onClick={() =>
                void runCopilot(
                  "risk-detection",
                  "Which deals are dying and why?"
                )
              }
              disabled={running}
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5"
            >
              Risk detection
            </button>

            <button
              onClick={() =>
                void runCopilot(
                  "pipeline-analysis",
                  "Will I hit my revenue target this month?"
                )
              }
              disabled={running}
              className="rounded-xl border border-border-subtle px-3 py-2 text-xs text-foreground/85 hover:bg-foreground/5"
            >
              Forecast
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target.value
                )
              }
              placeholder="Which leads should I contact today?"
              className="w-full rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-sm text-foreground outline-none focus:border-cyan-400"
            />

            <button
              onClick={() =>
                void runCopilot(
                  "lead-analysis"
                )
              }
              disabled={
                running ||
                !question.trim()
              }
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
            >
              Ask AI
            </button>
          </div>

          <p className="mt-3 text-xs text-foreground/55">
            Leads:{" "}
            {pipelineSummary.totalLeads} |{" "}
            Pipeline Value: EUR{" "}
            {Math.round(
              pipelineSummary.totalValue
            ).toLocaleString(locale)}{" "}
            | Revenue Closed: EUR{" "}
            {Math.round(
              pipelineSummary.wonRevenue
            ).toLocaleString(locale)}
          </p>

          {error ? (
            <p className="mt-3 text-sm text-rose-300">
              {error}
            </p>
          ) : null}
        </div>

        <div className="cf-card cf-enter p-5">
          <h2 className="cf-title text-lg font-semibold text-foreground">
            Assistant Chat
          </h2>

          <div className="mt-4 space-y-3">
            {chat.length === 0 ? (
              <p className="text-sm text-foreground/55">
                Start with a question or use a
                quick action to generate
                recommendations.
              </p>
            ) : (
              chat.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-xl border p-3 text-sm ${
                    message.role === "user"
                      ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200"
                      : "border-border-subtle bg-surface-2/70 text-foreground/85"
                  }`}
                >
                  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-foreground/55">
                    {message.role === "user"
                      ? "You"
                      : "AI"}
                  </p>

                  <p className="whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {result ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">
                Strategy
              </h2>

              <p className="mt-2 text-sm text-foreground/80">
                {result.strategy ||
                  "No strategy returned."}
              </p>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">
                Next Best Action
              </h2>

              <p className="mt-2 text-sm text-foreground/80">
                {result.nextBestAction ||
                  "No action returned."}
              </p>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">
                Call Preparation
              </h2>

              <p className="mt-2 text-sm text-foreground/80">
                Goal:{" "}
                {result.callPreparation
                  ?.goal || "-"}
              </p>

              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-foreground/55">
                Talking points
              </p>

              <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                {(
                  result.callPreparation
                    ?.talkingPoints || []
                ).map((item, index) => (
                  <li key={`tp-${index}`}>
                    - {item}
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-foreground/55">
                Questions
              </p>

              <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                {(
                  result.callPreparation
                    ?.questions || []
                ).map((item, index) => (
                  <li key={`q-${index}`}>
                    - {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="cf-card cf-enter p-5">
              <h2 className="cf-title text-lg font-semibold text-foreground">
                Email Draft
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                {result.emailDraft ||
                  "No email draft returned."}
              </p>
            </div>

            <div className="cf-card cf-enter p-5 md:col-span-2">
              <h2 className="cf-title text-lg font-semibold text-foreground">
                Objections
              </h2>

              <div className="mt-3 space-y-2">
                {(result.objections || []).map(
                  (item, index) => (
                    <div
                      key={`obj-${index}`}
                      className="cf-card-soft p-3"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {item.objection ||
                          "Objection"}
                      </p>

                      <p className="mt-1 text-sm text-foreground/80">
                        {item.response ||
                          "No response returned."}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
