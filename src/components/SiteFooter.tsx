"use client";

import Link from "next/link";

import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { LogoMark } from "@/components/Logo";
import { translateText } from "@/lib/i18n";

export default function SiteFooter() {
  const { language, setLanguage, theme, setTheme } = useAppPreferences();
  const de = language === "de";

  return (
    <footer className="border-t border-border-subtle bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 text-xs text-foreground/45 sm:px-8 md:flex-row md:flex-wrap md:items-center md:justify-between lg:flex-nowrap lg:px-10">
        <div className="flex items-center gap-2"><LogoMark size={28} /><span>{translateText("Â© 2026 CloseFlow")}</span></div>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="footer-language">{de ? "Sprache" : "Language"}</label>
          <select id="footer-language" value={language} onChange={(event) => setLanguage(event.target.value === "de" ? "de" : "en")} className="rounded-xl border border-border-subtle bg-surface-1 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-cyan-400">
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
          <label className="sr-only" htmlFor="footer-theme">{de ? "Darstellung" : "Theme"}</label>
          <select id="footer-theme" value={theme} onChange={(event) => setTheme(event.target.value === "light" ? "light" : "dark")} className="rounded-xl border border-border-subtle bg-surface-1 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-cyan-400">
            <option value="light">{de ? "Hell" : "Light"}</option>
            <option value="dark">{de ? "Dunkel" : "Dark"}</option>
          </select>
        </div>
        <nav aria-label={translateText("Footer navigation")} className="flex flex-wrap gap-x-4 gap-y-2 whitespace-nowrap">
          <Link href="/pricing" className="transition hover:text-foreground">{translateText("Pricing")}</Link>
          <Link href="/login" className="transition hover:text-foreground">{translateText("Log in")}</Link>
          <Link href="/impressum" className="transition hover:text-foreground">{de ? "Impressum" : "Legal notice"}</Link>
          <Link href="/datenschutz" className="transition hover:text-foreground">{de ? "Datenschutz" : "Privacy policy"}</Link>
          <Link href="/cookies" className="transition hover:text-foreground">{translateText("Cookies")}</Link>
          <Link href="/agb" className="transition hover:text-foreground">{de ? "AGB" : "Terms"}</Link>
        </nav>
      </div>
    </footer>
  );
}
