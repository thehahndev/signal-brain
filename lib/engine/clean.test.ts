import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clean, isFetchMiss, substanceLength } from './clean';

const JINA_SAMPLE = `Title: Jane Dev on X: "Shipped a new agent harness" / X
URL Source: https://x.com/janedev/status/1
Published Time: Sun, 07 Jun 2026 02:12:25 GMT
Markdown Content:
# Jane Dev on X
Log in
Sign up
![Image 1: avatar](https://example.com/a.jpg)
We shipped a new dynamic-workflow harness for Claude Code today.
It cuts orchestration boilerplate in half.
1.2K
## New to X?
Sign up now
Trending stuff that should be cut.`;

test('clean extracts the X title up to "/ X"', () => {
  const { title } = clean(JINA_SAMPLE, 'x');
  assert.equal(title, 'Jane Dev on X: "Shipped a new agent harness"');
});

test('clean keeps the substance and drops chrome + tail markers', () => {
  const { text } = clean(JINA_SAMPLE, 'x');
  assert.match(text, /dynamic-workflow harness/);
  assert.match(text, /orchestration boilerplate/);
  assert.doesNotMatch(text, /Log in/);
  assert.doesNotMatch(text, /Sign up/);
  assert.doesNotMatch(text, /New to X\?/); // tail marker cut
  assert.doesNotMatch(text, /Trending stuff/); // everything after the tail marker
  assert.doesNotMatch(text, /!\[Image/); // inline image stripped
  assert.doesNotMatch(text, /^1\.2K$/m); // lone engagement count dropped
});

test('isFetchMiss flags short cached-snapshot captures (deleted page)', () => {
  const deleted =
    'Title: X URL Source: https://x.com/i/status/999 Warning: This is a cached snapshot of the original page.';
  assert.equal(isFetchMiss(deleted.length, deleted), true);
});

test('isFetchMiss is false for real content', () => {
  assert.equal(isFetchMiss(JINA_SAMPLE.length, JINA_SAMPLE), false);
});

test('clean drops the run-together Log inSign up wall', () => {
  const linkOnly = `Title: mem0 on X: "https://t.co/Cvv7bYHNuf" / X
URL Source: https://x.com/i/status/2067305118891163833
Markdown Content:
# mem0 on X: "https://t.co/Cvv7bYHNuf" / X
Log inSign up`;
  const { text } = clean(linkOnly, 'x');
  assert.doesNotMatch(text, /Log\s?inSign\s?up/i);
});

// A link-only tweet that points at an X long-form article — the real prod symptom.
// The article title+excerpt live inside the linked-image card; engagement-count rows
// and the login wall are the only other survivors of the old cleaner.
const ARTICLE_LINK_TWEET = `Title: mem0 on X: "https://t.co/Cvv7bYHNuf" / X

URL Source: https://x.com/i/status/2067305118891163833

Markdown Content:
# mem0 on X: "https://t.co/Cvv7bYHNuf" / X

## Post

[Log in](https://x.com/i/jf/onboarding/web?mode=login)[Sign up](https://x.com/i/jf/onboarding/web?mode=signup)

[mem0](https://x.com/mem0ai)

[![Image 2: Article cover image](https://pbs.twimg.com/media/HLCJt_IaAAALY9d.jpg) Article Loop Engineering Works On Memory Peter Steinberger(@steipete), recently tweeted: "You shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents." Boris Cherny, who runs Claude Code at...](https://x.com/i/article/2067284757860519936)

[5:55 PM · Jun 17, 2026](https://x.com/mem0ai/status/2067305118891163833)[51.4K Views](https://x.com/mem0ai/status/2067305118891163833)

1 4 14

5 8 58

Read 14 replies

## New to X?`;

test('clean recovers the embedded X-article card as the body', () => {
  const { text } = clean(ARTICLE_LINK_TWEET, 'x');
  assert.match(text, /Loop Engineering Works On Memory/);
  assert.match(text, /designing loops that prompt your agents/);
  assert.doesNotMatch(text, /1 4 14/); // engagement-count rows dropped
  assert.doesNotMatch(text, /5 8 58/);
  assert.doesNotMatch(text, /Log\s?inSign\s?up/i);
  assert.doesNotMatch(text, /New to X\?/); // tail marker cut
});

test('clean replaces a bare-URL tweet title with the article-card headline', () => {
  const { title } = clean(ARTICLE_LINK_TWEET, 'x');
  // No longer the t.co; leads with the article title. (fetchItem upgrades this to the
  // exact og:description headline; clean()'s job is just to stop showing a bare URL.)
  assert.doesNotMatch(title, /https?:\/\//);
  assert.match(title, /^Loop Engineering Works On Memory/);
  assert.doesNotMatch(title, /recently tweeted/); // sharer lead-in cut
});

test('leadTitle bounds a byline-free prose excerpt instead of running away', () => {
  const longCard =
    'Title: foo on X: "https://t.co/x" / X\n\nMarkdown Content:\n' +
    '[![Image 1: Article cover image](https://img) Article ' +
    'Context Engineering for AI Agents: The Complete Playbook Your AI agent works great for the first 10 steps then degrades, forgetting instructions and making wrong tool calls over and over.' +
    '](https://x.com/i/article/999)';
  const { title } = clean(longCard, 'x');
  assert.ok(title.length <= 102, `title too long: ${title.length}`);
  assert.match(title, /^Context Engineering for AI Agents: The Complete Playbook/);
});

test('clean leaves a non-X-article capture title untouched', () => {
  const { title } = clean(JINA_SAMPLE, 'x');
  assert.equal(title, 'Jane Dev on X: "Shipped a new agent harness"');
});

test('substanceLength ignores URLs + whitespace, exposing hollow captures', () => {
  // A link-only tweet shell nets a couple dozen real chars — below the fetch floor (40).
  const shell = '# mem0 on X: "https://t.co/Cvv7bYHNuf" / X\nLog inSign up';
  assert.ok(substanceLength(shell) < 40, `expected hollow, got ${substanceLength(shell)}`);
  // Even a terse real tweet clears the floor comfortably.
  assert.ok(
    substanceLength('We shipped a new dynamic-workflow harness for Claude Code today.') >= 40,
  );
});
