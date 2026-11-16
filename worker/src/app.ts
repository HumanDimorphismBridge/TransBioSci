import { LIMITS, isReadOnly, type Env } from './config';
import { HttpError, corsHeaders, errorResponse, json, preflight, readJson } from './http';
import { createTurnstileVerifier, postHash, voteHash, type TurnstileVerifier } from './security';
import { normalizeBody, normalizeNickname, positiveId, turnstileToken, visitorId, voteValue } from './validate';

export interface Deps {
  /** Current time in ms; injectable for tests. */
  now: () => number;
  verifyTurnstile: TurnstileVerifier;
}

export interface MessageDto {
  id: number;
  nickname: string;
  body: string;
  createdAt: string;
  likes: number;
  dislikes: number;
}

interface MessageRow {
  id: number;
  nickname: string;
  body: string;
  created_at: string;
  likes: number;
  dislikes: number;
}

const toDto = (row: MessageRow): MessageDto => ({
  id: row.id,
  nickname: row.nickname,
  body: row.body,
  createdAt: row.created_at,
  likes: Number(row.likes),
  dislikes: Number(row.dislikes),
});

const iso = (ms: number) => new Date(ms).toISOString();
const seconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

function assertWritable(env: Env): void {
  // Checked before any D1 access so the switch works even when D1 is unavailable.
  if (isReadOnly(env)) throw new HttpError(503, 'read_only');
}

