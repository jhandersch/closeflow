import { dictionary } from "./i18n/dictionary";
import { formatGermanTranslation, translateDynamicGermanText } from "./i18n/german-format";
import { germanKeyTranslations } from "./i18n/german-keys";
import { germanContextOverrides } from "./i18n/german-overrides";
import { germanTextTranslations } from "./i18n/german-texts";
import { getActiveLanguage } from "./i18n/locale";
import type { AppLanguage, DictionaryLeaf, DictionaryNode } from "./i18n/types";

export type { AppLanguage } from "./i18n/types";

/*
 * Data lives in ./i18n:
 *   dictionary.ts       English source texts addressed by dotted key ("nav.leads")
 *   german-keys.ts      German translations of those dotted keys
 *   german-texts.ts     German translations of free texts (looked up by English text)
 *   german-overrides.ts context-specific wording that wins over both maps above
 *   german-format.ts    formal "Sie" conversion, terminology and amount formatting
 * This file only contains the lookup logic and the public API.
 */

export { formatEuro, getIntlLocale, normalizeLanguage, setActiveLanguage } from "./i18n/locale";

// Dotted-key dictionary
const buildDictionary = (source: DictionaryNode, prefix = ""): DictionaryNode => {
    const result: DictionaryNode = {};
    for (const [key, value] of Object.entries(source)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        result[key] = typeof value === "string"
            ? formatGermanTranslation(germanContextOverrides[fullKey] ?? germanKeyTranslations[fullKey] ?? value)
            : buildDictionary(value, fullKey);
    }
    return result;
};
const germanDictionary = buildDictionary(dictionary);
export const getDictionary = (language: AppLanguage = "en"): DictionaryNode => language === "de" ? germanDictionary : dictionary;

// Free-text translation
export const formatTextForLanguage = (text: string, language: AppLanguage): string =>
    language === "de" ? formatGermanTranslation(text) : text;
export const translateText = (text: string, language: AppLanguage = getActiveLanguage()): string => {
    if (language !== "de") return text;
    const key = text.trim();
    const translated = germanContextOverrides[key]
        ?? germanTextTranslations[key]
        ?? translateDynamicGermanText(key);
    return translated === undefined ? formatGermanTranslation(text) : formatGermanTranslation(translated);
};
export const translatePlanName = (plan: string): string => {
    const normalized = plan.trim().toLowerCase();
    if (normalized === "free") return translateText("Free");
    if (normalized === "pro") return "Pro";
    if (normalized === "business") return "Business";
    return plan;
};
export const translateTeamRole = (role: string): string => {
    const labels: Record<string, string> = {
        owner: "Owner",
        admin: "Administrator",
        member: "Member",
        viewer: "Viewer",
        sales_manager: "Sales manager",
        sales: "Sales rep",
    };
    return translateText(labels[role] ?? role);
};
export const translateKey = (dictionary: DictionaryNode, key: string, fallback?: string): string => {
    const parts = key.split(".");
    let current: DictionaryLeaf | DictionaryNode | undefined = dictionary;
    for (const part of parts) {
        if (!current || typeof current === "string") {
            return fallback ? translateText(fallback) : key;
        }
        current = current[part];
    }
    return typeof current === "string" ? current : fallback ? translateText(fallback) : key;
};
