export type RoleName = 'bass' | 'harmony' | 'lead' | 'drums' | 'air';
export type Choice = {id: string; name: string; note?: string};
export type RoleOver = {on?: boolean; inst?: string; style?: string; level?: number};
export type Override = {
  roles: Partial<Record<RoleName, RoleOver>>;
  fate: {pitch?: string; time?: string; dynamics?: string; entropy?: number; density?: number; swing?: number; humanize?: number};
  fx: {echo?: number; lofi?: number; bright?: number; crackle?: number};
  scale?: string; bpm?: number; base?: number; seed?: number;
};
export type Genre = {
  id: string; name: string; icon: string; hue: number; blurb: string; tags: string[]; bpm: number; base: number; scale: string;
  fate: Required<Override['fate']>; fx: Required<Override['fx']>; harm: unknown;
  roles: Record<RoleName, {on: boolean; inst: string; style: string; level: number; pattern?: unknown}>;
};
export type Resolved = {
  bpm: number; base: number; scale: number[]; scaleId: string; harm: unknown; seed: number;
  roles: Record<RoleName, {on: boolean; inst: string; style: string; level: number; pattern?: unknown}>;
  fate: Required<Override['fate']>; fx: Required<Override['fx']>;
};
export const SCALES: Record<string, {name: string; notes: number[]}>;
export const INSTRUMENTS: Record<RoleName, Choice[]>;
export const STYLES: Record<RoleName, Choice[]>;
export const FATES: {pitch: Choice[]; time: Choice[]; dynamics: Choice[]};
export const DEFAULT_FATE: Required<Override['fate']>;
export const GENRES: Genre[];
export const GENRE_IDS: string[];
export function blankOverride(): Override;
export function genreById(id: string): Genre;
export function resolve(genreId: string, over?: Partial<Override>): Resolved;
export function newSeed(): number;
export function encode(genreId: string, over: Override): string;
export function decode(text: string): {genre: string; over: Override} | null;
