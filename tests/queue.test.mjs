import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../lib/queue.mjs';

const t = n => ({id: 't' + n, yt: String(n).padStart(11, 'a'), title: 'Song ' + n, artist: 'Artist'});
const build = (...ns) => ns.reduce((q, n) => Q.enqueue(q, t(n)), Q.emptyQueue());
const ids = q => q.items.map(i => i.id).join(',');

test('enqueue appends and ignores duplicates of the same video', () => {
  const q = Q.enqueue(build(1, 2), t(1));
  assert.equal(ids(q), 't1,t2');
});

test('playNow inserts after the current track and keeps the rest of the queue', () => {
  let q = Q.jump(build(1, 2, 3), 0);
  q = Q.playNow(q, t(9));
  assert.equal(ids(q), 't1,t9,t2,t3');
  assert.equal(q.index, 1);
});

test('playNow on a queued track just jumps to it', () => {
  const q = Q.playNow(build(1, 2, 3), t(3));
  assert.equal(ids(q), 't1,t2,t3');
  assert.equal(q.index, 2);
});

test('playNext slots a track after the current one without changing what is playing', () => {
  const q = Q.playNext(Q.jump(build(1, 2, 3), 0), t(3));
  assert.equal(ids(q), 't1,t3,t2');
  assert.equal(q.index, 0);
});

test('advance follows the order, skips failed videos, stops at the end and wraps on repeat', () => {
  const q = Q.jump(build(1, 2, 3), 0);
  assert.equal(Q.advance(q).index, 1);
  assert.equal(Q.advance(q, {failed: new Set([t(2).yt])}).index, 2);
  assert.equal(Q.advance(Q.jump(q, 2)), null);
  assert.equal(Q.advance(Q.jump(q, 2), {repeat: true}).index, 0);
  assert.equal(Q.advance(q, {failed: new Set([t(2).yt, t(3).yt])}), null);
  assert.equal(Q.advance(Q.jump(build(1), 0), {repeat: true}), null);
});

test('remove keeps the pointer on the same song, or the next one when the current is removed', () => {
  let q = Q.jump(build(1, 2, 3, 4), 2);
  assert.equal(Q.current(Q.remove(q, 0)).id, 't3');
  assert.equal(Q.current(Q.remove(q, 3)).id, 't3');
  assert.equal(Q.current(Q.remove(q, 2)).id, 't4');
  assert.equal(Q.remove(Q.jump(build(1), 0), 0).index, -1);
});

test('move swaps neighbours and the pointer follows the playing song', () => {
  const q = Q.jump(build(1, 2, 3), 1);
  const up = Q.move(q, 1, -1);
  assert.equal(ids(up), 't2,t1,t3');
  assert.equal(Q.current(up).id, 't2');
  assert.equal(Q.move(q, 0, -1), q);
  assert.equal(Q.current(Q.move(q, 2, -1)).id, 't2');
});

test('back never goes below the first track', () => {
  assert.equal(Q.back(Q.jump(build(1, 2), 0)).index, 0);
  assert.equal(Q.back(Q.jump(build(1, 2), 1)).index, 0);
});

test('queue is capped at 200', () => {
  let q = Q.emptyQueue();
  for (let n = 0; n < 230; n++) q = Q.enqueue(q, t(n));
  assert.equal(q.items.length, 200);
});

test('persisted queues drop malformed items and fix the pointer', () => {
  const q = Q.clean({items: [{...t(1), key: 'k'}, {id: 'x', yt: 'bad', title: 'nope'}, null], index: 5});
  assert.equal(q.items.length, 1);
  assert.equal(q.index, -1);
  assert.deepEqual(Q.clean(null), Q.emptyQueue());
});
