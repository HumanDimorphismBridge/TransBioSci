import { csv, type Env } from './config';

export type ErrorCode =
  | 'invalid_json'
  | 'invalid_input'
  | 'invalid_visitor'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'turnstile_failed'
  | 'cooldown'
  | 'duplicate'
  | 'site_busy'
  | 'conflict'
  | 'read_only'
  | 'not_found'
  | 'method_not_allowed'
  | 'server_error';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function errorResponse(error: HttpError): Response {
  const headers: Record<string, string> = {};
  const retryAfter = error.extra.retryAfter;
  if (typeof retryAfter === 'number') headers['Retry-After'] = String(retryAfter);
  return json({ error: { code: error.code, ...error.extra } }, error.status, headers);
}

/** CORS only controls browser cross-origin access; it is not authentication. */
export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin || !csv(env.ALLOWED_ORIGINS).includes(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Expose-Headers': 'Retry-After',
    Vary: 'Origin',
  };
}

export function preflight(request: Request, env: Env): Response {
  const headers = corsHeaders(request, env);
  if (headers['Access-Control-Allow-Origin']) {
    Object.assign(headers, {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Visitor-Id',
      'Access-Control-Max-Age': '86400',
    });
  }
  return new Response(null, { status: 204, headers });
}

/** Reads a small JSON object body, enforcing media type and size. */
export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const type = request.headers.get('Content-Type') ?? '';
  if (!/^application\/json\b/i.test(type)) throw new HttpError(415, 'unsupported_media_type');
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > maxBytes) throw new HttpError(413, 'payload_too_large');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new HttpError(413, 'payload_too_large');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new HttpError(400, 'invalid_json');
  return data as Record<string, unknown>;
}
