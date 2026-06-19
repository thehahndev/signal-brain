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

test('substanceLength ignores URLs + whitespace, exposing hollow captures', () => {
  // A link-only tweet shell nets a couple dozen real chars — below the fetch floor (40).
  const shell = '# mem0 on X: "https://t.co/Cvv7bYHNuf" / X\nLog inSign up';
  assert.ok(substanceLength(shell) < 40, `expected hollow, got ${substanceLength(shell)}`);
  // Even a terse real tweet clears the floor comfortably.
  assert.ok(
    substanceLength('We shipped a new dynamic-workflow harness for Claude Code today.') >= 40,
  );
});
