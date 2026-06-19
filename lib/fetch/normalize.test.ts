import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, detectSourceType, extractUrl, isShortener, findOutboundLink } from './normalize';

test('normalizeUrl strips x.com share params and normalizes the host', () => {
  assert.equal(
    normalizeUrl('https://twitter.com/user/status/123?s=20&t=abc'),
    'https://x.com/user/status/123',
  );
  assert.equal(
    normalizeUrl('https://www.x.com/user/status/123'),
    'https://x.com/user/status/123',
  );
});

test('normalizeUrl keeps youtube v but drops si/t', () => {
  assert.equal(
    normalizeUrl('https://www.youtube.com/watch?v=abc123&si=xyz&t=30'),
    'https://youtube.com/watch?v=abc123',
  );
  assert.equal(normalizeUrl('https://youtu.be/abc123?si=xyz'), 'https://youtu.be/abc123');
});

test('normalizeUrl drops utm params, fragments, and a trailing slash', () => {
  assert.equal(
    normalizeUrl('https://example.com/post/?utm_source=tw&utm_medium=x#section'),
    'https://example.com/post',
  );
});

test('normalizeUrl is dedup-stable across equivalent forms', () => {
  const a = normalizeUrl('https://twitter.com/u/status/1?s=20');
  const b = normalizeUrl('https://x.com/u/status/1');
  assert.equal(a, b);
});

test('normalizeUrl returns input trimmed when unparseable', () => {
  assert.equal(normalizeUrl('  not a url  '), 'not a url');
});

test('detectSourceType maps known hosts', () => {
  assert.equal(detectSourceType('https://x.com/a/status/1'), 'x');
  assert.equal(detectSourceType('https://twitter.com/a/status/1'), 'x');
  assert.equal(detectSourceType('https://youtu.be/abc'), 'youtube');
  assert.equal(detectSourceType('https://www.youtube.com/watch?v=abc'), 'youtube');
  assert.equal(detectSourceType('https://blog.example.com/post'), 'article');
  assert.equal(detectSourceType('https://example.com/paper.pdf'), 'pdf');
  assert.equal(detectSourceType('garbage'), 'other');
});

test('extractUrl pulls the first link out of free text', () => {
  assert.equal(
    extractUrl('check this https://x.com/a/status/1 out'),
    'https://x.com/a/status/1',
  );
  assert.equal(extractUrl('no link here'), null);
});

test('isShortener flags known link wrappers, not real hosts', () => {
  assert.equal(isShortener('https://t.co/Cvv7bYHNuf'), true);
  assert.equal(isShortener('https://bit.ly/abc'), true);
  assert.equal(isShortener('https://example.com/post'), false);
  assert.equal(isShortener('https://x.com/u/status/1'), false);
  assert.equal(isShortener('garbage'), false);
});

test('findOutboundLink recovers the t.co from a link-only tweet capture', () => {
  // Shape of the hollow Jina capture for a link-only tweet (real prod symptom).
  const raw =
    'Title: mem0 on X: "https://t.co/Cvv7bYHNuf" / X\n' +
    'URL Source: https://x.com/i/status/2067305118891163833\n' +
    'Markdown Content:\n# mem0 on X: "https://t.co/Cvv7bYHNuf" / X\nLog inSign up';
  assert.equal(findOutboundLink(raw), 'https://t.co/Cvv7bYHNuf');
});

test('findOutboundLink prefers a non-x link when no shortener is present', () => {
  const raw =
    'URL Source: https://x.com/i/status/1\nMarkdown Content:\nSee https://github.com/foo/bar for the repo.';
  assert.equal(findOutboundLink(raw), 'https://github.com/foo/bar');
});

test('findOutboundLink returns null when the tweet only references X/Jina', () => {
  const raw = 'URL Source: https://x.com/i/status/1\nMarkdown Content:\nA real thought with no links.';
  assert.equal(findOutboundLink(raw), null);
});
