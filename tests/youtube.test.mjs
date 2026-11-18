import {test} from 'node:test';
import assert from 'node:assert/strict';
import {videoId,nextIndex,cleanTracks} from '../lib/youtube-model.mjs';
test('video links accept supported formats and reject lookalike hosts and playlist-only URLs',()=>{
 for(const url of ['https://youtu.be/GCsQZSB1gZg?t=3','https://www.youtube.com/watch?v=GCsQZSB1gZg&list=abc','https://music.youtube.com/watch?v=GCsQZSB1gZg','https://youtube.com/shorts/GCsQZSB1gZg','https://youtube.com/live/GCsQZSB1gZg','GCsQZSB1gZg'])assert.equal(videoId(url),'GCsQZSB1gZg');
 for(const url of ['https://youtube.com.evil.test/watch?v=GCsQZSB1gZg','javascript:alert(1)','https://youtube.com/playlist?list=abc','https://youtube.com/@channel','https://example.com/GCsQZSB1gZg','not a link'])assert.equal(videoId(url),null);
});
test('auto-next follows order, stops at end, wraps on repeat and terminates when every video fails',()=>{
 assert.equal(nextIndex(3,0,false),1);assert.equal(nextIndex(3,2,false),-1);assert.equal(nextIndex(3,2,true),0);
 assert.equal(nextIndex(3,0,false,[1]),2);assert.equal(nextIndex(3,2,true,[0,1,2]),-1);
 assert.equal(nextIndex(1,0,true),0);assert.equal(nextIndex(0,-1,true),-1);
});
test('stored tracks discard malformed data and enforce size limits',()=>{
 assert.deepEqual(cleanTracks(null),[]);assert.deepEqual(cleanTracks([{id:'garbage',title:'x'}]),[]);
 const tracks=cleanTracks(Array.from({length:220},()=>({id:'GCsQZSB1gZg',title:'a'.repeat(200)})));
 assert.equal(tracks.length,200);assert.equal(tracks[0].title.length,160);assert.ok(tracks[0].key);
});
