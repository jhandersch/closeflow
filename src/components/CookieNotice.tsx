"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
const COOKIE_NOTICE_KEY = "closeflow_cookie_notice_ack";
export default function CookieNotice() {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const acknowledged = window.localStorage.getItem(COOKIE_NOTICE_KEY);
        if (!acknowledged) {
            setVisible(true);
        }
    }, []);
    const acknowledge = () => {
        window.localStorage.setItem(COOKIE_NOTICE_KEY, new Date().toISOString());
        setVisible(false);
    };
    if (!visible) {
        return null;
    }
    return (<div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-3xl rounded-2xl border border-border-subtle bg-surface-1/95 p-4 shadow-2xl backdrop-blur-sm sm:inset-x-6">
      <p className="text-sm leading-6 text-foreground/85">
        CloseFlow verwendet Cookies und aehnliche Technologien, um Anmeldung, Sicherheit und Produktfunktion zu ermoeglichen.
        Details findest du in der {" "}
        <Link href="/datenschutz" className="font-semibold text-cyan-300 hover:underline">
          Datenschutzerklaerung
        </Link>{" "}
        und im {" "}
        <Link href="/cookies" className="font-semibold text-cyan-300 hover:underline">
          Cookie-Hinweis
        </Link>
        .
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={acknowledge} className="rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
          Alle akzeptieren
        </button>
        <Link href="/cookies" className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-semibold text-foreground/85 transition hover:bg-foreground/5">
          Settings ansehen
        </Link>
      </div>
    </div>);
}
