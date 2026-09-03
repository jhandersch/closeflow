"use client";
import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";
type DeletedLead = {
    id: string;
    name: string;
    company: string | null;
    deleted_at: string | null;
};
export default function TrashPage() {
    const [leads, setLeads] = useState<DeletedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const loadDeletedLeads = async () => {
        setLoading(true);
        try {
            const { data: { user }, } = await supabase.auth.getUser();
            if (!user) {
                setLeads([]);
                return;
            }
            const { data, error } = await supabase
                .from("leads")
                .select("id, name, company, deleted_at")
                .eq("user_id", user.id)
                .not("deleted_at", "is", null)
                .order("deleted_at", { ascending: false });
            if (error) {
                throw error;
            }
            setLeads(data ?? []);
        }
        catch (error) {
            console.error("Trash load error:", error);
            toast.error("Could not load trash");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void loadDeletedLeads();
    }, []);
    const restoreLead = async (leadId: string) => {
        setRestoringId(leadId);
        try {
            const response = await fetch(`/api/leads?id=${leadId}`, {
                method: "PATCH",
                credentials: "include",
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(result?.error || "Could not restore lead");
            }
            setLeads((current) => current.filter((lead) => lead.id !== leadId));
            toast.success("Lead restored");
        }
        catch (error) {
            console.error("Restore lead error:", error);
            toast.error(error instanceof Error
                ? error.message
                : "Could not restore lead");
        }
        finally {
            setRestoringId(null);
        }
    };
    return (<AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Trash
          </p>

          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Deleted leads
          </h1>

          <p className="mt-2 text-sm text-foreground/65">
            Review and restore your deleted leads.
          </p>
        </div>

        {loading ? (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
            <p className="text-sm text-foreground/60">
              Loading trash...
            </p>
          </div>) : leads.length === 0 ? (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
            <Trash2 size={32} className="mx-auto text-foreground/30"/>

            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Trash is empty
            </h2>

            <p className="mt-2 text-sm text-foreground/55">
              Deleted leads appear here.
            </p>
          </div>) : (<div className="space-y-3">
            {leads.map((lead) => (<div key={lead.id} className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {lead.name || "Untitled lead"}
                  </p>

                  <p className="mt-1 text-sm text-foreground/55">
                    {lead.company || "No company"}
                  </p>

                  {lead.deleted_at ? (<p className="mt-2 text-xs text-foreground/40">
                      Deleted on{" "}
                      {new Date(lead.deleted_at).toLocaleString("en-US")}
                    </p>) : null}
                </div>

                <button type="button" onClick={() => void restoreLead(lead.id)} disabled={restoringId === lead.id} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50">
                  <RotateCcw size={16}/>

                  {restoringId === lead.id
                    ? "Restoring..."
                    : "Restore"}
                </button>
              </div>))}
          </div>)}
      </div>
    </AuthGuard>);
}
