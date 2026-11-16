import type { Direction, Lang } from '../i18n/config';

const rawBase = import.meta.env.BASE_URL;
/** Project base path, always with a trailing slash (e.g. "/TransBioSci/"). */
export const BASE = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

/** Prefix a site-relative path with the base path; directory URLs end with a slash. */
export function withBase(path = ''): string {
  const clean = path.replace(/^\/+/, '');
  return clean === '' ? BASE : `${BASE}${clean.endsWith('/') ? clean : `${clean}/`}`;
}

/** URL of a file in public/ (no trailing slash). */
export const asset = (file: string): string => `${BASE}${file.replace(/^\/+/, '')}`;

export const routes = {
  root: () => withBase(),
  home: (lang: Lang) => withBase(`${lang}/`),
  transEntry: (lang: Lang) => withBase(`${lang}/trans/`),
  transIntro: (lang: Lang, dir: Direction) => withBase(`${lang}/trans/${dir}/`),
  article: (lang: Lang, dir: Direction, nodeId: string) => withBase(`${lang}/trans/${dir}/${nodeId}/`),
  dimorphismEntry: (lang: Lang) => withBase(`${lang}/dimorphism/`),
  tissueGrid: (lang: Lang, dir: Direction) => withBase(`${lang}/dimorphism/${dir}/`),
  tissue: (lang: Lang, dir: Direction, tissueId: string) => withBase(`${lang}/dimorphism/${dir}/${tissueId}/`),
  guestbook: (lang: Lang) => withBase(`${lang}/guestbook/`),
  contact: (lang: Lang) => withBase(`${lang}/contact/`),
  sources: (lang: Lang) => withBase(`${lang}/sources/`),
};
