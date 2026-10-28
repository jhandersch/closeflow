"use client";
import { translateText } from "@/lib/i18n";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
export default function ImpressumPage() {
    useAppPreferences();
    return (<main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <LogoMark size={36} className="mb-5" />
        <h1 className="text-3xl font-semibold">{translateText("Impressum")}</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          {translateText("Information pursuant to Section 5 TMG. Replace placeholders with final company details before go-live.")}</p>

        <section className="mt-8 space-y-2 text-sm leading-7 text-foreground/85">
          <p><strong>{translateText("CloseFlow GmbH")}</strong></p>
          <p>{translateText("Sample Street 1")}</p>
          <p>{translateText("10115 Berlin")}</p>
          <p>{translateText("Germany")}</p>
          <p>{translateText("Email: legal@closeflow.example")}</p>
          <p>{translateText("Phone: +49 30 000000")}</p>
          <p>{translateText("Vertreten durch: Max Mustermann")}</p>
          <p>{translateText("Handelsregister: HRB 000000 (Platzhalter)")}</p>
          <p>{translateText("USt-IdNr.: DE000000000 (Platzhalter)")}</p>
        </section>

        <section className="mt-8 text-sm leading-7 text-foreground/75">
        <h2 className="text-lg font-semibold text-foreground">{translateText("Liability for content")}</h2>
          <p className="mt-2">
            {translateText("This page was prepared with the greatest care. However, no guarantee can be made for its accuracy, completeness, or currency.")}</p>
        </section>

        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-cyan-300 hover:underline">
            {translateText("Back to home")}</Link>
        </div>
      </div>
    </main>);
}
