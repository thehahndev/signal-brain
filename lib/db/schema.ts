import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import type { SourceType, Verdict, SignalOrHype } from '../engine/types';

export type FetchStatus = 'pending' | 'ok' | 'miss' | 'error';
export type Feedback = 'gold' | 'noise';
export type RunStatus = 'ok' | 'empty' | 'error';

/** Digest runs — one row per cron pipeline execution (the §4 `runs` table). */
export const runs = pgTable('runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  /** Idempotency guard — one digest per local day (`digest:YYYY-MM-DD`). Unique. */
  idempotencyKey: text('idempotency_key').notNull().unique(),
  status: text('status').$type<RunStatus>().notNull(),
  itemCount: integer('item_count').notNull().default(0),
  readCount: integer('read_count').notNull().default(0),
  skimCount: integer('skim_count').notNull().default(0),
  buryCount: integer('bury_count').notNull().default(0),
  opportunityCount: integer('opportunity_count').notNull().default(0),
  model: text('model'),
  tokens: jsonb('tokens').$type<Record<string, number>>(),
  costUsd: text('cost_usd'),
});

/** Captured items — the §4 `items` table. One row per normalized URL. */
export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Normalized URL — unique, the dedup key for repeated captures. */
  url: text('url').notNull().unique(),
  sourceType: text('source_type').$type<SourceType>().notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),

  // Fetch (single full-extract at capture time).
  fetchStatus: text('fetch_status').$type<FetchStatus>().notNull().default('pending'),
  fetchError: text('fetch_error'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }),
  title: text('title'),
  fullText: text('full_text'),
  charCount: integer('char_count'),

  // Ranking output (set when a digest run ranks this item).
  score: integer('score'),
  signalOrHype: text('signal_or_hype').$type<SignalOrHype>(),
  verdict: text('verdict').$type<Verdict>(),
  opportunityFlag: boolean('opportunity_flag'),
  clusterId: integer('cluster_id'),
  why: text('why'),
  keyClaims: jsonb('key_claims').$type<string[]>(),
  rankedAt: timestamp('ranked_at', { withTimezone: true }),

  // Surfacing + feedback.
  surfacedInRun: uuid('surfaced_in_run').references(() => runs.id),
  telegramMessageId: integer('telegram_message_id'),
  feedback: text('feedback').$type<Feedback>(),
});

export type ItemRow = typeof items.$inferSelect;
export type NewItemRow = typeof items.$inferInsert;
export type RunRow = typeof runs.$inferSelect;
export type NewRunRow = typeof runs.$inferInsert;
