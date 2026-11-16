/**
 * Guestbook client: list, post (with Turnstile), vote. Message text is always rendered
 * with textContent, never as HTML. The anonymous visitor UUID is sent in a header only.
 */
import type { GuestbookStrings } from '../i18n/guestbook';

const NICKNAME_MAX = 40;
const BODY_MAX = 2000;
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_ACTION = 'guestbook-post';
const VISITOR_KEY = 'tbs:visitor';
const COOLDOWN_KEY = 'tbs:gb:cooldown-until';

interface Message {
  id: number;
  nickname: string;
  body: string;
  createdAt: string;
  likes: number;
  dislikes: number;
}

interface ApiError {
  code: string;
  retryAfter?: number;
  field?: string;
  reason?: string;
}

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const root = document.querySelector<HTMLElement>('[data-guestbook="on"]');
if (root) init(root);

function init(root: HTMLElement): void {
  const api = root.dataset.api!;
  const siteKey = root.dataset.sitekey!;
  const lang = root.dataset.lang!;
  const locale = root.dataset.locale!;
  const s = JSON.parse(document.getElementById('gb-strings')!.textContent!) as GuestbookStrings;
  const fmt = (template: string, n: number | string) => template.replace('{n}', String(n));

  const q = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const form = q<HTMLFormElement>('[data-gb-form]');
  const nickname = q<HTMLInputElement>('#gb-nickname');
  const body = q<HTMLTextAreaElement>('#gb-body');
  const counter = q<HTMLElement>('[data-gb-counter]');
  const submit = q<HTMLButtonElement>('[data-gb-submit]');
  const status = q<HTMLElement>('[data-gb-status]');
  const turnstileBox = q<HTMLElement>('[data-gb-turnstile]');
  const list = q<HTMLOListElement>('[data-gb-list]');
  const listStatus = q<HTMLElement>('[data-gb-list-status]');
  const empty = q<HTMLElement>('[data-gb-empty]');
  const more = q<HTMLButtonElement>('[data-gb-more]');

  const submitLabel = submit.textContent ?? '';
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const visitor = visitorId();
  const votes = new Map<number, number>();
  let readOnly = false;
  let posting = false;
  let nextCursor: number | null = null;
  let cooldownTimer: number | undefined;

  // ---------- storage helpers (optional conveniences) ----------
  function readStore(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function writeStore(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Unavailable storage only loses the convenience; the server still enforces limits.
    }
  }
  function visitorId(): string {
    const saved = readStore(VISITOR_KEY);
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved;
    const id = crypto.randomUUID();
    writeStore(VISITOR_KEY, id);
    return id;
  }

  // ---------- status messages ----------
  function setStatus(el: HTMLElement, text: string, kind: 'info' | 'error' | 'success' = 'info'): void {
    el.textContent = text;
    el.dataset.kind = text ? kind : '';
  }
  function errorText(error: ApiError): string {
    switch (error.code) {
      case 'turnstile_failed':
        return s.turnstile_failed;
      case 'cooldown':
        return s.cooldownError;
      case 'duplicate':
        return s.duplicate;
      case 'site_busy':
        return error.retryAfter ? `${s.site_busy} ${fmt(s.siteBusyWait, Math.ceil(error.retryAfter / 60))}` : s.site_busy;
      case 'read_only':
        return s.read_only;
      case 'invalid_input':
        if (error.field === 'body') return error.reason === 'too_long' ? s.bodyTooLong : s.bodyRequired;
        if (error.field === 'nickname') return s.nicknameTooLong;
        return s.invalid;
      case 'invalid_visitor':
      case 'invalid_json':
        return s.invalid;
      default:
        return s.server_error;
    }
  }

  // ---------- API ----------
  async function request<T>(method: string, path: string, payload?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'X-Visitor-Id': visitor };
    if (payload !== undefined) headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await fetch(`${api}${path}`, {
        method,
        headers,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
    } catch {
      throw { code: 'network' } satisfies ApiError;
    }
    const data = (await response.json().catch(() => null)) as (T & { error?: ApiError }) | null;
    if (!response.ok || !data) throw (data?.error ?? { code: 'server_error' }) as ApiError;
    return data;
  }

  // ---------- rendering ----------
  const codePoints = (value: string) => [...value].length;

  function renderVotes(container: HTMLElement, message: Message): void {
    const mine = votes.get(message.id) ?? 0;
    const [likeBtn, dislikeBtn] = container.querySelectorAll<HTMLButtonElement>('button');
    likeBtn.textContent = `${mine === 1 ? s.liked : s.like} ${message.likes}`;
    dislikeBtn.textContent = `${mine === -1 ? s.disliked : s.dislike} ${message.dislikes}`;
    likeBtn.setAttribute('aria-pressed', String(mine === 1));
    dislikeBtn.setAttribute('aria-pressed', String(mine === -1));
    likeBtn.disabled = readOnly;
    dislikeBtn.disabled = readOnly;
  }

  function renderMessage(message: Message): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'gb-message panel';
    item.dataset.id = String(message.id);

    const meta = document.createElement('p');
    meta.className = 'gb-meta';
    const nick = document.createElement('span');
    nick.className = 'gb-nick';
    nick.textContent = message.nickname;
    nick.dir = 'auto';
    const time = document.createElement('time');
    time.dateTime = message.createdAt;
    time.textContent = dateFormat.format(new Date(message.createdAt));
    meta.append(nick, ' · ', time);

    const text = document.createElement('p');
    text.className = 'gb-body';
    text.dir = 'auto';
    text.textContent = message.body;

    const actions = document.createElement('div');
    actions.className = 'gb-votes';
    const feedback = document.createElement('span');
    feedback.className = 'gb-vote-status';
    feedback.setAttribute('role', 'status');
    for (const value of [1, -1] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = value === 1 ? 'vote vote-up' : 'vote vote-down';
      button.addEventListener('click', () => castVote(message, value, actions, feedback));
      actions.append(button);
    }
    actions.append(feedback);
    renderVotes(actions, message);

    item.append(meta, text, actions);
    return item;
  }

  async function castVote(message: Message, value: 1 | -1, actions: HTMLElement, feedback: HTMLElement) {
    const current = votes.get(message.id) ?? 0;
    const target = current === value ? 0 : value;
    const buttons = actions.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach((b) => (b.disabled = true));
    setStatus(feedback, '');
    try {
      const result = await request<{ likes: number; dislikes: number; myVote: number }>(
        'PUT',
        `/api/messages/${message.id}/vote`,
        { vote: target },
      );
      message.likes = result.likes;
      message.dislikes = result.dislikes;
      votes.set(message.id, result.myVote);
    } catch (error) {
      const err = error as ApiError;
      if (err.code === 'read_only') setReadOnly(true);
      setStatus(feedback, err.code === 'read_only' ? s.read_only : s.voteFailed, 'error');
    }
    renderVotes(actions, message);
  }

  async function loadVotes(messages: Message[]): Promise<void> {
    if (!messages.length) return;
    try {
      const result = await request<{ votes: Record<string, number> }>(
        'GET',
        `/api/votes/me?ids=${messages.map((m) => m.id).join(',')}`,
      );
      for (const [id, vote] of Object.entries(result.votes)) votes.set(Number(id), vote);
    } catch {
      // Vote state is a convenience; counts still render.
    }
  }

  async function loadPage(first: boolean): Promise<void> {
    more.disabled = true;
    setStatus(listStatus, s.loading);
    try {
      const query = first || nextCursor === null ? '' : `?before=${nextCursor}`;
      const page = await request<{ messages: Message[]; nextCursor: number | null; readOnly: boolean }>(
        'GET',
        `/api/messages${query}`,
      );
      setReadOnly(page.readOnly);
      await loadVotes(page.messages);
      // A post can finish while this response is in flight. Keep it and skip any overlap.
      const displayed = new Set(Array.from(list.children, (item) => (item as HTMLElement).dataset.id));
      list.append(...page.messages.filter((message) => !displayed.has(String(message.id))).map(renderMessage));
      nextCursor = page.nextCursor;
      empty.hidden = list.childElementCount > 0;
      more.hidden = nextCursor === null;
      setStatus(listStatus, '');
    } catch {
      listStatus.dataset.kind = 'error';
      listStatus.replaceChildren(s.loadFailed, ' ');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'link-button';
      retry.textContent = s.retry;
      retry.addEventListener('click', () => loadPage(first));
      listStatus.append(retry);
    } finally {
      more.disabled = false;
    }
  }

  // ---------- form state ----------
  function cooldownRemaining(): number {
    const until = Number(readStore(COOLDOWN_KEY) ?? 0);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  }

  function startCooldown(secondsLeft: number): void {
    writeStore(COOLDOWN_KEY, String(Date.now() + secondsLeft * 1000));
    tickCooldown();
  }

  function tickCooldown(): void {
    window.clearTimeout(cooldownTimer);
    const left = cooldownRemaining();
    if (left > 0) {
      submit.textContent = fmt(s.cooldown, left);
      cooldownTimer = window.setTimeout(tickCooldown, 1000);
    } else {
      submit.textContent = submitLabel;
    }
    updateFormState();
  }

  function updateFormState(): void {
    const disabled = readOnly || posting;
    nickname.disabled = disabled;
    body.disabled = disabled;
    submit.disabled = disabled || cooldownRemaining() > 0;
  }

  function setReadOnly(value: boolean): void {
    if (value === readOnly) return;
    readOnly = value;
    if (readOnly) setStatus(status, s.read_only, 'error');
    else if (status.textContent === s.read_only) setStatus(status, '');
    updateFormState();
    list.querySelectorAll<HTMLButtonElement>('.gb-votes button').forEach((b) => (b.disabled = readOnly));
  }

  function updateCounter(): void {
    const n = codePoints(body.value.trim());
    counter.textContent = fmt(s.counter, n);
    counter.dataset.kind = n > BODY_MAX ? 'error' : '';
  }

  // ---------- Turnstile ----------
  let widgetId: string | undefined;
  let pendingToken: { resolve: (token: string) => void; reject: (error: ApiError) => void } | undefined;
  let turnstileReady: Promise<TurnstileApi> | undefined;

  function loadTurnstile(): Promise<TurnstileApi> {
    turnstileReady ??= new Promise<TurnstileApi>((resolve, reject) => {
      if (window.turnstile) return resolve(window.turnstile);
      const script = document.createElement('script');
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject());
      script.onerror = () => reject();
      document.head.append(script);
    }).catch(() => {
      turnstileReady = undefined; // allow a later retry
      throw { code: 'turnstile_unavailable' } satisfies ApiError;
    });
    return turnstileReady;
  }

  async function getToken(): Promise<string> {
    const turnstile = await loadTurnstile();
    const settle = (fn: (p: NonNullable<typeof pendingToken>) => void) => {
      const pending = pendingToken;
      pendingToken = undefined;
      if (pending) fn(pending);
    };
    const token = new Promise<string>((resolve, reject) => (pendingToken = { resolve, reject }));
    if (widgetId === undefined) {
      widgetId = turnstile.render(turnstileBox, {
        sitekey: siteKey,
        action: TURNSTILE_ACTION,
        appearance: 'interaction-only',
        execution: 'execute',
        language: lang === 'zh' ? 'zh-cn' : 'en',
        callback: (t: string) => settle((p) => p.resolve(t)),
        'error-callback': () => settle((p) => p.reject({ code: 'turnstile_failed' })),
        'expired-callback': () => settle((p) => p.reject({ code: 'turnstile_failed' })),
        'timeout-callback': () => settle((p) => p.reject({ code: 'turnstile_failed' })),
      });
    }
    turnstile.execute(widgetId);
    return token;
  }

  function resetTurnstile(): void {
    if (widgetId !== undefined) window.turnstile?.reset(widgetId);
  }

  // ---------- submit ----------
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (posting || readOnly || cooldownRemaining() > 0) return;
    const text = body.value.trim();
    if (!text) return setStatus(status, s.bodyRequired, 'error');
    if (codePoints(text) > BODY_MAX) return setStatus(status, s.bodyTooLong, 'error');
    if (codePoints(nickname.value.trim()) > NICKNAME_MAX) return setStatus(status, s.nicknameTooLong, 'error');

    posting = true;
    updateFormState();
    submit.textContent = s.posting;
    setStatus(status, '');
    try {
      const turnstileToken = await getToken();
      const result = await request<{ message: Message; cooldownSeconds: number }>('POST', '/api/messages', {
        nickname: nickname.value,
        body: body.value,
        turnstileToken,
      });
      body.value = '';
      updateCounter();
      list.prepend(renderMessage(result.message));
      empty.hidden = true;
      setStatus(status, s.posted, 'success');
      startCooldown(result.cooldownSeconds);
    } catch (error) {
      const err = error as ApiError;
      if (err.code === 'read_only') setReadOnly(true);
      if (err.code === 'cooldown' && err.retryAfter) startCooldown(err.retryAfter);
      setStatus(status, err.code === 'turnstile_unavailable' ? s.turnstile_unavailable : errorText(err), 'error');
    } finally {
      posting = false;
      resetTurnstile();
      tickCooldown();
    }
  });

  body.addEventListener('input', updateCounter);
  more.textContent = s.loadMore;
  more.addEventListener('click', () => loadPage(false));

  updateCounter();
  tickCooldown();
  loadPage(true);
  // Warm up Turnstile in the background so the first submit is fast; failures surface on submit.
  loadTurnstile().catch(() => {});
}
