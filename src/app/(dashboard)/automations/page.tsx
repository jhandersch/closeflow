"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Trash2, ChevronRight, Zap, X } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
type ActionItem = {
    type: string;
    payload: Record<string, string>;
};
type Automation = {
    id: string;
    name: string;
    trigger_event: string;
    actions: ActionItem[];
    enabled: boolean;
};
const TRIGGERS = [
    { value: "lead.created", label: "Lead created", description: "Fires when a new lead is added" },
    { value: "lead.stage.proposal", label: "Lead to Proposal", description: "Lead enters proposal stage" },
    { value: "lead.stage.won", label: "Lead to Won", description: "Lead marked as won" },
    { value: "lead.stage.lost", label: "Lead to Lost", description: "Lead marked as lost" },
    { value: "lead.idle_7d", label: "Lead idle 7 days", description: "No activity for 7 days" },
    { value: "lead.idle_14d", label: "Lead idle 14 days", description: "No activity for 14 days" },
    { value: "task.overdue", label: "Task overdue", description: "Task past its due date" },
];
const ACTION_TYPES = [
    { value: "task.create", label: "Create task", field: "title" as const },
    { value: "lead.status.update", label: "Update lead status", field: "status" as const },
    { value: "notify.user", label: "Send notification", field: "message" as const },
];
const PRESETS: Omit<Automation, "id" | "enabled">[] = [
    { name: "New lead follow-up", trigger_event: "lead.created", actions: [{ type: "task.create", payload: { title: "Kundin/Customers innerhalb von 24h anrufen" } }] },
    { name: "Angebots-Erinnerung", trigger_event: "lead.stage.proposal", actions: [{ type: "task.create", payload: { title: "In 3 Tagen nachfassen" } }] },
    { name: "Verlorener Deal", trigger_event: "lead.stage.lost", actions: [{ type: "task.create", payload: { title: "Verlustgrund erfragen und Reaktivierung planen" } }] },
    { name: "Inaktiver Lead Alarm", trigger_event: "lead.idle_7d", actions: [{ type: "notify.user", payload: { message: "Dieser Lead ist seit 7 Tagen inactive" } }] },
    { name: "Gewonnener Deal", trigger_event: "lead.stage.won", actions: [{ type: "task.create", payload: { title: "Danke senden und nach Empfehlung fragen" } }] },
];
const emptyAction = (): ActionItem => ({ type: "task.create", payload: { title: "" } });
export default function AutomationsPage() {
    const { language } = useAppPreferences();
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);
    const [bName, setBName] = useState("");
    const [bTrigger, setBTrigger] = useState(TRIGGERS[0].value);
    const [bActions, setBActions] = useState<ActionItem[]>([emptyAction()]);
    const [bSaving, setBSaving] = useState(false);
    const getHeaders = async (json = false) => {
        const { data: { session } } = await supabase.auth.getSession();
        const h: Record<string, string> = {};
        if (json)
            h["Content-Type"] = "application/json";
        if (session?.access_token)
            h.Authorization = `Bearer ${session.access_token}`;
        return h;
    };
    const readApiError = async (res: Response, fallback: string) => {
        try {
            return ((await res.json()) as {
                error?: string;
            }).error || fallback;
        }
        catch {
            return (await res.text()) || fallback;
        }
    };
    const showErr = (msg: string) => {
        if (msg.toLowerCase().includes("two-factor")) {
            toast.error("2FA required. Enable 2FA in Settings -> Security.");
        }
        else {
            toast.error(msg);
        }
    };
    const load = async () => {
        setLoading(true);
        const res = await fetch("/api/automations", {
            headers: await getHeaders(),
            credentials: "include",
        });
        if (res.ok)
            setAutomations((await res.json()) as Automation[]);
        setLoading(false);
    };
    useEffect(() => { void load(); }, []);
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setTwoFactorEnabled(Boolean(user?.user_metadata?.two_factor_enabled));
        });
    }, []);
    const openBuilder = () => {
        setBName("");
        setBTrigger(TRIGGERS[0].value);
        setBActions([emptyAction()]);
        setBuilderOpen(true);
    };
    const saveAutomation = async () => {
        if (!bName.trim()) {
            toast.error("Name is required.");
            return;
        }
        const validActions = bActions.filter((a) => {
            const fieldKey = ACTION_TYPES.find((t) => t.value === a.type)?.field;
            return fieldKey && String(a.payload[fieldKey] ?? "").trim();
        });
        if (!validActions.length) {
            toast.error("Add at least one complete action.");
            return;
        }
        setBSaving(true);
        const res = await fetch("/api/automations", {
            method: "POST",
            headers: await getHeaders(true),
            credentials: "include",
            body: JSON.stringify({ name: bName.trim(), trigger_event: bTrigger, actions: validActions, enabled: true }),
        });
        if (res.ok) {
            toast.success("Automation saved");
            setBuilderOpen(false);
            await load();
        }
        else
            showErr(await readApiError(res, "Could not save automation"));
        setBSaving(false);
    };
    const installPreset = async (preset: Omit<Automation, "id" | "enabled">) => {
        const res = await fetch("/api/automations", {
            method: "POST",
            headers: await getHeaders(true),
            credentials: "include",
            body: JSON.stringify({ ...preset, enabled: true }),
        });
        if (res.ok) {
            toast.success("Preset installed");
            await load();
        }
        else
            showErr(await readApiError(res, "Could not install preset"));
    };
    const toggle = async (item: Automation) => {
        const res = await fetch("/api/automations", {
            method: "PATCH",
            headers: await getHeaders(true),
            credentials: "include",
            body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
        });
        if (res.ok)
            await load();
        else
            showErr(await readApiError(res, "Could not update"));
    };
    const remove = async (id: string) => {
        if (!window.confirm("Delete this automation?"))
            return;
        const res = await fetch("/api/automations", {
            method: "DELETE",
            headers: await getHeaders(true),
            credentials: "include",
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            toast.success("Deleted");
            await load();
        }
        else
            showErr(await readApiError(res, "Could not delete"));
    };
    const updateAction = (index: number, field: string, value: string) => {
        setBActions((prev) => prev.map((a, i) => {
            if (i !== index)
                return a;
            if (field === "type") {
                const fieldKey = ACTION_TYPES.find((t) => t.value === value)?.field || "title";
                return { type: value, payload: { [fieldKey]: "" } };
            }
            return { ...a, payload: { ...a.payload, [field]: value } };
        }));
    };
    const trigger = TRIGGERS.find((t) => t.value === bTrigger);
    const triggerLabel = trigger ? (trigger.label) : bTrigger;
    return (<AuthGuard>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{"Automations"}</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">{"Workflow Builder"}</h1>
            <p className="mt-2 text-sm text-foreground/65">{"Automate repeatable actions triggered by CRM events."}</p>
          </div>
          <button onClick={openBuilder} className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500">
            <Plus size={15}/>{"New Automation"}
          </button>
        </div>

        {!twoFactorEnabled ? (<div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-amber-300">{"Enable 2FA for reliable automation management."}</p>
            <Link href="/settings#security" className="mt-2 inline-flex rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">{"Open Security Settings"}</Link>
          </div>) : null}

        {builderOpen ? (<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300"><Zap size={16}/><span className="text-sm font-semibold">{"Build Automation"}</span></div>
                <button onClick={() => setBuilderOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-xl border border-border-subtle text-foreground/60 hover:bg-foreground/5"><X size={14}/></button>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">{"Name"}</label>
                <input value={bName} onChange={(e) => setBName(e.target.value)} placeholder={"e.g. New lead follow-up"} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-cyan-500/50"/>
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-foreground/50">{"When (Trigger)"}</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TRIGGERS.map((t) => (<button key={t.value} onClick={() => setBTrigger(t.value)} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${bTrigger === t.value ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200" : "border-border-subtle bg-surface-2/60 text-foreground/70 hover:bg-foreground/5"}`}>
                      <p className="font-medium">{t.label}</p>
                      <p className="mt-0.5 text-xs text-foreground/45">{t.description}</p>
                    </button>))}
                </div>
              </div>
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs uppercase tracking-[0.2em] text-foreground/50">{"Then (Actions)"}</label>
                  <button onClick={() => setBActions((prev) => [...prev, emptyAction()])} className="text-xs text-cyan-400 hover:text-cyan-300">{"+ Add action"}</button>
                </div>
                <div className="space-y-2">
                  {bActions.map((action, idx) => {
                const actionDef = ACTION_TYPES.find((t) => t.value === action.type) || ACTION_TYPES[0];
                const fieldKey = actionDef.field;
                const fieldValue = String(action.payload[fieldKey] ?? "");
                return (<div key={idx} className="flex items-start gap-2 rounded-xl border border-border-subtle bg-surface-2/70 p-3">
                        <ChevronRight size={14} className="mt-2.5 shrink-0 text-foreground/40"/>
                        <div className="flex-1 space-y-2">
                          <select value={action.type} onChange={(e) => updateAction(idx, "type", e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-foreground outline-none">
                            {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <input value={fieldValue} onChange={(e) => updateAction(idx, fieldKey, e.target.value)} placeholder={fieldKey === "title" ? ("Task title...") : fieldKey === "message" ? ("Notification text...") : ("Status value...")} className="w-full rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-500/40"/>
                        </div>
                        {bActions.length > 1 ? <button onClick={() => setBActions((prev) => prev.filter((_, i) => i !== idx))} className="mt-1 shrink-0 text-foreground/40 hover:text-rose-400"><X size={14}/></button> : null}
                      </div>);
            })}
                </div>
              </div>
              <div className="mb-5 rounded-xl border border-border-subtle bg-surface-2/60 px-4 py-3 text-xs text-foreground/60">
                <span className="font-semibold text-foreground/80">{"Preview:"} </span>
                {"When"} <span className="text-cyan-300">&quot;{triggerLabel}&quot;</span> {"then"}{" "}
                {bActions.map((a, i) => {
                const t = ACTION_TYPES.find((x) => x.value === a.type);
                const fk = t?.field || "title";
                const val = String(a.payload[fk] ?? "");
                return <span key={i}>{i > 0 ? ", " : ""}<span className="text-amber-300">{(t ? (t.label) : a.type)}</span>{val ? `: \"${val}\"` : ""}</span>;
            })}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setBuilderOpen(false)} className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/65 hover:bg-foreground/5">{"Cancel"}</button>
                <button onClick={() => void saveAutomation()} disabled={bSaving} className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60">{bSaving ? ("Saving...") : ("Save Automation")}</button>
              </div>
            </div>
          </div>) : null}

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">{"Quick-install presets"}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map((preset) => (<button key={preset.name} onClick={() => void installPreset(preset)} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-left transition hover:border-cyan-500/40 hover:bg-cyan-500/15">
                <p className="font-semibold text-cyan-200">{preset.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-300/70">{preset.trigger_event}</p>
              </button>))}
          </div>
        </section>

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">{`Active automations (${automations.length})`}</h2>
          {loading ? (<p className="text-sm text-foreground/60">{"Loading..."}</p>) : automations.length === 0 ? (<p className="text-sm text-foreground/50">{"No automations yet. Use a preset or build your own."}</p>) : (<div className="space-y-2">
              {automations.map((item) => (<article key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-border-subtle bg-surface-2/60 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${item.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-foreground/10 text-foreground/50"}`}>{item.enabled ? ("On") : ("Off")}</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/50">{"Trigger"}: <span className="text-foreground/70">{item.trigger_event}</span> · {item.actions.length} {`action${item.actions.length !== 1 ? "s" : ""}`}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => void toggle(item)} className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:bg-foreground/5">{item.enabled ? ("Disable") : ("Enable")}</button>
                    <button onClick={() => void remove(item.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle text-foreground/40 transition hover:border-rose-500/40 hover:text-rose-400"><Trash2 size={13}/></button>
                  </div>
                </article>))}
            </div>)}
        </section>
      </div>
    </AuthGuard>);
}
