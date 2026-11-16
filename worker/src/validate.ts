import { DEFAULT_NICKNAME, LIMITS } from './config';
import { HttpError } from './http';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const codePoints = (s: string): number => [...s].length;

/** Anonymous browser identity from the X-Visitor-Id header (kept out of URLs). */
export function visitorId(request: Request): string {
  const value = request.headers.get('X-Visitor-Id')?.trim() ?? '';
  if (!UUID_V4.test(value)) throw new HttpError(400, 'invalid_visitor');
  return value.toLowerCase();
}

/** Nickname: single line, control characters removed, blank becomes "Anon". */
export function normalizeNickname(value: unknown): string {
  if (value === undefined || value === null) return DEFAULT_NICKNAME;
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_input', { field: 'nickname', reason: 'type' });
  const cleaned = value
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (codePoints(cleaned) > LIMITS.nicknameMaxCodePoints) {
    throw new HttpError(400, 'invalid_input', { field: 'nickname', reason: 'too_long', max: LIMITS.nicknameMaxCodePoints });
  }
  return cleaned || DEFAULT_NICKNAME;
}

/** Body: plain text, CRLF normalized, control characters except newline/tab removed, trimmed. */
export function normalizeBody(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_input', { field: 'body', reason: 'required' });
  const cleaned = value
    .replace(/\r\n?/g, '\n')
    .replace(/[^\P{Cc}\n\t]/gu, '')
    .trim();
  if (!cleaned) throw new HttpError(400, 'invalid_input', { field: 'body', reason: 'required' });
  if (codePoints(cleaned) > LIMITS.bodyMaxCodePoints) {
    throw new HttpError(400, 'invalid_input', { field: 'body', reason: 'too_long', max: LIMITS.bodyMaxCodePoints });
  }
  return cleaned;
}

export function turnstileToken(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > LIMITS.turnstileTokenMaxLength) {
    throw new HttpError(403, 'turnstile_failed');
  }
  return value;
}

export function positiveId(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (!/^\d{1,15}$/.test(value)) throw new HttpError(400, 'invalid_input', { field: 'id' });
  const n = Number(value);
  if (n < 1) throw new HttpError(400, 'invalid_input', { field: 'id' });
  return n;
}

export function voteValue(value: unknown): -1 | 0 | 1 {
  if (value === 1 || value === 0 || value === -1) return value;
  throw new HttpError(400, 'invalid_input', { field: 'vote' });
}
