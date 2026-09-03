"use client";
import { useState } from "react";
import { X, Send, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase/client";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
type EmailComposeModalProps = {
    leadId: string;
    defaultTo?: string;
    onClose: () => void;
    onSent?: () => void;
};
export function EmailComposeModal({ leadId, defaultTo = "", onClose, onSent }: EmailComposeModalProps) {
    const { language } = useAppPreferences();
    const [to, setTo] = useState(defaultTo);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const handleSend = async () => {
        const trimmedTo = to.trim();
        const trimmedSubject = subject.trim();
        const trimmedBody = body.trim();
        if (!trimmedTo || !trimmedSubject || !trimmedBody) {
            toast.error("Fill in all fields before sending.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedTo)) {
            toast.error("Enter a valid email address.");
            return;
        }
        setSending(true);
        try {
            const { data: { session }, } = await supabase.auth.getSession();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }
            const response = await fetch(`/api/leads/${leadId}/email`, {
                method: "POST",
                headers,
                body: JSON.stringify({ to: trimmedTo, subject: trimmedSubject, body: trimmedBody }),
            });
            if (!response.ok) {
                const data = (await response.json()) as {
                    error?: string;
                };
                toast.error(data.error || ("Could not log email."));
                return;
            }
            toast.success(`Email logged: "${trimmedSubject}"`);
            onSent?.();
            onClose();
        }
        catch {
            toast.error("Failed to log email.");
        }
        finally {
            setSending(false);
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-300">
            <Mail size={18}/>
            <span className="text-sm font-semibold">{"Compose email"}</span>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-xl border border-border-subtle text-foreground/60 transition hover:bg-foreground/5 hover:text-foreground">
            <X size={14}/>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">{"To"}</label>
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder={"contact@example.com"} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-cyan-500/50"/>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">{"Betreff"}</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={"Following up on our conversation"} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-cyan-500/50"/>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">{"Message"}</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder={"Write your email here..."} className="w-full resize-none rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-cyan-500/50"/>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/65 transition hover:bg-foreground/5">
            {"Cancel"}
          </button>
          <button onClick={() => void handleSend()} disabled={sending} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60">
            <Send size={14}/>
            {sending ? ("Protokolliere…") : ("Senden und protokollieren")}
          </button>
        </div>
      </div>
    </div>);
}
