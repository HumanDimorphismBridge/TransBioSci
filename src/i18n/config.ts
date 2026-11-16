/** Interface languages (URL segment). */
export const LANGS = ['zh', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'zh';

/** Content projection keys. Interface `zh` reads projection `zh-CN`. */
export const LOCALES = ['zh-CN', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_OF: Record<Lang, Locale> = { zh: 'zh-CN', en: 'en' };

/** Value for the <html lang> attribute and hreflang. */
export const HTML_LANG: Record<Lang, string> = { zh: 'zh-CN', en: 'en' };

/** Short label shown in the language switcher. */
export const LANG_LABEL: Record<Lang, string> = { zh: '中文', en: 'EN' };

/** Directions shared by both knowledge bases, all at the same level. */
export const DIRECTIONS = ['ftm', 'mtf', 'ntf', 'ntm'] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const DEFAULT_DIRECTION: Direction = 'ftm';
export const DIRECTION_LABEL: Record<Direction, string> = {
  ftm: 'FtM',
  mtf: 'MtF',
  ntf: 'NtF',
  ntm: 'NtM',
};

export type KnowledgeBase = 'trans' | 'dimorphism';

/** localStorage keys for browsing preferences (per-browser conveniences only). */
export const STORAGE_KEYS = {
  lang: 'tbs:lang',
  direction: (kb: KnowledgeBase) => `tbs:dir:${kb}`,
} as const;
