import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, detectSourceType, extractUrl } from './normalize';

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
