export type { TranslationKeys } from "./types.js";
export { en } from "./en.js";

import type { TranslationKeys } from "./types.js";
import { en } from "./en.js";
import { zhCN } from "./zh-CN.js";
import { zhTW } from "./zh-TW.js";
import { ja } from "./ja.js";
import { ko } from "./ko.js";
import { es } from "./es.js";
import { fr } from "./fr.js";
import { de } from "./de.js";
import { ptBR } from "./pt-BR.js";
import { ar } from "./ar.js";
import { ru } from "./ru.js";

/** Built-in locale packs, keyed by locale identifier. */
const locales: Record<string, TranslationKeys> = {
    en,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    ja,
    ko,
    es,
    fr,
    de,
    "pt-BR": ptBR,
    ar,
    ru,
};

type Params = Record<string, string | number>;

function interpolate(template: string, params?: Params): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, key: string) =>
        params[key] !== undefined ? String(params[key]) : `{${key}}`,
    );
}

/**
 * Resolve a locale identifier to a built-in translation pack.
 *
 * Tries exact match first (e.g. "zh-CN"), then base language (e.g. "zh"),
 * then falls back to English.
 */
function resolveLocale(locale: string): TranslationKeys {
    // Exact match
    if (locales[locale]) return locales[locale];
    // Base language fallback (e.g. "zh-Hans" → "zh-CN", "pt" → "pt-BR")
    const base = locale.split("-")[0];
    if (base === "zh") return zhCN;
    if (base === "pt") return ptBR;
    if (locales[base]) return locales[base];
    // Default to English
    return en;
}

/**
 * Lightweight i18n instance for the viewer.
 *
 * Created once per viewer via `createI18n()` and passed to all components.
 */
export interface I18n {
    /** Translate a key, optionally interpolating `{param}` placeholders. */
    t(key: string, params?: Params): string;
    /** Active locale identifier. */
    locale: string;
}

/**
 * Create an i18n instance.
 *
 * Resolves the locale to a built-in translation pack (en, zh-CN, ja, ko, es,
 * fr, de, pt-BR, ar, ru, zh-TW). Optional overrides are merged on top.
 *
 * @param locale - Locale identifier (e.g. "en", "zh-CN"). Defaults to "en".
 * @param overrides - Partial translation overrides. Merged on top of the resolved locale.
 */
export function createI18n(locale?: string, overrides?: Record<string, string>): I18n {
    const resolved = resolveLocale(locale ?? "en");
    const messages: Record<string, string> = overrides
        ? { ...(resolved as unknown as Record<string, string>), ...overrides }
        : (resolved as unknown as Record<string, string>);

    return {
        locale: locale ?? "en",
        t(key: string, params?: Params): string {
            const template = messages[key] ?? key;
            return interpolate(template, params);
        },
    };
}