/** GET /api/messages?before=<id>&limit=<n> — newest first, keyset pagination by ID. */
async function listMessages(url: URL, env: Env): Promise<Response> {
  const before = positiveId(url.searchParams.get('before'));
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : LIMITS.pageSize;
  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.pageSizeMax) {
    throw new HttpError(400, 'invalid_input', { field: 'limit' });
  }
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.nickname, m.body, m.created_at,
            COALESCE(SUM(v.vote = 1), 0) AS likes,
            COALESCE(SUM(v.vote = -1), 0) AS dislikes
       FROM messages m
       LEFT JOIN votes v ON v.message_id = m.id
      WHERE ?1 IS NULL OR m.id < ?1
      GROUP BY m.id
      ORDER BY m.id DESC
      LIMIT ?2`,
  )
    .bind(before ?? null, limit + 1)
    .all<MessageRow>();
  const page = results.slice(0, limit).map(toDto);
  const nextCursor = results.length > limit ? page[page.length - 1].id : null;
  return json({ messages: page, nextCursor, readOnly: isReadOnly(env) });
}

/** GET /api/votes/me?ids=1,2,3 — the current browser's votes for the listed messages. */
async function myVotes(request: Request, url: URL, env: Env): Promise<Response> {
  const visitor = visitorId(request);
  const raw = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
  if (raw.length > LIMITS.votesMeMaxIds) throw new HttpError(400, 'invalid_input', { field: 'ids' });
  const ids = [...new Set(raw.map((v) => positiveId(v)!))];
  if (!ids.length) return json({ votes: {} });
  const hashes = await Promise.all(ids.map((id) => voteHash(env, id, visitor)));
  const where = ids.map(() => '(message_id = ? AND visitor_hash = ?)').join(' OR ');
  const { results } = await env.DB.prepare(`SELECT message_id, vote FROM votes WHERE ${where}`)
    .bind(...ids.flatMap((id, i) => [id, hashes[i]]))
    .all<{ message_id: number; vote: number }>();
  const votes: Record<string, number> = {};
  for (const row of results) votes[String(row.message_id)] = row.vote;
  return json({ votes });
}

/** POST /api/messages — Turnstile, input checks, then one atomic conditional insert. */
async function createMessage(request: Request, env: Env, deps: Deps): Promise<Response> {
  assertWritable(env);
  const visitor = visitorId(request);
  const data = await readJson(request, LIMITS.requestBodyMaxBytes);
  const nickname = normalizeNickname(data.nickname);
  const body = normalizeBody(data.body);
  const token = turnstileToken(data.turnstileToken);
  // Failed verification returns before any write, so it never consumes the posting quota.
  if (!(await deps.verifyTurnstile(token, env))) throw new HttpError(403, 'turnstile_failed');

  const now = deps.now();
  const nowIso = iso(now);
  const cooldownCutoff = iso(now - LIMITS.cooldownMs);
  const duplicateCutoff = iso(now - LIMITS.duplicateWindowMs);
  const windowStart = Math.floor(now / LIMITS.quotaWindowMs) * LIMITS.quotaWindowMs;
  const windowStartSeconds = windowStart / 1000;
  const posterHash = await postHash(env, visitor);

  // D1 runs a batch as one transaction. The INSERT checks cooldown, duplicate body and the
  // fixed-window site quota in the same statement that writes, so concurrent requests cannot
  // all pass the check. The cooldown row is written only when that INSERT changed a row.
  const [, inserted] = await env.DB.batch<MessageRow>([
    env.DB.prepare('DELETE FROM post_cooldowns WHERE last_post_at <= ?1').bind(cooldownCutoff),
    env.DB.prepare(
      `INSERT INTO messages (nickname, body, created_at)
       SELECT ?1, ?2, ?3
        WHERE NOT EXISTS (SELECT 1 FROM post_cooldowns WHERE visitor_hash = ?4 AND last_post_at > ?5)
          AND NOT EXISTS (SELECT 1 FROM messages WHERE body = ?2 AND created_at > ?6)
          AND COALESCE((SELECT successful_posts FROM post_quota WHERE window_start = ?7), 0) < ?8
       RETURNING id, nickname, body, created_at, 0 AS likes, 0 AS dislikes`,
    ).bind(nickname, body, nowIso, posterHash, cooldownCutoff, duplicateCutoff, windowStartSeconds, LIMITS.quotaMaxPosts),
    env.DB.prepare(
      `INSERT INTO post_cooldowns (visitor_hash, last_post_at)
       SELECT ?1, ?2 WHERE changes() = 1
       ON CONFLICT (visitor_hash) DO UPDATE SET last_post_at = excluded.last_post_at`,
    ).bind(posterHash, nowIso),
  ]);

  const row = inserted.results[0];
  if (row) {
    return json({ message: toDto(row), cooldownSeconds: seconds(LIMITS.cooldownMs) }, 201);
  }

  // Rejected: find out why (read-only diagnosis, after the atomic decision).
  const state = await env.DB.prepare(
    `SELECT COALESCE((SELECT successful_posts FROM post_quota WHERE window_start = ?1), 0) AS window_count,
            (SELECT last_post_at FROM post_cooldowns WHERE visitor_hash = ?2 AND last_post_at > ?3) AS last_post_at,
            EXISTS (SELECT 1 FROM messages WHERE body = ?4 AND created_at > ?5) AS duplicate`,
  )
    .bind(windowStartSeconds, posterHash, cooldownCutoff, body, duplicateCutoff)
    .first<{ window_count: number; last_post_at: string | null; duplicate: number }>();
  if (state && state.window_count >= LIMITS.quotaMaxPosts) {
    throw new HttpError(429, 'site_busy', { retryAfter: seconds(windowStart + LIMITS.quotaWindowMs - now) });
  }
  if (state?.last_post_at) {
    throw new HttpError(429, 'cooldown', {
      retryAfter: seconds(Date.parse(state.last_post_at) + LIMITS.cooldownMs - now),
    });
  }
  if (state?.duplicate) throw new HttpError(409, 'duplicate');
  throw new HttpError(409, 'conflict');
}

/** PUT /api/messages/:id/vote — idempotent target state: 1 like, -1 dislike, 0 withdraw. */
async function setVote(request: Request, env: Env, messageId: number): Promise<Response> {
  assertWritable(env);
  const visitor = visitorId(request);
  const data = await readJson(request, LIMITS.requestBodyMaxBytes);
  const vote = voteValue(data.vote);
  const hash = await voteHash(env, messageId, visitor);
  const write =
    vote === 0
      ? env.DB.prepare('DELETE FROM votes WHERE message_id = ?1 AND visitor_hash = ?2').bind(messageId, hash)
      : env.DB.prepare(
          `INSERT INTO votes (message_id, visitor_hash, vote)
           SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM messages WHERE id = ?1)
           ON CONFLICT (message_id, visitor_hash) DO UPDATE SET vote = excluded.vote`,
        ).bind(messageId, hash, vote);
  const [, counts] = await env.DB.batch<{ found: number; likes: number; dislikes: number }>([
    write,
    env.DB.prepare(
      `SELECT EXISTS (SELECT 1 FROM messages WHERE id = ?1) AS found,
              COALESCE(SUM(vote = 1), 0) AS likes,
              COALESCE(SUM(vote = -1), 0) AS dislikes
         FROM votes WHERE message_id = ?1`,
    ).bind(messageId),
  ]);
  const result = counts.results[0];
  if (!result?.found) throw new HttpError(404, 'not_found');
  return json({ id: messageId, likes: Number(result.likes), dislikes: Number(result.dislikes), myVote: vote });
}

async function route(request: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  if (pathname === '/api/messages') {
    if (method === 'GET') return listMessages(url, env);
    if (method === 'POST') return createMessage(request, env, deps);
    throw new HttpError(405, 'method_not_allowed');
  }
  if (pathname === '/api/votes/me') {
    if (method === 'GET') return myVotes(request, url, env);
    throw new HttpError(405, 'method_not_allowed');
  }
  const voteMatch = /^\/api\/messages\/(\d{1,15})\/vote$/.exec(pathname);
  if (voteMatch) {
    if (method === 'PUT') return setVote(request, env, positiveId(voteMatch[1])!);
    throw new HttpError(405, 'method_not_allowed');
  }
  throw new HttpError(404, 'not_found');
}

export function createApp(overrides: Partial<Deps> = {}) {
  const deps: Deps = { now: Date.now, verifyTurnstile: createTurnstileVerifier(), ...overrides };
  return async function handle(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return preflight(request, env);
    let response: Response;
    try {
      response = await route(request, env, deps);
    } catch (error) {
      if (error instanceof HttpError) {
        response = errorResponse(error);
      } else {
        // Log the failure type only; never request bodies, visitor IDs or secrets.
        console.error('guestbook error:', error instanceof Error ? error.message : 'unknown');
        response = errorResponse(new HttpError(500, 'server_error'));
      }
    }
    for (const [key, value] of Object.entries(corsHeaders(request, env))) response.headers.set(key, value);
    return response;
  };
}
