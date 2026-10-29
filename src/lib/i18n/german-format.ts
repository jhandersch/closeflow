// Rules that turn German translations into the formal "Sie" register and normalise
// terminology, currency amounts and dynamic sentences.

import { formatEuro } from "./locale";

const formalImperatives: Array<[string, string]> = [
    ["Melde dich", "Melden Sie sich"],
    ["Sieh dir", "Sehen Sie sich"],
    ["Schau dir", "Sehen Sie sich"],
    ["Aktiviere", "Aktivieren Sie"],
    ["Bearbeite", "Bearbeiten Sie"],
    ["Bestätige", "Bestätigen Sie"],
    ["Behalte", "Behalten Sie"],
    ["Checke", "Prüfen Sie"],
    ["Erstelle", "Erstellen Sie"],
    ["Füge", "Fügen Sie"],
    ["Fülle", "Füllen Sie"],
    ["Gib", "Geben Sie"],
    ["Halte", "Halten Sie"],
    ["Lade", "Laden Sie"],
    ["Lege", "Legen Sie"],
    ["Lösche", "Löschen Sie"],
    ["Melde", "Melden Sie"],
    ["Nimm", "Nehmen Sie"],
    ["Öffne", "Öffnen Sie"],
    ["Prüfe", "Prüfen Sie"],
    ["Richte", "Richten Sie"],
    ["Sammle", "Sammeln Sie"],
    ["Scanne", "Scannen Sie"],
    ["Schreibe", "Schreiben Sie"],
    ["Setze", "Setzen Sie"],
    ["Sieh", "Sehen Sie"],
    ["Stelle", "Stellen Sie"],
    ["Teile", "Teilen Sie"],
    ["Verwandle", "Verwandeln Sie"],
    ["Verwalte", "Verwalten Sie"],
    ["Verbinde", "Verbinden Sie"],
    ["Vergleiche", "Vergleichen Sie"],
    ["Wähle", "Wählen Sie"],
    ["Zeige", "Zeigen Sie"],
    ["Ändere", "Ändern Sie"],
    ["Ergänze", "Ergänzen Sie"],
    ["Erkunde", "Erkunden Sie"],
    ["Frage", "Fragen Sie"],
    ["Klicke", "Klicken Sie"],
    ["Nutze", "Nutzen Sie"],
    ["Plane", "Planen Sie"],
    ["Starte", "Starten Sie"],
    ["Verfolge", "Verfolgen Sie"],
    ["Versuche", "Versuchen Sie"],
    ["Fasse", "Fassen Sie"],
    ["Filtere", "Filtern Sie"],
    ["Sortiere", "Sortieren Sie"],
    ["Erfasse", "Erfassen Sie"],
    ["Importiere", "Importieren Sie"],
    ["Exportiere", "Exportieren Sie"],
    ["Gestalte", "Gestalten Sie"],
    ["Lies", "Lesen Sie"],
    ["Mache", "Machen Sie"],
];

