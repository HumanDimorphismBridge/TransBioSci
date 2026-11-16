import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, type MessageDto } from '../src/app';
import { LIMITS, type Env } from '../src/config';
import { createTurnstileVerifier } from '../src/security';

const T0 = Date.parse('2026-11-09T00:00:30.000Z'); // 30 s into a 10-minute quota window
let clock = T0;
let turnstileCalls = 0;
const handle = createApp({
  now: () => clock,
  verifyTurnstile: async (token) => {
    turnstileCalls++;
    return token !== 'bad-token';
  },
});

beforeEach(async () => {
  clock = T0;
  turnstileCalls = 0;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM votes'),
    env.DB.prepare('DELETE FROM messages'),
    env.DB.prepare('DELETE FROM post_cooldowns'),
    env.DB.prepare('DELETE FROM post_quota'),
  ]);
});

const visitor = () => crypto.randomUUID();

interface Options {
  visitor?: string;
  json?: unknown;
  origin?: string;
  env?: Partial<Env>;
  headers?: Record<string, string>;
}

function call(method: string, path: string, opts: Options = {}): Promise<Response> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.visitor) headers['X-Visitor-Id'] = opts.visitor;
  if (opts.origin) headers.Origin = opts.origin;
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';
  const request = new Request(`https://api.example.test${path}`, {
    method,
    headers,
    body: opts.json === undefined ? undefined : JSON.stringify(opts.json),
  });
  return handle(request, { ...env, ...opts.env } as Env);
}

const post = (body: string, who = visitor(), extra: Record<string, unknown> = {}) =>
  call('POST', '/api/messages', { visitor: who, json: { body, turnstileToken: 'ok-token', ...extra } });

const vote = (id: number, value: unknown, who: string, opts: Options = {}) =>
  call('PUT', `/api/messages/${id}/vote`, { visitor: who, json: { vote: value }, ...opts });

async function errorOf(response: Response) {
  return ((await response.json()) as { error: { code: string; retryAfter?: number; field?: string } }).error;
}

async function list(query = '') {
  const response = await call('GET', `/api/messages${query}`);
  expect(response.status).toBe(200);
  return (await response.json()) as { messages: MessageDto[]; nextCursor: number | null; readOnly: boolean };
}

describe('publishing', () => {
  it('publishes immediately, normalizes nickname and body', async () => {
    const response = await post('  Hello 你好 \r\n second line  ', visitor(), { nickname: '   ' });
    expect(response.status).toBe(201);
    const { message, cooldownSeconds } = (await response.json()) as { message: MessageDto; cooldownSeconds: number };
    expect(message).toMatchObject({ nickname: 'Anon', body: 'Hello 你好 \n second line', likes: 0, dislikes: 0 });
    expect(message.createdAt).toBe(new Date(T0).toISOString());
    expect(cooldownSeconds).toBe(60);
    const page = await list();
    expect(page.messages.map((m) => m.id)).toEqual([message.id]);
    expect(page.readOnly).toBe(false);
  });

  it('keeps body as plain text (no HTML processing)', async () => {
    const response = await post('<script>alert(1)</script>', visitor(), { nickname: '<b>x</b>' });
    const { message } = (await response.json()) as { message: MessageDto };
    expect(message.body).toBe('<script>alert(1)</script>');
    expect(message.nickname).toBe('<b>x</b>');
  });

  it('counts Unicode code points for length limits', async () => {
    const emoji = '😀'.repeat(LIMITS.bodyMaxCodePoints); // 4000 UTF-16 units, 2000 code points
    expect((await post(emoji)).status).toBe(201);
    const tooLong = await post('a'.repeat(LIMITS.bodyMaxCodePoints + 1));
    expect(tooLong.status).toBe(400);
    expect(await errorOf(tooLong)).toMatchObject({ code: 'invalid_input', field: 'body' });
    const nick = await post('nickname test', visitor(), { nickname: 'n'.repeat(41) });
    expect(await errorOf(nick)).toMatchObject({ code: 'invalid_input', field: 'nickname' });
    expect((await post('nickname ok', visitor(), { nickname: '名'.repeat(40) })).status).toBe(201);
  });

  it('rejects empty body, bad visitor IDs, wrong media type and malformed JSON', async () => {
    expect(await errorOf(await post('   \n  '))).toMatchObject({ code: 'invalid_input', field: 'body' });
    expect(await errorOf(await post('x', 'not-a-uuid'))).toMatchObject({ code: 'invalid_visitor' });
    const text = await call('POST', '/api/messages', {
      visitor: visitor(),
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(text.status).toBe(415);
    const malformed = await handle(
      new Request('https://api.example.test/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Visitor-Id': visitor() },
        body: '{oops',
      }),
      env as Env,
    );
    expect(await errorOf(malformed)).toMatchObject({ code: 'invalid_json' });
    expect((await list()).messages).toHaveLength(0);
  });

  it('requires a valid Turnstile token and does not consume quota on failure', async () => {
    const missing = await call('POST', '/api/messages', { visitor: visitor(), json: { body: 'no token' } });
    expect(missing.status).toBe(403);
    expect(await errorOf(missing)).toMatchObject({ code: 'turnstile_failed' });
    for (let i = 0; i < 40; i++) {
      const bad = await post(`bad ${i}`, visitor(), { turnstileToken: 'bad-token' });
      expect(bad.status).toBe(403);
    }
    expect((await list()).messages).toHaveLength(0);
    // Quota still fully available after 40 failed verifications.
    const results = await Promise.all(Array.from({ length: LIMITS.quotaMaxPosts }, (_, i) => post(`ok ${i}`)));
    expect(results.every((r) => r.status === 201)).toBe(true);
  });
});

