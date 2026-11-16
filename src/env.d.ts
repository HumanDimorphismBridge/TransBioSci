interface ImportMetaEnv {
  /** Guestbook Worker origin, e.g. https://transbiosci-guestbook.<subdomain>.workers.dev (no trailing slash). */
  readonly PUBLIC_GUESTBOOK_API_URL?: string;
  /** Turnstile site key (public). */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
