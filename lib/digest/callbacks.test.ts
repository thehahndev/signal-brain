import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeCallback, decodeCallback } from './callbacks';

test('callback round-trips each kind with a uuid item id', () => {
  const id = '11111111-2222-3333-4444-555555555555';
  for (const kind of ['gold', 'noise', 'brain'] as const) {
    const encoded = encodeCallback(kind, id);
    assert.ok(encoded.length <= 64, 'callback_data must fit Telegram 64-byte cap');
    assert.deepEqual(decodeCallback(encoded), { kind, itemId: id });
  }
});

test('decodeCallback rejects malformed data', () => {
  assert.equal(decodeCallback(undefined), null);
  assert.equal(decodeCallback(''), null);
  assert.equal(decodeCallback('x:abc'), null); // unknown prefix
  assert.equal(decodeCallback('g:'), null); // empty id
});
