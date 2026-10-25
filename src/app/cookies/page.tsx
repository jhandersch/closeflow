import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
export const metadata: Metadata = {
    title: "Cookie-Hinweis | CloseFlow",
    description: "Informationen zur Nutzung von Cookies und aehnlichen Technologien in CloseFlow.",
};
export default function CookiesPage() {
    return (<main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <LogoMark size={36} className="mb-5" />
        <h1 className="text-3xl font-semibold">Cookie-Hinweis</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          CloseFlow verwendet ausschliesslich technisch notwendige Cookies und lokale Speicherung im Browser. Es werden keine Tracking-, Analyse- oder Marketing-Cookies und keine Drittanbieter-Skripte zu Werbezwecken eingesetzt.
        </p>

        <section className="mt-8 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">1. Notwendige Cookies</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>Supabase-Sitzung (<code>sb-…-auth-token</code>): haelt dich angemeldet und schuetzt die Sitzung.</li>
            <li>Aktiver Workspace (<code>closeflow_active_workspace</code>, bis zu 12 Monate): merkt sich, welchen Workspace du zuletzt genutzt hast.</li>
          </ul>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">2. Lokale Speicherung (localStorage)</h2>
          <p className="mt-2">Einstellungen wie Design, Sprache, Filter, Favoriten und der Hinweis, dass du diese Information gelesen hast. Diese Daten verlassen deinen Browser nicht.</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">3. Zahlungsabwicklung</h2>
          <p className="mt-2">Beim Wechsel zur Zahlung leitet dich CloseFlow zu Stripe weiter. Dort gelten die Datenschutzhinweise und Cookies von Stripe.</p>
        </section>

        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-cyan-300 hover:underline">
            Zurueck zur Startseite
          </Link>
        </div>
      </div>
    </main>);
}
