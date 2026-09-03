"use client";
import Link from "next/link";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
export default function NotFound() {
    const { language } = useAppPreferences();
    return (<div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-xl rounded-3xl border border-border-subtle bg-surface-1 p-10 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold">{"Page not found"}</h1>
        <p className="mt-4 text-base leading-7 text-foreground/65">
          {"The page you are looking for does not exist or may have been moved."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:opacity-90">
            {"Back to dashboard"}
          </Link>
          <Link href="/leads" className="rounded-xl border border-border-subtle px-4 py-2 font-semibold text-foreground/85 transition hover:bg-white/5">
            {"View leads"}
          </Link>
        </div>
      </div>
    </div>);
}
