import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
    title: "AGB | CloseFlow",
    description: "Allgemeine Geschaeftsbedingungen fuer CloseFlow.",
};
export default function AgbPage() {
    return (<main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <h1 className="text-3xl font-semibold">Allgemeine Geschaeftsbedingungen (AGB)</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          Diese AGB regeln die Nutzung von CloseFlow. Vor dem Go-Live sollten diese Inhalte rechtlich geprueft und final ersetzt werden.
        </p>

        <section className="mt-8 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">1. Geltungsbereich</h2>
          <p className="mt-2">Diese Bedingungen gelten fuer alle Vertraege zwischen CloseFlow und den jeweiligen Kundinnen und Customers.</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">2. Leistungen</h2>
          <p className="mt-2">CloseFlow stellt eine cloudbasierte CRM-Software inklusive optionaler AI-Funktionen bereit.</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">3. Pflichten der Nutzer</h2>
          <p className="mt-2">Access credentials must be kept confidential. Content must be lawful and must not infringe third-party rights.</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">4. Pricing und Billing</h2>
          <p className="mt-2">Es gelten die jeweils im Produkt oder im Angebot ausgewiesenen Pricing und Zahlungsbedingungen.</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">5. Laufzeit und Kuendigung</h2>
          <p className="mt-2">Vertragslaufzeiten und Kuendigungsfristen richten sich nach dem gebuchten Plan bzw. den vertraglichen Vereinbarungen.</p>
        </section>

        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-cyan-300 hover:underline">
            Zurueck zur Startseite
          </Link>
        </div>
      </div>
    </main>);
}
