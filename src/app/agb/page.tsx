"use client";
import { translateText } from "@/lib/i18n";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
export default function AgbPage() {
    useAppPreferences();
    return (<main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-foreground sm:px-8">
      <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8">
        <LogoMark size={36} className="mb-5" />
        <h1 className="text-3xl font-semibold">{translateText("Terms and Conditions (AGB)")}</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/70">
          {translateText("These terms govern the use of CloseFlow. Have this placeholder content reviewed by legal counsel and finalized before launch.")}</p>

        <section className="mt-8 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("1. Scope")}</h2>
          <p className="mt-2">{translateText("These terms apply to all agreements between CloseFlow and its customers.")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("2. Services")}</h2>
          <p className="mt-2">{translateText("CloseFlow provides cloud-based CRM software with optional AI features.")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("3. User obligations")}</h2>
          <p className="mt-2">{translateText("Access credentials must be kept confidential. Content must be lawful and must not infringe third-party rights.")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("4. Pricing and billing")}</h2>
          <p className="mt-2">{translateText("The prices and payment terms displayed in the product or offer apply.")}</p>
        </section>

        <section className="mt-6 text-sm leading-7 text-foreground/85">
          <h2 className="text-lg font-semibold text-foreground">{translateText("5. Term and termination")}</h2>
          <p className="mt-2">{translateText("Contract terms and notice periods are governed by the selected plan and the applicable contractual agreements.")}</p>
        </section>

        <div className="mt-8">
          <Link href="/" className="text-sm font-semibold text-cyan-300 hover:underline">
            {translateText("Back to home")}</Link>
        </div>
      </div>
    </main>);
}
