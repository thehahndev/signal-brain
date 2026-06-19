import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleDigest } from './assemble';
import type { Item, RankedItem } from '../engine/types';
import type { RankRun } from '../engine/rank';

function item(over: Partial<Item> & { id: string; ref: string }): Item {
  return {
    source_type: 'x',
    url: `https://x.com/i/status/${over.id}`,
    adapter: 'x:jina',
    title: `Title ${over.id}`,
    text: 'body',
    fetch_miss: false,
    ...over,
  };
}

function ranked(over: Partial<RankedItem> & { id: string; verdict: RankedItem['verdict'] }): RankedItem {
  return {
    score: 50,
    signal_or_hype: 'signal',
    opportunity_flag: false,
    cluster_id: 1,
    why: `why ${over.id}`,
    key_claims: [],
    ...over,
  };
}

function run(items: RankedItem[]): RankRun {
  return { result: { items }, usage: {} as RankRun['usage'], model: 'test' };
}

test('SKIM items surface their link under the reasoning (one tap to open)', () => {
  // assemble keys items by `ref`, and the ranker echoes that ref back as `id`.
  const items = [item({ id: 's1', ref: 's1', title: 'A skimmable post', url: 'https://x.com/i/status/s1' })];
  const messages = assembleDigest(run([ranked({ id: 's1', verdict: 'skim' })]), items, new Date('2026-06-19'));

  const skim = messages.find((m) => m.text.startsWith('<b>SKIM</b>'));
  assert.ok(skim, 'expected a SKIM block');
  assert.match(skim!.text, /A skimmable post/);
  assert.match(skim!.text, /<a href="https:\/\/x\.com\/i\/status\/s1">x\.com\/i\/status\/s1<\/a>/);
});

test('READ cards still carry their link (unchanged)', () => {
  const items = [item({ id: 'r1', ref: 'r1', title: 'A must-read', url: 'https://x.com/i/status/r1' })];
  const messages = assembleDigest(run([ranked({ id: 'r1', verdict: 'read', score: 90 })]), items, new Date('2026-06-19'));
  const card = messages.find((m) => m.itemId === 'r1');
  assert.ok(card, 'expected a READ card');
  assert.match(card!.text, /<a href="https:\/\/x\.com\/i\/status\/r1">/);
});
