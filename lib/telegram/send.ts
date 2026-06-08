import type { InlineButton } from './types';

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN is not set.');
  return t;
}

function defaultChatId(): string {
  const c = process.env.TELEGRAM_CHAT_ID;
  if (!c) throw new Error('TELEGRAM_CHAT_ID is not set.');
  return c.trim();
}

function api(method: string): string {
  return `https://api.telegram.org/bot${token()}/${method}`;
}

/** Escape the five characters that matter for Telegram HTML parse mode. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(api(method), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  return json.result as T;
}

export interface SendOptions {
  buttons?: InlineButton[][];
  /** Disable the big link preview card (default true — keeps the digest scannable). */
  disablePreview?: boolean;
  chatId?: string;
}

/** Send an HTML message; returns the new message_id. */
export async function sendMessage(text: string, opts: SendOptions = {}): Promise<number> {
  const result = await call<{ message_id: number }>('sendMessage', {
    chat_id: opts.chatId ?? defaultChatId(),
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: opts.disablePreview ?? true },
    reply_markup: opts.buttons ? { inline_keyboard: opts.buttons } : undefined,
  });
  return result.message_id;
}

/** Acknowledge a button tap (clears the client's loading spinner, shows a toast). */
export async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  await call('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}
