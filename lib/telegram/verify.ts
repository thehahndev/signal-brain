/**
 * Webhook auth: two independent gates.
 *  1. Telegram echoes the secret_token set at setWebhook time in this header — a
 *     forged request from anyone who guessed the URL won't carry it.
 *  2. Single-user product: only the one allow-listed chat id is honoured.
 */

export function verifyWebhookSecret(req: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false; // fail closed — never accept unsigned requests
  return req.headers.get('x-telegram-bot-api-secret-token') === expected;
}

export function isAllowedChat(chatId: number | undefined): boolean {
  const allowed = process.env.TELEGRAM_CHAT_ID;
  if (!allowed || chatId === undefined) return false;
  return String(chatId) === allowed.trim();
}