describe('publishing limits', () => {
  it('enforces a 60 s cooldown per browser identity', async () => {
    const who = visitor();
    expect((await post('first', who)).status).toBe(201);
    clock = T0 + 20_000;
    const blocked = await post('second', who);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('40');
    expect(await errorOf(blocked)).toMatchObject({ code: 'cooldown', retryAfter: 40 });
    expect((await post('other visitor', visitor())).status).toBe(201);
    clock = T0 + 60_001;
    expect((await post('second', who)).status).toBe(201);
  });

  it('rejects the same trimmed body within 10 minutes', async () => {
    expect((await post('same text')).status).toBe(201);
    clock = T0 + 9 * 60_000;
    const dup = await post('  same text \n');
    expect(dup.status).toBe(409);
    expect(await errorOf(dup)).toMatchObject({ code: 'duplicate' });
    clock = T0 + 10 * 60_000 + 1;
    expect((await post('same text')).status).toBe(201);
  });

  it('caps successful posts per fixed 10-minute window and recovers in the next window', async () => {
    for (let i = 0; i < LIMITS.quotaMaxPosts; i++) expect((await post(`msg ${i}`)).status).toBe(201);
    await env.DB.prepare('DELETE FROM messages WHERE body = ?').bind('msg 0').run();
    clock = T0 + 60_000; // window ends at 00:10:00, i.e. 510 s later
    const busy = await post('one more');
    expect(busy.status).toBe(429);
    expect(await errorOf(busy)).toMatchObject({ code: 'site_busy', retryAfter: 510 });
    clock = Date.parse('2026-11-09T00:10:00.000Z');
    expect((await post('one more')).status).toBe(201);
  });

  it('never exceeds the quota under concurrent submissions', async () => {
    const attempts = 75;
    const responses = await Promise.all(Array.from({ length: attempts }, (_, i) => post(`concurrent ${i}`)));
    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(LIMITS.quotaMaxPosts);
    expect(statuses.filter((s) => s === 429)).toHaveLength(attempts - LIMITS.quotaMaxPosts);
    const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM messages').all<{ n: number }>();
    expect(results[0].n).toBe(LIMITS.quotaMaxPosts);
  });

  it('lets only one concurrent post through for the same browser identity', async () => {
    const who = visitor();
    const responses = await Promise.all(Array.from({ length: 10 }, (_, i) => post(`same visitor ${i}`, who)));
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 429)).toHaveLength(9);
  });

  it('stores only hashed cooldown identities and prunes expired rows', async () => {
    const who = visitor();
    await post('hash check', who);
    const rows = await env.DB.prepare('SELECT visitor_hash FROM post_cooldowns').all<{ visitor_hash: string }>();
    expect(rows.results).toHaveLength(1);
    expect(rows.results[0].visitor_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows.results[0].visitor_hash).not.toContain(who);
    clock = T0 + 61_000;
    await post('prune trigger');
    const after = await env.DB.prepare('SELECT COUNT(*) AS n FROM post_cooldowns').first<{ n: number }>();
    expect(after?.n).toBe(1); // old row pruned, new row written
  });
});

