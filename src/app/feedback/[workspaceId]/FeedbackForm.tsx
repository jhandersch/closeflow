"use client";
import { useState } from "react";
import { Star } from "lucide-react";
type FeedbackFormProps = {
    workspaceId: string;
    companyName?: string;
};
export default function FeedbackForm({ workspaceId, companyName }: FeedbackFormProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const handleSubmit = async () => {
        if (rating === 0) {
            setError("Please choose a rating.");
            return;
        }
        setError(null);
        setSubmitting(true);
        const response = await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                workspace_id: workspaceId,
                rating,
                comment,
                contact_name: name.trim() || null,
                contact_email: email.trim() || null,
            }),
        });
        if (response.ok) {
            setSubmitted(true);
        }
        else {
            const data = (await response.json()) as {
                error?: string;
            };
            setError(data.error || "Something went wrong. Please try again.");
        }
        setSubmitting(false);
    };
    if (submitted) {
        return (<div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-surface-1 p-10 text-center">
          <p className="text-4xl">:tada:</p>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Thank you!</h1>
          <p className="mt-3 text-sm leading-7 text-foreground/65">
            Your feedback has been received{companyName ? ` about ${companyName}` : ""}. We appreciate you taking the time.
          </p>
        </div>
      </div>);
    }
    const ratingLabel = rating >= 9 ? "Excellent" :
        rating >= 7 ? "Good" :
            rating >= 5 ? "Okay" :
                rating >= 3 ? "Poor" :
                    rating > 0 ? "Very poor" : "";
    return (<div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Feedback</p>
          <h1 className="mt-3 text-3xl font-bold text-foreground">
            {companyName ? `How was your experience with ${companyName}?` : "Share your feedback"}
          </h1>
          <p className="mt-2 text-sm text-foreground/60">It only takes a minute and helps us improve.</p>
        </div>

        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-xl">
          <div className="mb-5">
            <p className="mb-3 text-sm font-semibold text-foreground">
              How likely are you to recommend us? <span className="text-foreground/50">(1-10)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (<button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition ${(hover ? n <= hover : n <= rating)
                ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-200"
                : "border-border-subtle bg-surface-2 text-foreground/60 hover:border-cyan-500/30 hover:text-foreground"}`}>
                  {n}
                </button>))}
            </div>
            {ratingLabel ? <p className="mt-2 text-sm font-medium text-cyan-300">{ratingLabel}</p> : null}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">Your feedback (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Tell us what you liked or what we could improve..." className="w-full resize-none rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-cyan-500/40"/>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">Your name (optional)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Mueller" className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-cyan-500/40"/>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">Email (optional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@example.com" className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-cyan-500/40"/>
            </div>
          </div>

          {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

          <button onClick={() => void handleSubmit()} disabled={submitting || rating === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60">
            <Star size={15}/>
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>);
}
