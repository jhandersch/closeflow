import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Cookie-Hinweis | CloseFlow",
  description: "Informationen zur Nutzung von Cookies und aehnlichen Technologien in CloseFlow.",
}

export default function CookiesPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <h1 className="text-3xl font-semibold">Cookie-Hinweis</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          CloseFlow verwendet Cookies und vergleichbare Technologien fuer technische Bereitstellung, Sicherheit und Analyse.
        </p>

        <section className="mt-8 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">1. Notwendige Cookies</h2>
          <p className="mt-2">Diese Cookies sind fuer Login, Session-Schutz und Kernfunktionen des Produkts erforderlich.</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">2. Funktionale Cookies</h2>
          <p className="mt-2">Diese Cookies speichern z. B. Spracheinstellungen oder andere Komfortfunktionen.</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">3. Analyse und Verbesserung</h2>
          <p className="mt-2">Wir koennen Nutzungsdaten pseudonymisiert auswerten, um Produktqualitaet und Stabilitaet zu verbessern.</p>
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