const formalizeGermanAddress = (text: string) => {
    let result = text;

    for (const [informal, formal] of formalImperatives) {
        const expression = new RegExp(`\\b${informal}\\b`, "gi");
        result = result.replace(expression, (match) =>
            match[0] === match[0].toUpperCase()
                ? formal
                : `${formal[0].toLowerCase()}${formal.slice(1)}`,
        );
    }

    const conjugations: Record<string, string> = {
        kannst: "können",
        hast: "haben",
        bist: "sind",
        möchtest: "möchten",
        musst: "müssen",
        brauchst: "brauchen",
        findest: "finden",
        bekommst: "erhalten",
        weißt: "wissen",
        willst: "wollen",
        sollst: "sollen",
        darfst: "dürfen",
        wirst: "werden",
        erhältst: "erhalten",
        verstehst: "verstehen",
        meldest: "melden",
        fühlst: "fühlen",
        teilst: "teilen",
        hättest: "hätten",
        könntest: "könnten",
        solltest: "sollten",
    };
    for (const [informal, formal] of Object.entries(conjugations)) {
        const expression = new RegExp(`\\b${informal}\\b`, "gi");
        result = result.replace(expression, (match) =>
            match[0] === match[0].toUpperCase()
                ? `${formal[0].toUpperCase()}${formal.slice(1)}`
                : formal,
        );
    }

    result = result
        .replace(/\bdass du dir\b/gi, "dass Sie sich")
        .replace(/\bdu (können|haben|sind|möchten|müssen|brauchen|finden|erhalten|wissen|wollen|sollen|dürfen|werden|fühlen|melden)\s+Sie\b/gi, "Sie $1 sich")
        .replace(/\bSie (können|haben|sind|möchten|müssen|brauchen|finden|erhalten|wissen|wollen|sollen|dürfen|werden|fühlen|melden)\s+Sie\b/gi, "Sie $1 sich");

    const pronouns: Record<string, string> = {
        deinem: "Ihrem",
        deiner: "Ihrer",
        deinen: "Ihren",
        deines: "Ihres",
        deine: "Ihre",
        dein: "Ihr",
        dich: "Sie",
        dir: "Ihnen",
        du: "Sie",
    };
    for (const [informal, formal] of Object.entries(pronouns)) {
        const expression = new RegExp(`\\b${informal}\\b`, "gi");
        result = result.replace(expression, (match) =>
            match[0] === match[0].toUpperCase()
                ? `${formal[0].toUpperCase()}${formal.slice(1)}`
                : formal,
        );
    }

    return result;
};

const germanizeFollowUpTerms = (text: string) => {
    const contextual = text
        .replace(/\bAbschlüsse\b/gi, "Leads")
        .replace(/\bVerkaufschancen\b/gi, "Leads")
        .replace(/\bVerkaufschance\b/gi, "Lead")
        .replace(/massnahmen?/gi, (word) => word.toLowerCase().endsWith("n") ? "Maßnahmen" : "Maßnahme")
        .replace(/Vom Arbeitsbereich zum ersten Follow-up in wenigen Minuten\./gi, "Vom Arbeitsbereich zur ersten Nachfassaktion in wenigen Minuten.")
        .replace(/Offene Leads, bei denen ein Follow-up anstehen könnte\./gi, "Offene Leads, bei denen eine Nachfassaktion anstehen könnte.")
        .replace(/Aktive Deals, für die ein Follow-up ansteht/gi, "Aktive Leads mit ausstehender Nachfassaktion")
        .replace(/Follow-up in (\d+) Tagen durchführen/gi, "In $1 Tagen nachfassen")
        .replace(/Follow-up in (\d+) days?/gi, "In $1 Tagen nachfassen")
        .replace(/Follow-ups beim Abschluss behalten/gi, "Nachfassaktionen beim Abschluss im Blick behalten")
        .replace(/Follow-ups beim Deal behalten/gi, "Nachfassaktionen beim Abschluss im Blick behalten")
        .replace(/Follow-up für neuen Lead/gi, "Nachfassaktion für einen neuen Lead")
        .replace(/Follow-up erforderlich/gi, "Nachfassaktion erforderlich")
        .replace(/Follow-up sinnvoll/gi, "Nachfassen sinnvoll")
        .replace(/Follow-up senden/gi, "Nachfassnachricht senden")
        .replace(/Follow-up kopieren/gi, "Nachfassaktion kopieren")
        .replace(/Follow-up zu unserem Gespräch/gi, "Rückmeldung zu unserem Gespräch")
        .replace(/Follow-up mit dem Lead planen/gi, "Beim Lead nachfassen")
        .replace(/Follow-up zum Angebot planen/gi, "Zum Angebot nachfassen")
        .replace(/Follow-up reminders?/gi, "Erinnerung zum Nachfassen")
        .replace(/Follow-up-Termin vereinbart/gi, "Nachfassgespräch vereinbart")
        .replace(/Follow-up zu unserem Gespräch/gi, "Rückmeldung zu unserem Gespräch")
        .replace(/planen Sie gezielte Follow-ups/gi, "Plane gezielte Nachfassaktionen");

    return contextual
        .replace(/Follow-up-Erinnerungen/gi, "Erinnerungen zum Nachfassen")
        .replace(/Follow-up-Entwurf/gi, "Entwurf für eine Nachfass-E-Mail")
        .replace(/Follow-up-E-Mail/gi, "Nachfass-E-Mail")
        .replace(/Follow-up-Nachricht/gi, "Nachfassnachricht")
        .replace(/Follow-up-Abläufe/gi, "Nachfassabläufe")
        .replace(/Follow-up-Gespräch/gi, "Nachfassgespräch")
        .replace(/Follow-ups/gi, "Nachfassaktionen")
        .replace(/Follow-up/gi, "Nachfassaktion");
};

