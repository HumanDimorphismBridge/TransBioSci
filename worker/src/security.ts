import { TURNSTILE_ACTION, TURNSTILE_VERIFY_URL, csv, type Env } from './config';
import { HttpError } from './http';

const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
    ]);
    keyCache.set(secret, key);
  }
  return key;
}

/** HMAC-SHA256 hex digest with the server-side secret. */
export async function hmacHex(env: Env, input: string): Promise<string> {
  const secret = env.VISITOR_HASH_SECRET;
  if (!secret) throw new Error('VISITOR_HASH_SECRET is not configured');
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(input));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Vote hash includes the message ID so votes of one browser cannot be linked across messages. */
export const voteHash = (env: Env, messageId: number, visitor: string) => hmacHex(env, `vote:${messageId}:${visitor}`);
export const postHash = (env: Env, visitor: string) => hmacHex(env, `post:${visitor}`);

export type TurnstileVerifier = (token: string, env: Env) => Promise<boolean>;

interface SiteverifyResult {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

/** Server-side Turnstile validation via Siteverify. The client result is never trusted alone. */
export function createTurnstileVerifier(fetchFn: typeof fetch = fetch): TurnstileVerifier {
  return async (token, env) => {
    const secret = env.TURNSTILE_SECRET_KEY;
    if (!secret) throw new Error('TURNSTILE_SECRET_KEY is not configured');
    const form = new FormData();
    form.append('secret', secret);
    form.append('response', token);
    let result: SiteverifyResult;
    try {
      const response = await fetchFn(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
      if (!response.ok) throw new HttpError(502, 'server_error');
      result = (await response.json()) as SiteverifyResult;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'server_error');
    }
    if (result.success !== true) return false;
    const hostnames = csv(env.TURNSTILE_EXPECTED_HOSTNAMES);
    if (hostnames.length) {
      if (!result.hostname || !hostnames.includes(result.hostname)) return false;
      if (result.action !== TURNSTILE_ACTION) return false;
    }
    return true;
  };
}
