import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forYou, similarTo, autoplayNext, search, taste} from '../lib/recommend.mjs';

const t = (id, o = {}) => ({id, title: id, artist: 'x', mood: [], scenes: [], genres: [], energy: 3, vocals: 'none', authors: 3, threads: 2, ...o});
const calm = i => t('calm' + i, {mood: ['calm'], scenes: ['sleep'], genres: ['ambient'], energy: 1});
const loud = i => t('loud' + i, {mood: ['driving'], scenes: ['run'], genres: ['punk'], energy: 5, vocals: 'sung'});
const tracks = [calm(1), calm(2), calm(3), loud(1), loud(2), loud(3)];

test('without history, the most agreed-upon tracks come first', () => {
  const list = [t('a', {authors: 2, threads: 1}), t('b', {authors: 40, threads: 9}), t('c', {authors: 8, threads: 3})];
  assert.deepEqual(forYou(list, []).map(x => x.id), ['b', 'c', 'a']);
});

test('likes pull similar tracks up and already-heard tracks never repeat', () => {
  const events = [{id: 'calm1', kind: 'like'}];
  const ranked = forYou(tracks, events, {limit: 4, explore: 0}).map(x => x.id);
  assert.deepEqual(ranked.slice(0, 2).sort(), ['calm2', 'calm3']);
  assert.ok(!ranked.includes('calm1'));
});

test('skips push a style down', () => {
  const events = [{id: 'calm1', kind: 'like'}, {id: 'loud1', kind: 'skip'}];
  const ranked = forYou(tracks, events, {limit: 4, explore: 0}).map(x => x.id);
  assert.ok(ranked.indexOf('loud2') > ranked.indexOf('calm2'));
});

test('exploration slots add tracks outside the closest matches', () => {
  const events = [{id: 'calm1', kind: 'like'}];
  const ranked = forYou(tracks, events, {limit: 4, explore: .5, random: () => 0}).map(x => x.id);
  assert.equal(ranked.length, 4);
  assert.ok(ranked.some(id => id.startsWith('loud')));
});

test('similarTo and autoplayNext stay in the same neighbourhood and avoid recent tracks', () => {
  assert.ok(similarTo(calm(1), tracks, 2).every(x => x.id.startsWith('calm')));
  assert.equal(autoplayNext(calm(1), tracks, ['calm2']).id, 'calm3');
  assert.equal(autoplayNext(calm(1), [calm(1)], []), null);
});

test('search matches every word across title, tags and why', () => {
  const list = [t('rain', {title: 'Rain Room', why: 'for reading at night'}), t('sun', {title: 'Sun'})];
  assert.deepEqual(search(list, 'reading night').map(x => x.id), ['rain']);
  assert.equal(search(list, '').length, 2);
});

test('unknown ids in history are ignored', () => {
  assert.equal(taste([{id: 'nope', kind: 'like'}], new Map()).size, 0);
});