const formatGermanEuroAmounts = (text: string) => text.replace(/€\s*(-?\d[\d.,]*(?:\s?[kKmM])?)/g, (_match, rawAmount: string) => {
    const amount = rawAmount.replace(/\s/g, "");
    const suffix = amount.match(/[kKmM]$/)?.[0]?.toLowerCase();
    const numeric = suffix ? amount.slice(0, -1) : amount;
    const lastComma = numeric.lastIndexOf(",");
    const lastDot = numeric.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : lastDot > lastComma ? "." : "";
    let normalized = numeric;
    let minimumFractionDigits = 0;

    if (decimalSeparator) {
        const separatorIndex = numeric.lastIndexOf(decimalSeparator);
        const integerPart = numeric.slice(0, separatorIndex).replace(/[.,]/g, "");
        const fractionPart = numeric.slice(separatorIndex + 1);
        const looksLikeThousands = fractionPart.length === 3;
        normalized = looksLikeThousands
            ? numeric.replace(/[.,]/g, "")
            : `${integerPart}.${fractionPart}`;
        if (!looksLikeThousands) minimumFractionDigits = Math.min(2, fractionPart.length);
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return _match;
    const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1;
    return formatEuro(parsed * multiplier, "de", { minimumFractionDigits, maximumFractionDigits: 2 });
});

export const formatGermanTranslation = (text: string) => germanizeFollowUpTerms(formatGermanEuroAmounts(text));

export const translateDynamicGermanText = (text: string): string | undefined => {
    const noActivityMatch = text.match(/^No activity for (\d+) days?\.$/);
    if (noActivityMatch) {
        const days = Number(noActivityMatch[1]);
        return `Seit ${days} ${days === 1 ? "Tag" : "Tagen"} keine Aktivität.`;
    }

    const daysAgoMatch = text.match(/^(\d+) days? ago$/);
    if (daysAgoMatch) {
        const days = Number(daysAgoMatch[1]);
        return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
    }

    const durationMatch = text.match(/^(\d+) days?$/);
    if (durationMatch) {
        const days = Number(durationMatch[1]);
        return `${days} ${days === 1 ? "Tag" : "Tage"}`;
    }

    const importMatch = text.match(/^Import done\. Added (\d+) leads, updated (\d+), unchanged (\d+), skipped (\d+)(?:\. (\d+) issue\(s\) available in report)?\.$/);
    if (importMatch) {
        const [, added, updated, unchanged, skipped, issueCount] = importMatch;
        const issueSummary = issueCount
            ? ` ${issueCount} ${issueCount === "1" ? "Problem ist" : "Probleme sind"} im Bericht verfügbar.`
            : "";
        return `Import abgeschlossen: ${added} Leads hinzugefügt, ${updated} aktualisiert, ${unchanged} unverändert und ${skipped} übersprungen.${issueSummary}`;
    }

    return undefined;
};
