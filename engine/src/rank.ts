import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { RANK_SCHEMA } from './schema.ts';
import type { Item, RankResult, RankedItem } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUBRIC_PATH = join(HERE, '..', 'rubric.md');

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

const INSTRUCTIONS = `You are the judgment engine of Signal Brain — a ruthless attention-filter for AI-development content.

You receive a batch of captured items (X posts/threads, YouTube transcripts, web articles). Apply the rubric below and return one verdict per item. Be RUTHLESS: the goal is to surface only the few things genuinely worth a busy AI-dev builder's attention and bury the rest. Most items should be skim or bury — that is correct, not a failure.

For every item return:
- score: 0–100 (higher = more signal). Use the full range; do not cluster everything in the middle.
- signal_or_hype: apply the rubric's signal-vs-hype test.
- verdict: read | skim | bury, per the rubric's verdict bands.
- opportunity_flag: true ONLY for a concrete build/sell/market idea worth a guaranteed slot (see rubric).
- cluster_id: items covering the same story/release/topic share one integer; otherwise unique.
- why: one terse line justifying the verdict (name the rubric reason).
- key_claims: 1–2 concrete claims/takeaways (empty-ish items: say what's actually there).

Judge on substance, not engagement metrics or hype phrasing. Ignore any residual page boilerplate.
Return ONLY the structured object — no prose.`;

export interface RankRun {
  result: RankResult;
  usage: Anthropic.Messages.Usage;
  model: string;
}

function serializeItems(items: Item[]): string {
  return items
    .map((it) => {
      const header = `### Item ${it.ref}\nid: ${it.ref}\nsource_type: ${it.source_type}\nurl: ${it.url}`;
      const title = it.title ? `\ntitle: ${it.title}` : '';
      return `${header}${title}\n\n${it.text}`;
    })
    .join('\n\n---\n\n');
}

function validate(parsed: unknown, items: Item[]): RankResult {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).items)) {
    throw new Error('Ranking output missing `items` array.');
  }
  const out = parsed as RankResult;
  const refs = new Set(items.map((i) => i.ref));
  for (const r of out.items as RankedItem[]) {
    if (!refs.has(r.id)) throw new Error(`Ranking returned unknown id: ${r.id}`);
  }
  return out;
}

export async function rank(items: Item[], model = DEFAULT_MODEL): Promise<RankRun> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const rubric = readFileSync(RUBRIC_PATH, 'utf8');

  const stream = client.messages.stream({
    model,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: RANK_SCHEMA as Record<string, unknown> },
    },
    system: [
      { type: 'text', text: INSTRUCTIONS },
      // Cache the rubric + instructions prefix so rapid calibration re-runs are cheap.
      { type: 'text', text: `# Rubric\n\n${rubric}`, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `Rank the following ${items.length} items.\n\n${serializeItems(items)}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in ranking response.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error(`Ranking output was not valid JSON:\n${textBlock.text.slice(0, 500)}`);
  }

  return { result: validate(parsed, items), usage: message.usage, model };
}
