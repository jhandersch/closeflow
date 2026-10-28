"use client";
import { translateText } from "@/lib/i18n";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
export default function CookiesPage() {
    useAppPreferences();
    return (<main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <LogoMark size={36} className="mb-5" />
        <h1 className="text-3xl font-semibold">{translateText("Cookie-Hinweis")}</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          {translateText("CloseFlow uses only strictly necessary cookies and local browser storage. It does not use tracking, analytics, or marketing cookies, or third-party advertising scripts.")}</p>

        <section className="mt-8 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("1. Necessary cookies")}</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>{translateText("Supabase session (")}<code>{translateText("sb-…-auth-token")}</code>{translateText("): keeps you signed in and protects your session.")}</li>
            <li>{translateText("Active workspace (")}<code>{translateText("closeflow_active_workspace")}</code>{translateText(", up to 12 months): remembers which workspace you last used.")}</li>
          </ul>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("2. Local storage (localStorage)")}</h2>
          <p className="mt-2">{translateText("Settings such as theme, language, filters, favorites, and whether you have read this notice. This data stays in your browser.")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("3. Payment processing")}</h2>
          <p className="mt-2">{translateText("When you proceed to payment, CloseFlow redirects you to Stripe. Stripe's privacy policy and cookies then apply.")}</p>
        </section>

        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-cyan-300 hover:underline">
            {translateText("Back to home")}</Link>
        </div>
      </div>
    </main>);
}
