'use client';
import {useEffect, useMemo, useState} from 'react';
import {buildIndex, answer, type BoardQuestion} from '@/lib/board.mjs';
import {thumb, redditLink, type Track} from '@/lib/catalog-types';
import type {Library} from '@/lib/use-library';
import type {PlayerState} from '@/lib/use-player';

const IDEAS = ['songs for a rainy night drive', 'music to fall asleep to', 'something sad after a breakup', 'pump up songs for the gym', 'happy songs for cooking', 'dnd tavern music'];
type Playable = {id: string; yt: string; title: string; artist: string};

// Describe the evening you want; the tavern answers with what Reddit answered when people asked the same thing.
export default function Board({lib, player}: {lib: Library; player: PlayerState}) {
  const [board, setBoard] = useState<BoardQuestion[]>([]);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [asked, setAsked] = useState('');
  useEffect(() => {
    fetch('/board.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setBoard).catch(() => setFailed(true));
  }, []);
  const index = useMemo(() => buildIndex(board), [board]);
  const result = useMemo(() => (asked && board.length ? answer(index, asked, {limit: 20}) : null), [index, asked, board.length]);
  const songs = useMemo(() => (result?.songs ?? []).flatMap(s => { const t = lib.byId.get(s.id); return t ? [{t, s}] : []; }), [result, lib.byId]);
  const playable = (t: Track): Playable => ({id: t.id, yt: t.yt, title: t.title, artist: t.artist});

  const ask = (q: string) => { const v = q.trim(); if (v) { setText(v); setAsked(v); } };
  // One tap: the whole answer becomes the queue, starting from the best match.
  const playAll = () => {
    if (!songs.length) return;
    player.playList(songs.map(({t}) => playable(t)));
  };

  return <section>
    <div className="banner"><div><span className="eyebrow">THE NOTICE BOARD</span><h1>Pin up a request.</h1>
      <p>Say what kind of evening you want. The tavern finds the questions Redditors asked that sound like yours, and hands you what they answered.</p></div></div>
    <form className="ask" onSubmit={e => { e.preventDefault(); ask(text); }}>
      <label className="search"><span aria-hidden>✎</span><input aria-label="Your request" placeholder="e.g. songs for a rainy night drive…" value={text} maxLength={140} onChange={e => setText(e.target.value)}/></label>
      <button className="big" disabled={!text.trim() || !board.length}>Pin it</button>
    </form>
    <div className="chips" aria-label="Ideas">{IDEAS.map(i => <button key={i} className="chip" onClick={() => ask(i)}>{i}</button>)}</div>
    {failed && <p className="notice" role="alert">The board could not be loaded. Reload to try again.</p>}
    {!failed && !board.length && <p className="notice">Dusting off the board…</p>}

    {result && <div className="answer">
      {!songs.length ? <p className="notice">Nobody on the board asked anything like that. Try fewer words, or name a mood, an activity or a place.</p> : <>
        <div className="answer-head"><div><h2>What the regulars said</h2>
          <p className="fine">{songs.length} songs, pooled from {result.matches.length} {result.matches.length === 1 ? 'question' : 'questions'} on Reddit.</p></div>
          <button className="big" onClick={playAll}>▶ Play all {songs.length}</button></div>
        <ol className="scroll">{songs.map(({t, s}, i) => <li key={t.id}>
          <button className="scroll-play" onClick={() => player.playNow(playable(t))} aria-label={`Play ${t.title} by ${t.artist}`}>
            <span className="n">{i + 1}</span><img loading="lazy" src={thumb(t.yt)} alt=""/>
            <span className="meta"><b>{t.title}</b><small>{t.artist}</small></span></button>
          <span className="proof" title={s.asks.join('\n')}>{s.threads > 1 ? `named in ${s.threads} threads` : 'named in 1 thread'}</span>
          <button className="mini" onClick={() => player.addNext(playable(t))} aria-label={'Play ' + t.title + ' next'}><span className="mini-full">Next</span><span className="mini-short" aria-hidden>⤵</span></button>
          <button className={'mini ' + (lib.liked.has(t.id) ? 'on' : '')} aria-pressed={lib.liked.has(t.id)} aria-label={(lib.liked.has(t.id) ? 'Unlike ' : 'Like ') + t.title} onClick={() => lib.toggleLike(t.id)}>{lib.liked.has(t.id) ? '♥' : '♡'}</button>
        </li>)}</ol>
        <h3>The questions behind it</h3>
        <ul className="threads">{result.matches.map(m => <li key={m.id}><a href={redditLink(m.id)} target="_blank" rel="noreferrer"><b>r/{m.sub}</b> · {m.ask} <em>{m.fit}% match · {m.n} replies ↗</em></a></li>)}</ul>
      </>}
    </div>}
  </section>;
}