describe('listing', () => {
  it('pages newest first, 20 per page, with a cursor', async () => {
    for (let i = 0; i < 25; i++) {
      clock = T0 + i * 1000;
      expect((await post(`page ${i}`)).status).toBe(201);
    }
    const first = await list();
    expect(first.messages).toHaveLength(20);
    expect(first.messages[0].body).toBe('page 24');
    expect(first.nextCursor).toBe(first.messages[19].id);
    const second = await list(`?before=${first.nextCursor}`);
    expect(second.messages.map((m) => m.body)).toEqual(['page 4', 'page 3', 'page 2', 'page 1', 'page 0']);
    expect(second.nextCursor).toBeNull();
    expect((await call('GET', '/api/messages?limit=999')).status).toBe(400);
    expect((await call('GET', '/api/messages?before=abc')).status).toBe(400);
  });
});

describe('voting', () => {
  async function newMessage(text = 'vote target') {
    return ((await (await post(text)).json()) as { message: MessageDto }).message.id;
  }

  it('sets, switches and withdraws one vote per browser identity (idempotent)', async () => {
    const id = await newMessage();
    const a = visitor();
    const b = visitor();
    expect(await (await vote(id, 1, a)).json()).toEqual({ id, likes: 1, dislikes: 0, myVote: 1 });
    expect(await (await vote(id, 1, a)).json()).toEqual({ id, likes: 1, dislikes: 0, myVote: 1 });
    expect(await (await vote(id, -1, b)).json()).toEqual({ id, likes: 1, dislikes: 1, myVote: -1 });
    expect(await (await vote(id, -1, a)).json()).toEqual({ id, likes: 0, dislikes: 2, myVote: -1 });
    expect(await (await vote(id, 0, a)).json()).toEqual({ id, likes: 0, dislikes: 1, myVote: 0 });
    expect(await (await vote(id, 0, a)).json()).toEqual({ id, likes: 0, dislikes: 1, myVote: 0 });
    const page = await list();
    expect(page.messages[0]).toMatchObject({ likes: 0, dislikes: 1 });
  });

  it('reports the current browser votes without exposing identities', async () => {
    const id1 = await newMessage('m1');
    const id2 = await newMessage('m2');
    const id3 = await newMessage('m3');
    const who = visitor();
    await vote(id1, 1, who);
    await vote(id2, -1, who);
    await vote(id3, 1, visitor());
    const response = await call('GET', `/api/votes/me?ids=${id1},${id2},${id3}`, { visitor: who });
    expect(await response.json()).toEqual({ votes: { [id1]: 1, [id2]: -1 } });
    const rows = await env.DB.prepare('SELECT message_id, visitor_hash FROM votes ORDER BY message_id').all<{
      message_id: number;
      visitor_hash: string;
    }>();
    const own = rows.results.filter((r) => r.message_id !== id3);
    expect(own[0].visitor_hash).not.toBe(own[1].visitor_hash); // hash includes message ID
    expect(rows.results.every((r) => !r.visitor_hash.includes(who))).toBe(true);
    const tooMany = Array.from({ length: LIMITS.votesMeMaxIds + 1 }, (_, i) => i + 1).join(',');
    expect((await call('GET', `/api/votes/me?ids=${tooMany}`, { visitor: who })).status).toBe(400);
    expect((await call('GET', `/api/votes/me?ids=${id1}`)).status).toBe(400); // missing visitor
  });

  it('rejects invalid values and unknown messages', async () => {
    const id = await newMessage();
    expect(await errorOf(await vote(id, 2, visitor()))).toMatchObject({ code: 'invalid_input', field: 'vote' });
    expect(await errorOf(await vote(id, '1', visitor()))).toMatchObject({ code: 'invalid_input' });
    const missing = await vote(999_999, 1, visitor());
    expect(missing.status).toBe(404);
    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM votes').first<{ n: number }>();
    expect(rows?.n).toBe(0);
  });

  it('deletes votes with their message (admin deletion)', async () => {
    const id = await newMessage();
    await vote(id, 1, visitor());
    await vote(id, -1, visitor());
    await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM votes').first<{ n: number }>();
    expect(rows?.n).toBe(0);
  });
});

