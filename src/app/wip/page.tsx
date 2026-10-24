import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "In Arbeit | CloseFlow",
  description: "CloseFlow ist noch in Arbeit und derzeit nicht öffentlich verfügbar.",
  robots: { index: false, follow: false },
};

export default function WorkInProgressPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12 text-foreground">
      <div className="w-full rounded-3xl border border-border-subtle bg-surface-1 p-8 text-center">
        <LogoMark size={40} className="mx-auto mb-5" />
        <h1 className="text-2xl font-semibold">CloseFlow ist in Arbeit</h1>
        <p className="mt-4 text-sm leading-7 text-foreground/75">
          Die Anwendung ist noch nicht öffentlich verfügbar. Registrierung und Anmeldung sind derzeit nicht möglich.
        </p>
        <p className="mt-2 text-sm leading-7 text-foreground/60">Bitte schau später noch einmal vorbei.</p>
      </div>
    </main>
  );
}
