/** Inline-button callback_data encoding. Kept tiny — Telegram caps callback_data at 64 bytes. */

export type CallbackKind = 'gold' | 'noise' | 'brain';

export interface ParsedCallback {
  kind: CallbackKind;
  itemId: string;
}

const PREFIX: Record<CallbackKind, string> = { gold: 'g', noise: 'n', brain: 'b' };
const KIND_BY_PREFIX: Record<string, CallbackKind> = { g: 'gold', n: 'noise', b: 'brain' };

export function encodeCallback(kind: CallbackKind, itemId: string): string {
  return `${PREFIX[kind]}:${itemId}`;
}

export function decodeCallback(data: string | undefined): ParsedCallback | null {
  if (!data) return null;
  const idx = data.indexOf(':');
  if (idx === -1) return null;
  const kind = KIND_BY_PREFIX[data.slice(0, idx)];
  const itemId = data.slice(idx + 1);
  if (!kind || !itemId) return null;
  return { kind, itemId };
}
