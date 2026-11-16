import { DIRECTIONS, LANGS, type Direction, type Lang } from '../i18n/config';

/** Static paths helpers for getStaticPaths. */
export const langPaths = () => LANGS.map((lang) => ({ params: { lang } }));

export const langDirPaths = () =>
  LANGS.flatMap((lang) => DIRECTIONS.map((dir) => ({ params: { lang, dir } })));

export function mapLangs<T>(fn: (lang: Lang) => T): Record<Lang, T> {
  return Object.fromEntries(LANGS.map((l) => [l, fn(l)])) as Record<Lang, T>;
}

export function mapDirections<T>(fn: (dir: Direction) => T): Record<Direction, T> {
  return Object.fromEntries(DIRECTIONS.map((d) => [d, fn(d)])) as Record<Direction, T>;
}
