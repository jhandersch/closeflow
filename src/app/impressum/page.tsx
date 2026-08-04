import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Impressum | CloseFlow",
  description: "Impressum gemaess deutschem Recht fuer CloseFlow.",
}

export default function ImpressumPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <h1 className="text-3xl font-semibold">Impressum</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          Angaben gemaess Paragraph 5 TMG. Bitte ersetze die Platzhalter vor dem Go-Live mit den finalen Firmendaten.
        </p>

        <section className="mt-8 space-y-2 text-sm leading-7 text-foreground/85">
          <p><strong>CloseFlow GmbH</strong></p>
          <p>Musterstrasse 1</p>
          <p>10115 Berlin</p>
          <p>Deutschland</p>
          <p>E-Mail: legal@closeflow.example</p>
          <p>Telefon: +49 30 000000</p>
          <p>Vertreten durch: Max Mustermann</p>
          <p>Handelsregister: HRB 000000 (Platzhalter)</p>
          <p>USt-IdNr.: DE000000000 (Platzhalter)</p>
        </section>

        <section className="mt-8 text-sm leading-7 text-foreground/75">
          <h2 className="text-lg font-semibold text-foreground">Haftung fuer Inhalte</h2>
          <p className="mt-2">
            Die Inhalte dieser Seite wurden mit groesster Sorgfalt erstellt. Fuer die Richtigkeit, Vollstaendigkeit und Aktualitaet kann jedoch keine Gewaehr uebernommen werden.
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
