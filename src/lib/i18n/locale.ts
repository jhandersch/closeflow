import type { AppLanguage } from "./types";

export const normalizeLanguage = (language: unknown): AppLanguage => language === "de" ? "de" : "en";

let activeLanguage: AppLanguage = "en";
export const getActiveLanguage = (): AppLanguage => activeLanguage;
export const setActiveLanguage = (language: AppLanguage) => { activeLanguage = language; };

export const getIntlLocale = (language: AppLanguage = activeLanguage): string => language === "de" ? "de-DE" : "en-US";

export const formatEuro = (
    value: number,
    language: AppLanguage = activeLanguage,
    options?: Intl.NumberFormatOptions,
): string => {
    const formatted = new Intl.NumberFormat(getIntlLocale(language), options).format(value);
    return language === "de" ? `${formatted} €` : `€${formatted}`;
};
