import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Datenschutz | CloseFlow",
  description: "Datenschutzerklaerung fuer CloseFlow gemaess DSGVO.",
}

export default function DatenschutzPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <h1 className="text-3xl font-semibold">Datenschutzerklaerung</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          Diese Seite beschreibt, wie CloseFlow personenbezogene Daten verarbeitet. Bitte die Platzhalterangaben vor Produktionsstart rechtlich finalisieren.
        </p>

        <section className="mt-8 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">1. Verantwortliche Stelle</h2>
          <p className="mt-2">CloseFlow GmbH, Musterstrasse 1, 10115 Berlin, Deutschland</p>
          <p>E-Mail: privacy@closeflow.example</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">2. Verarbeitete Daten</h2>
          <p className="mt-2">
            Wir verarbeiten insbesondere Account-Daten, Workspace-Daten, CRM-Nutzungsdaten, technische Logdaten sowie freiwillig bereitgestellte Inhalte.
          </p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">3. Zwecke und Rechtsgrundlagen</h2>
          <p className="mt-2">
            Die Verarbeitung erfolgt zur Vertragserfuellung, zur Sicherstellung des Betriebs, zur Missbrauchspraevention sowie auf Basis berechtigter Interessen und ggf. Einwilligungen.
          </p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">4. Betroffenenrechte</h2>
          <p className="mt-2">
            Du hast das Recht auf Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung, Datenuebertragbarkeit und Widerspruch. Zudem besteht ein Beschwerderecht bei einer Aufsichtsbehoerde.
          </p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">5. Speicherdauer</h2>
          <p className="mt-2">
            Daten werden nur so lange gespeichert, wie es fuer die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
          </p>
        </section>

        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-cyan-300 hover:underline">
            Zurueck zur Startseite
          </Link>
        </div>
      </div>
    </main>
  )
}
