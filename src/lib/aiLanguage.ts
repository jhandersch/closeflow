const GERMAN_RULES = `
LANGUAGE AND TERMINOLOGY (German output):
- Write natural, fluent German. Do not leave English sentences or English business jargon in the text.
- Use these app terms exactly: "Lead" (never "Opportunity", "Deal" or "Verkaufschance"), "Abschlusswert" (never "Deal Value" or "Dealwert"), "Pipeline" (never "Vertriebspipeline"), "Phase" (never "Stage"), "Follow-up" / "Follow-ups" (never "Nachfassaktion"), "Abschluss", "Prognose", "Risiko".
- Translate lead stage and status names from the input into German, for example: new = Neu, contacted = Kontaktiert, qualified = Qualifiziert, proposal = Angebot, negotiation = Verhandlung, won = Gewonnen, lost = Verloren.
- Keep names of people, companies and products unchanged. Write currency amounts like "12.500 €".
- JSON keys and enum values required by the schema stay in English; only the text values are German.`;

export const aiTerminologyRules = (language: string | undefined): string =>
  language === "de" ? GERMAN_RULES : "";
