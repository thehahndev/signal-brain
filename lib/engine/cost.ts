import type Anthropic from '@anthropic-ai/sdk';

const PRICING: Record<string, { in: number; out: number }> = {
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-opus-4-8': { in: 5, out: 25 },
};

/** USD cost of a ranking call from its token usage (cache write = 1.25×, cache read = 0.1×). */
export function costUsd(u: Anthropic.Messages.Usage, model: string): number {
  const price = PRICING[model] ?? PRICING['claude-sonnet-4-6'];
  const inTok = u.input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const outTok = u.output_tokens ?? 0;
  return (
    (inTok * price.in + cacheWrite * price.in * 1.25 + cacheRead * price.in * 0.1 + outTok * price.out) /
    1_000_000
  );
}

/** Flatten usage into a plain token record for the `runs.tokens` jsonb column. */
export function tokenRecord(u: Anthropic.Messages.Usage): Record<string, number> {
  return {
    input: u.input_tokens ?? 0,
    cache_write: u.cache_creation_input_tokens ?? 0,
    cache_read: u.cache_read_input_tokens ?? 0,
    output: u.output_tokens ?? 0,
  };
}