describe('emergency read-only mode', () => {
  it('pauses posting and voting without touching D1, keeps reads', async () => {
    const id = ((await (await post('before switch')).json()) as { message: MessageDto }).message.id;
    const readOnly = { GUESTBOOK_READ_ONLY: 'true' };
    const blockedPost = await call('POST', '/api/messages', {
      visitor: visitor(),
      json: { body: 'during switch', turnstileToken: 'ok-token' },
      env: readOnly,
    });
    expect(blockedPost.status).toBe(503);
    expect(await errorOf(blockedPost)).toMatchObject({ code: 'read_only' });
    expect(turnstileCalls).toBe(1); // only the first post verified
    expect((await vote(id, 1, visitor(), { env: readOnly })).status).toBe(503);
    // Even with a broken database binding, the switch answers before any D1 access.
    const brokenDb = { DB: undefined as unknown as D1Database, GUESTBOOK_READ_ONLY: 'true' };
    expect((await vote(id, 1, visitor(), { env: brokenDb })).status).toBe(503);
    const read = await call('GET', '/api/messages', { env: readOnly });
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ readOnly: true, messages: [{ id }] });
  });
});

describe('HTTP behaviour', () => {
  it('answers CORS preflight only for allowed origins', async () => {
    const allowed = await call('OPTIONS', '/api/messages', { origin: 'https://example.test' });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://example.test');
    expect(allowed.headers.get('Access-Control-Allow-Headers')).toContain('X-Visitor-Id');
    const denied = await call('OPTIONS', '/api/messages', { origin: 'https://evil.example' });
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const get = await call('GET', '/api/messages', { origin: 'https://example.test' });
    expect(get.headers.get('Access-Control-Allow-Origin')).toBe('https://example.test');
    expect(get.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns uniform JSON errors for unknown routes and methods', async () => {
    expect(await errorOf(await call('GET', '/nope'))).toMatchObject({ code: 'not_found' });
    expect(await errorOf(await call('DELETE', '/api/messages'))).toMatchObject({ code: 'method_not_allowed' });
    expect((await call('GET', '/api/messages/1/vote')).status).toBe(405);
  });

  it('hides internal errors behind server_error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await call('GET', '/api/messages', { env: { DB: undefined as unknown as D1Database } });
    expect(response.status).toBe(500);
    expect(await errorOf(response)).toEqual({ code: 'server_error' });
    spy.mockRestore();
  });
});

describe('Turnstile siteverify', () => {
  const siteverify = (result: object) =>
    vi.fn(async () => new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } }));
  const localEnv = { ...env, TURNSTILE_EXPECTED_HOSTNAMES: '' } as Env;
  const strictEnv = {
    ...env,
    TURNSTILE_EXPECTED_HOSTNAMES: 'humandimorphismbridge.github.io',
  } as Env;

  it('posts the secret and token to siteverify and requires success', async () => {
    const fetchFn = siteverify({ success: true });
    expect(await createTurnstileVerifier(fetchFn as unknown as typeof fetch)('tok', localEnv)).toBe(true);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const form = init.body as FormData;
    expect(form.get('response')).toBe('tok');
    expect(form.get('secret')).toBe('test-only-turnstile-secret');
    expect(form.has('remoteip')).toBe(false); // no IP is sent
    expect(await createTurnstileVerifier(siteverify({ success: false }) as never)('tok', localEnv)).toBe(false);
  });

  it('checks hostname and action when expected hostnames are configured', async () => {
    const good = { success: true, hostname: 'humandimorphismbridge.github.io', action: 'guestbook-post' };
    expect(await createTurnstileVerifier(siteverify(good) as never)('t', strictEnv)).toBe(true);
    expect(await createTurnstileVerifier(siteverify({ ...good, hostname: 'evil.example' }) as never)('t', strictEnv)).toBe(false);
    expect(await createTurnstileVerifier(siteverify({ ...good, action: 'other' }) as never)('t', strictEnv)).toBe(false);
  });

  it('maps siteverify outages to server_error', async () => {
    const failing = vi.fn(async () => new Response('down', { status: 500 }));
    await expect(createTurnstileVerifier(failing as never)('t', env as Env)).rejects.toMatchObject({ code: 'server_error' });
  });
});
