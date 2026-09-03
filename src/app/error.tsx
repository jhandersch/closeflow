"use client";
import { useEffect } from "react";
export default function Error({ error, reset }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
        const report = async () => {
            try {
                await fetch("/api/monitoring/errors", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        source: "client",
                        level: "error",
                        message: error.message || "Unknown client rendering error",
                        stack: error.stack || null,
                        digest: error.digest || null,
                        pathname: window.location.pathname,
                        details: {
                            userAgent: window.navigator.userAgent,
                        },
                    }),
                });
            }
            catch {
                // Best-effort reporting only.
            }
        };
        void report();
    }, [error]);
    return (<div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-xl rounded-3xl border border-rose-500/20 bg-surface-1 p-10 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-rose-400">Something went wrong</p>
        <h1 className="mt-4 text-4xl font-semibold">We hit an unexpected issue</h1>
        <p className="mt-4 text-base leading-7 text-foreground/65">
          The app could not render this view. A retry usually resolves it quickly.
        </p>
        <button onClick={() => reset()} className="mt-8 rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:opacity-90">
          Try again
        </button>
      </div>
    </div>);
}
