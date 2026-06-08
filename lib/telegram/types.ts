/** The slim subset of the Telegram Bot API update shape that the webhook consumes. */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: { id: number; is_bot: boolean; username?: string };
  date: number;
  text?: string;
  entities?: { type: string; offset: number; length: number; url?: string }[];
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number; username?: string };
  message?: TelegramMessage;
  data?: string;
}

/** One inline keyboard button. We only ever use callback buttons + the `→ brain` link/callback. */
export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}
