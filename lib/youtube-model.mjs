export function videoId(value) {
 if (typeof value !== 'string') return null;
 const s=value.trim(); if (/^[\w-]{11}$/.test(s)) return s;
 try { const u=new URL(s); if(!['http:','https:'].includes(u.protocol))return null;
 const host=u.hostname.toLowerCase();let id=null;
 if(host==='youtu.be')id=u.pathname.split('/')[1];
 if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):['embed','shorts','live'].includes(u.pathname.split('/')[1])?u.pathname.split('/')[2]:null;
 return id&&/^[\w-]{11}$/.test(id)?id:null;
 } catch {return null;}
}
export function nextIndex(length,index,repeat=false,failed=[]) {
 if(!length)return -1;
 for(let step=1;step<=length;step++){let n=index+step;if(n>=length){if(!repeat)return -1;n%=length;}if(!failed.includes(n))return n;}
 return -1;
}
export function cleanTracks(value){return Array.isArray(value)?value.slice(0,200).filter(t=>t&&videoId(t.id)===t.id&&typeof t.title==='string').map(t=>({id:t.id,title:t.title.slice(0,160),key:typeof t.key==='string'?t.key.slice(0,80):crypto.randomUUID()})):[];}
export const featuredVideos={
 lofi:{id:'X4VbdwhkE10',title:'Lofi Girl — lofi hip hop radio'},
 eno:{id:'Rla2CH-1aqI',title:'Brian Eno — Thursday Afternoon'},
 adiemus:{id:'GCsQZSB1gZg',title:'Karl Jenkins — Adiemus'},
};
