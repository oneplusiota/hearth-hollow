import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tokens, buildIndex, matchQuestions, pool, answer} from '../lib/board.mjs';

const board = [
  {id: 'a', sub: 'ambientmusic', ask: "What's your favorite ambient to fall asleep to?", n: 120, tracks: [['eno', 80], ['yokota', 40], ['union', 10]]},
  {id: 'b', sub: 'musicsuggestions', ask: 'Songs that sound like a late night city drive?', n: 90, tracks: [['kavinsky', 50], ['m83', 30]]},
  {id: 'c', sub: 'musicsuggestions', ask: 'Best songs to drive at night to', n: 60, tracks: [['kavinsky', 20], ['chromatics', 15]]},
  {id: 'd', sub: 'musicsuggestions', ask: 'Songs about falling out of love', n: 70, tracks: [['sad', 5]]},
];
const idx = buildIndex(board);

test('tokens drop filler words and fold close variants together', () => {
  assert.deepEqual(tokens('Songs for the driving rain'), tokens('drive rains'));
  assert.ok(!tokens('I want some songs please').length);
  assert.deepEqual(tokens('chill'), tokens('calm'));
});

test('the closest question ranks first and unrelated requests match nothing', () => {
  assert.equal(matchQuestions(idx, 'ambient music to fall asleep')[0].q.id, 'a');
  assert.deepEqual(matchQuestions(idx, 'zzzz qqqq'), []);
  assert.deepEqual(matchQuestions(idx, 'songs please'), []);
});

test('a song named in several matching threads outranks one named once', () => {
  const r = answer(idx, 'night drive songs');
  assert.equal(r.songs[0].id, 'kavinsky');
  assert.equal(r.songs[0].threads, 2);
  assert.ok(r.songs.map(s => s.id).includes('chromatics'));
});

test('answers carry the questions they came from, capped at three per song', () => {
  const r = answer(idx, 'night drive');
  assert.ok(r.songs[0].asks.length >= 1 && r.songs[0].asks.length <= 3);
  assert.ok(r.matches.every(m => m.ask && m.sub && m.fit > 0));
});

test('exclude hides songs already queued and limit is respected', () => {
  const r = answer(idx, 'night drive', {exclude: new Set(['kavinsky']), limit: 2});
  assert.ok(!r.songs.some(s => s.id === 'kavinsky'));
  assert.ok(r.songs.length <= 2);
});

test('pooling an empty match list is empty, not an error', () => {
  assert.deepEqual(pool([]), []);
});
