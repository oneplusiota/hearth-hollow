import 'server-only';
// Creator-only lexicon. Never import this module into a Client Component.
// Velin v0.1: subject–object–verb; na is a locative prefix; no tense markers yet.
const lexicon: Record<string,string> = {sela:'night',navo:'rain',ori:'light',vema:'river',luma:'song',ena:'I',suri:'you',mira:'remember',neli:'carry',sova:'listen',tavi:'wait'};
const lines = [
 {words:['ena','navo','sova'],answers:['i listen to rain','i listen to the rain'],clue:'A listener, a sound from the sky, and an act of attention.'},
 {words:['ena','suri','mira'],answers:['i remember you'],clue:'One person holds another in memory.'},
 {words:['vema','luma','neli'],answers:['the river carries the song','river carries song','the river carries a song'],clue:'Something moving through a landscape carries something you can hear.'},
 {words:['sela','ori','neli'],answers:['the night carries the light','night carries light','the night carries light'],clue:'Darkness does not erase what shines.'},
 {words:['suri','navo','sova'],answers:['you listen to rain','you listen to the rain'],clue:'Compare the opening with transmission 01. The listener has changed.'},
 {words:['ena','luma','mira'],answers:['i remember the song','i remember a song','i remember song'],clue:'Compare this with transmission 02. What is remembered has changed.'},
];
export function publicSignal(id:number) {
 const line=lines[id]; if(!line)return null;
 return {id,text:line.words.join(' '),syllables:line.words.flatMap(w=>w.match(/[bcdfghjklmnpqrstvwxyz]?[aeiou]/g)||[]),clue:line.clue};
}
export function checkSignal(id:number,guess:string){const line=lines[id];return !!line&&line.answers.includes(guess.toLowerCase().replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim());}
// Keeps the dictionary explicit and versioned; only canonical answers are served as boolean checks.
void lexicon;
