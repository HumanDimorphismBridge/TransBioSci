/** Accepted first-release parameters (docs/architecture.md). Not capacity guarantees. */
export const LIMITS = {
  nicknameMaxCodePoints: 40,
  bodyMaxCodePoints: 2000,
  pageSize: 20,
  pageSizeMax: 20,
  /** Max message IDs per GET /api/votes/me (2 bound parameters each; D1 allows 100). */
  votesMeMaxIds: 20,
  cooldownMs: 60_000,
  duplicateWindowMs: 10 * 60_000,
  quotaWindowMs: 10 * 60_000,
  quotaMaxPosts: 30,
  requestBodyMaxBytes: 16 * 1024,
  turnstileTokenMaxLength: 2048,
} as const;

export const DEFAULT_NICKNAME = 'Anon';
export const TURNSTILE_ACTION = 'guestbook-post';
export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface Env {
  DB: D1Database;
  /** "true" pauses posting and voting; reads keep working. Does not depend on D1. */
  GUESTBOOK_READ_ONLY?: string;
  /** Comma-separated browser origins allowed by CORS. */
  ALLOWED_ORIGINS?: string;
  /** Comma-separated expected Turnstile hostnames; empty disables hostname/action checks (local test keys only). */
  TURNSTILE_EXPECTED_HOSTNAMES?: string;
  /** Secrets */
  VISITOR_HASH_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export const csv = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const isReadOnly = (env: Env): boolean => env.GUESTBOOK_READ_ONLY?.trim().toLowerCase() === 'true';
