export type Source = {sub: string; tid: string; ask: string};
export type Track = {
  id: string; title: string; artist: string; yt: string;
  kind: 'song' | 'album' | 'mix'; len?: string; year?: number;
  why: string; mood: string[]; scenes: string[]; genres: string[]; energy: number; vocals: 'none' | 'sparse' | 'sung'; similar: string[];
  authors: number; threads: number; score: number; subs: string[]; src: Source[];
};
export type QueueItem = {key: string; id: string; yt: string; title: string; artist: string};
export type Taste = {id: string; kind: 'like' | 'play' | 'skip'};

// Closed vocabularies: the catalog build rejects anything outside these so filters never show junk.
export const SCENES = [
  {id: 'focus', label: 'Deep work', icon: '✒'},
  {id: 'read', label: 'Reading', icon: '❦'},
  {id: 'sleep', label: 'Sleep', icon: '☾'},
  {id: 'unwind', label: 'Unwind', icon: '❧'},
  {id: 'rain', label: 'Rainy day', icon: '☂'},
  {id: 'drive', label: 'Night drive', icon: '✦'},
  {id: 'move', label: 'Run & lift', icon: '⚔'},
  {id: 'chores', label: 'Cooking & chores', icon: '♨'},
  {id: 'party', label: 'Merry company', icon: '♜'},
  {id: 'quest', label: 'Quest night', icon: '⚜'},
  {id: 'heartache', label: 'Heartache', icon: '♡'},
] as const;
export const MOODS = ['calm', 'dreamy', 'melancholic', 'warm', 'eerie', 'euphoric', 'driving', 'dark', 'nostalgic', 'hopeful', 'heavy', 'playful', 'epic'] as const;
export const sceneLabel = (id: string) => SCENES.find(s => s.id === id)?.label || id;
export const thumb = (yt: string) => `https://i.ytimg.com/vi/${yt}/mqdefault.jpg`;
export const redditLink = (tid: string) => `https://www.reddit.com/comments/${tid}/`;
