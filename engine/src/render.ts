import type Anthropic from '@anthropic-ai/sdk';
import type { Item, RankedItem } from './types.ts';
import type { RankRun } from './rank.ts';

const PRICING: Record<string, { in: number; out: number }> = {
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-opus-4-8': { in: 5, out: 25 },
};

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Render the ranked batch in the PLAN §5 digest shape, so output is judged how it'll be consumed. */
export function renderDigest(run: RankRun, items: Item[]): string {
  const byId = new Map(items.map((i) => [i.ref, i]));
  const ranked = [...run.result.items].sort((a, b) => b.score - a.score);

  const reads = ranked.filter((r) => r.verdict === 'read');
  const skims = ranked.filter((r) => r.verdict === 'skim');
  const buries = ranked.filter((r) => r.verdict === 'bury');
  const opps = ranked.filter((r) => r.opportunity_flag).length;

  const L: string[] = [];
  const oppBadge = opps > 0 ? ` · 🟢 ${opps} opportunity` : '';
  L.push(`Signal · ${reads.length} read · ${skims.length} skim · ${buries.length} buried${oppBadge}`);
  L.push('═'.repeat(64));

  const card = (r: RankedItem) => {
    const it = byId.get(r.id);
    const flag = r.opportunity_flag ? '🟢 ' : '';
    const tag = r.signal_or_hype === 'signal' ? 'signal' : 'hype';
    L.push('');
    L.push(`${flag}[${r.score}] ${it?.title || r.id}  (${it?.source_type}, ${tag}, c${r.cluster_id})`);
    for (const claim of r.key_claims) L.push(`   • ${claim}`);
    L.push(`   why: ${r.why}`);
    if (it) L.push(`   ${shortUrl(it.url)}`);
  };

  if (reads.length) {
    L.push('');
    L.push('── READ ─────────────────────────────────────────────────────');
    reads.forEach(card);
  }

  if (skims.length) {
    L.push('');
    L.push('── SKIM ─────────────────────────────────────────────────────');
    for (const r of skims) {
      const it = byId.get(r.id);
      const flag = r.opportunity_flag ? '🟢 ' : '';
      L.push(`${flag}[${r.score}] ${it?.title || r.id} — ${r.why}`);
    }
  }

  if (buries.length) {
    L.push('');
    L.push(`── BURIED (${buries.length}) ───────────────────────────────────────────`);
    for (const r of buries) {
      const it = byId.get(r.id);
      L.push(`[${r.score}] ${it?.title || r.id} — ${r.why}`);
    }
  }

  // Clusters with more than one member (dedupe groups).
  const clusters = new Map<number, RankedItem[]>();
  for (const r of ranked) {
    const arr = clusters.get(r.cluster_id) ?? [];
    arr.push(r);
    clusters.set(r.cluster_id, arr);
  }
  const dupeGroups = [...clusters.values()].filter((g) => g.length > 1);
  if (dupeGroups.length) {
    L.push('');
    L.push('── CLUSTERS (deduped) ───────────────────────────────────────');
    for (const g of dupeGroups) {
      L.push(`c${g[0].cluster_id}: ${g.map((r) => byId.get(r.id)?.title || r.id).join('  |  ')}`);
    }
  }

  L.push('');
  L.push('✅ You\'re caught up.');
  L.push('');
  L.push(renderCost(run.usage, run.model));
  return L.join('\n');
}

function renderCost(u: Anthropic.Messages.Usage, model: string): string {
  const price = PRICING[model] ?? PRICING['claude-sonnet-4-6'];
  const inTok = u.input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const outTok = u.output_tokens ?? 0;
  const cost =
    (inTok * price.in + cacheWrite * price.in * 1.25 + cacheRead * price.in * 0.1 + outTok * price.out) /
    1_000_000;
  return (
    `tokens: in=${inTok} cache_write=${cacheWrite} cache_read=${cacheRead} out=${outTok} · ` +
    `~$${cost.toFixed(4)} (${model})`
  );
}
