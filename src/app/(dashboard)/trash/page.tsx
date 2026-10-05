"use client";
import { appConfirm } from "@/lib/dialogs";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";

type DeletedLead = {
  id: string;
  name: string;
  company: string | null;
  status: string;
  deleted_at: string | null;
};

type DeletedTask = {
  id: string;
  lead_id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  deleted_at: string | null;
};

type DeletedCustomer = {
  key: string;
  company: string;
  isPrivate: boolean;
  contacts: string[];
  deals: number;
  leadIds: string[];
  deleted_at: string | null;
};

const DEFAULT_TIMEZONE = "Europe/Berlin";

const formatDateTime = (value: string, timeZone: string) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
};

const formatDate = (value: string, timeZone: string) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(value));
};

const isValidTimeZone = (value: string) => {
  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: value,
    });
    return true;
  } catch {
    return false;
  }
};

export default function TrashPage() {
  const [leads, setLeads] = useState<DeletedLead[]>([]);
  const [tasks, setTasks] = useState<DeletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoringCustomerKey, setRestoringCustomerKey] =
    useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);

  const loadTimezone = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const storedTimezone =
      typeof user?.user_metadata?.timezone === "string"
        ? user.user_metadata.timezone
        : DEFAULT_TIMEZONE;

    setTimezone(
      isValidTimeZone(storedTimezone)
        ? storedTimezone
        : DEFAULT_TIMEZONE
    );
  };

  const loadTrash = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLeads([]);
        setTasks([]);
        return;
      }

      const [
        { data: leadData, error: leadError },
        { data: taskData, error: taskError },
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("id, name, company, status, deleted_at")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false }),
        supabase
          .from("tasks")
          .select(
            "id, lead_id, title, due_date, completed, deleted_at"
          )
          .eq("user_id", user.id)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false }),
      ]);

      if (leadError) {
        throw leadError;
      }

      if (taskError) {
        throw taskError;
      }

      setLeads((leadData ?? []) as DeletedLead[]);
      setTasks((taskData ?? []) as DeletedTask[]);
    } catch (error) {
      console.error("Trash load error:", error);
      toast.error("Could not load trash");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTimezone();
    void loadTrash();
  }, []);

  const customerGroups = useMemo<DeletedCustomer[]>(() => {
    const groups = new Map<string, DeletedCustomer>();

    for (const lead of leads) {
      if (lead.status !== "won" && lead.status !== "lost") {
        continue;
      }

      const company = (lead.company || "").trim();
      const isPrivate = !company;
      const key = isPrivate
        ? `private:${lead.id}`
        : `company:${company.toLowerCase()}`;

      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          key,
          company: isPrivate
            ? lead.name || "Private customer"
            : company,
          isPrivate,
          contacts: lead.name ? [lead.name] : [],
          deals: 1,
          leadIds: [lead.id],
          deleted_at: lead.deleted_at,
        });
        continue;
      }

      existing.deals += 1;
      existing.leadIds.push(lead.id);

      if (
        lead.name &&
        !existing.contacts.includes(lead.name)
      ) {
        existing.contacts.push(lead.name);
      }

      if (
        lead.deleted_at &&
        (!existing.deleted_at ||
          new Date(lead.deleted_at).getTime() >
            new Date(existing.deleted_at).getTime())
      ) {
        existing.deleted_at = lead.deleted_at;
      }
    }

    return Array.from(groups.values());
  }, [leads]);

  const deletedLeadItems = useMemo(
    () =>
      leads.filter(
        (lead) =>
          lead.status !== "won" &&
          lead.status !== "lost"
      ),
    [leads]
  );

  const restoreLead = async (leadId: string) => {
    setRestoringId(leadId);

    try {
      const response = await fetch(
        `/api/leads?id=${leadId}`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Could not restore lead"
        );
      }

      setLeads((current) =>
        current.filter((lead) => lead.id !== leadId)
      );

      toast.success("Lead restored");
    } catch (error) {
      console.error("Restore lead error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not restore lead"
      );
    } finally {
      setRestoringId(null);
    }
  };

  const restoreCustomer = async (
    customer: DeletedCustomer
  ) => {
    setRestoringCustomerKey(customer.key);

    try {
      for (const leadId of customer.leadIds) {
        const response = await fetch(
          `/api/leads?id=${leadId}`,
          {
            method: "PATCH",
            credentials: "include",
          }
        );

        const result = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.error ||
              `Could not restore customer ${customer.company}`
          );
        }
      }

      const restoredIds = new Set(customer.leadIds);

      setLeads((current) =>
        current.filter(
          (lead) => !restoredIds.has(lead.id)
        )
      );

      toast.success("Customer restored");
    } catch (error) {
      console.error("Restore customer error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not restore customer"
      );
    } finally {
      setRestoringCustomerKey(null);
    }
  };

  const restoreTask = async (taskId: string) => {
    setRestoringId(taskId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const {
        data: restoredTask,
        error,
      } = await supabase
        .from("tasks")
        .update({
          deleted_at: null,
        })
        .eq("id", taskId)
        .eq("user_id", user.id)
        .not("deleted_at", "is", null)
        .select("id")
        .maybeSingle();

      if (error || !restoredTask) {
        throw (
          error || new Error("Could not restore task")
        );
      }

      setTasks((current) =>
        current.filter((task) => task.id !== taskId)
      );

      toast.success("Task restored");
    } catch (error) {
      console.error("Restore task error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not restore task"
      );
    } finally {
      setRestoringId(null);
    }
  };

  const emptyTrash = async () => {
    if (
      !await appConfirm(
        "Permanently delete all items in the trash? This cannot be undone."
      )
    ) {
      return;
    }

    setEmptying(true);

    try {
      const response = await fetch(
        "/api/leads/trash",
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Could not empty trash"
        );
      }

      setLeads([]);
      setTasks([]);

      toast.success(
        `${(result?.deletedLeads ?? 0) + (result?.deletedTasks ?? 0)} item(s) permanently deleted`
      );
    } catch (error) {
      console.error("Empty trash error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not empty trash"
      );
    } finally {
      setEmptying(false);
    }
  };

  const totalItems =
    customerGroups.length +
    deletedLeadItems.length +
    tasks.length;

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              Trash
            </p>

            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Recover deleted records
            </h1>

            <p className="mt-2 text-sm text-foreground/65">
              Restore deleted customers, leads, and tasks.
            </p>
          </div>

          {!loading && totalItems > 0 ? (
            <button
              type="button"
              onClick={() => void emptyTrash()}
              disabled={emptying}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} />
              {emptying ? "Emptying..." : "Empty trash"}
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
            <p className="text-sm text-foreground/60">
              Loading trash...
            </p>
          </div>
        ) : totalItems === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
            <Trash2
              size={32}
              className="mx-auto text-foreground/30"
            />

            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Trash is empty
            </h2>

            <p className="mt-2 text-sm text-foreground/55">
              Deleted customers, leads, and tasks appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {customerGroups.length > 0 ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Customers ({customerGroups.length})
                  </h2>

                  <p className="mt-1 text-sm text-foreground/55">
                    Deleted customers are grouped from their deleted deals.
                  </p>
                </div>

                {customerGroups.map((customer) => (
                  <div
                    key={customer.key}
                    className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {customer.company}
                      </p>

                      <p className="mt-1 text-sm text-foreground/55">
                        {customer.contacts.length > 0
                          ? customer.contacts.join(", ")
                          : customer.isPrivate
                            ? "Private customer"
                            : "No contact"}
                      </p>

                      <p className="mt-2 text-xs text-foreground/40">
                        {customer.deals} deal
                        {customer.deals === 1 ? "" : "s"}
                        {customer.deleted_at
                          ? ` • Deleted on ${formatDateTime(
                              customer.deleted_at,
                              timezone
                            )}`
                          : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void restoreCustomer(customer)
                      }
                      disabled={
                        restoringCustomerKey === customer.key
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      {restoringCustomerKey === customer.key
                        ? "Restoring..."
                        : "Restore customer"}
                    </button>
                  </div>
                ))}
              </section>
            ) : null}

            {deletedLeadItems.length > 0 ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Leads ({deletedLeadItems.length})
                  </h2>

                  <p className="mt-1 text-sm text-foreground/55">
                    Deleted leads that are not customer records.
                  </p>
                </div>

                {deletedLeadItems.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {lead.name || "Untitled lead"}
                      </p>

                      <p className="mt-1 text-sm text-foreground/55">
                        {lead.company || "No company"}
                      </p>

                      <p className="mt-2 text-xs text-foreground/40">
                        {lead.deleted_at
                          ? `Deleted on ${formatDateTime(
                              lead.deleted_at,
                              timezone
                            )}`
                          : "Deleted"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void restoreLead(lead.id)}
                      disabled={restoringId === lead.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      {restoringId === lead.id
                        ? "Restoring..."
                        : "Restore"}
                    </button>
                  </div>
                ))}
              </section>
            ) : null}

            {tasks.length > 0 ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Tasks ({tasks.length})
                  </h2>

                  <p className="mt-1 text-sm text-foreground/55">
                    Deleted tasks can be restored here.
                  </p>
                </div>

                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {task.title}
                      </p>

                      <p className="mt-1 text-sm text-foreground/55">
                        {task.completed
                          ? "Completed task"
                          : "Open task"}
                      </p>

                      <p className="mt-2 text-xs text-foreground/40">
                        {task.due_date
                          ? `Due ${formatDate(
                              task.due_date,
                              timezone
                            )}`
                          : "No due date"}
                        {task.deleted_at
                          ? ` • Deleted on ${formatDateTime(
                              task.deleted_at,
                              timezone
                            )}`
                          : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void restoreTask(task.id)}
                      disabled={restoringId === task.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      {restoringId === task.id
                        ? "Restoring..."
                        : "Restore"}
                    </button>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
