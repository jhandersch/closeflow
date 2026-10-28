"use client";
import { translateText } from "@/lib/i18n";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
export default function DatenschutzPage() {
    useAppPreferences();
    return (<main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <LogoMark size={36} className="mb-5" />
        <h1 className="text-3xl font-semibold">{translateText("Privacy policy")}</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          {translateText("This page describes how CloseFlow processes personal data. Finalize the placeholder information with legal counsel before production.")}</p>

        <section className="mt-8 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("1. Controller")}</h2>
          <p className="mt-2">{translateText("CloseFlow GmbH, Sample Street 1, 10115 Berlin, Germany")}</p>
          <p>{translateText("Email: privacy@closeflow.example")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("2. Data processed")}</h2>
          <p className="mt-2">
            {translateText("We process account data, workspace data, CRM usage data, technical log data, and content you choose to provide.")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("3. Purposes and legal bases")}</h2>
          <p className="mt-2">
            {translateText("We process data to perform our contract, operate the service, prevent misuse, and pursue legitimate interests or obtain consent where required.")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("4. Your rights")}</h2>
          <p className="mt-2">
            {translateText("You have the right to access, correct, erase, and restrict the processing of your data, to data portability, and to object. You may also lodge a complaint with a supervisory authority.")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("5. Data retention")}</h2>
          <p className="mt-2">
            {translateText("We retain data only as long as necessary for these purposes or as required by statutory retention obligations.")}</p>
        </section>

        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-cyan-300 hover:underline">
            {translateText("Back to home")}</Link>
        </div>
      </div>
    </main>);
}
